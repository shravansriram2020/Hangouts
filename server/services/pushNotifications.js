const https = require('https');
const http2 = require('http2');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const APNS_HOST = 'api.push.apple.com';
const APNS_PORT = 443;
const BUNDLE_ID = 'com.sdj.hangouts';

let cachedJWT = null;
let jwtExpiry = 0;

function getAPNsJWT() {
  const now = Math.floor(Date.now() / 1000);
  
  if (cachedJWT && jwtExpiry > now + 60) {
    return cachedJWT;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const authKey = process.env.APNS_AUTH_KEY;

  if (!keyId || !teamId || !authKey) {
    console.error('Missing APNs credentials');
    return null;
  }

  const privateKey = authKey.replace(/\\n/g, '\n');

  jwtExpiry = now + 3600;
  cachedJWT = jwt.sign(
    {
      iss: teamId,
      iat: now
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId
      }
    }
  );

  return cachedJWT;
}

const INVALID_TOKEN_REASONS = [
  'BadDeviceToken',
  'DeviceTokenNotForTopic', 
  'Unregistered',
  'ExpiredToken'
];

async function handleInvalidToken(userId) {
  try {
    await pool.query(
      'UPDATE users SET push_token = NULL WHERE id = $1',
      [userId]
    );
    console.log(`Removed invalid push token for user ${userId}`);
  } catch (error) {
    console.error('Error removing invalid token:', error);
  }
}

async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const userResult = await pool.query(
      'SELECT push_token FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].push_token) {
      console.log(`No push token for user ${userId}`);
      return false;
    }

    const pushToken = userResult.rows[0].push_token;
    const jwtToken = getAPNsJWT();

    if (!jwtToken) {
      console.error('Could not generate APNs JWT');
      return false;
    }

    const payload = {
      aps: {
        alert: {
          title: title,
          body: body
        },
        sound: 'default',
        badge: 1
      },
      data: data
    };

    return new Promise((resolve) => {
      const client = http2.connect(`https://${APNS_HOST}:${APNS_PORT}`);

      client.on('error', (err) => {
        console.error('APNs connection error:', err);
        client.close();
        resolve(false);
      });

      const headers = {
        ':method': 'POST',
        ':path': `/3/device/${pushToken}`,
        'authorization': `bearer ${jwtToken}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json'
      };

      const req = client.request(headers);
      let responseBody = '';
      let statusCode = 0;

      req.on('response', (headers) => {
        statusCode = headers[':status'];
        if (statusCode === 200) {
          console.log(`Push notification sent successfully to user ${userId}`);
          resolve(true);
        }
      });

      req.on('data', (chunk) => {
        responseBody += chunk;
      });

      req.on('end', () => {
        if (statusCode !== 200) {
          let errorReason = null;
          
          if (responseBody) {
            try {
              const errorDetails = JSON.parse(responseBody);
              errorReason = errorDetails.reason;
              console.error(`APNs error (${statusCode}):`, errorDetails);
            } catch (e) {
              console.error('APNs response:', responseBody);
            }
          }

          if (statusCode === 410 || (statusCode === 400 && INVALID_TOKEN_REASONS.includes(errorReason))) {
            console.log(`Removing invalid token for user ${userId}, reason: ${errorReason}`);
            handleInvalidToken(userId).catch(err => 
              console.error('Failed to remove invalid token:', err)
            );
          } else if (statusCode === 403) {
            console.error('APNs authentication error - check credentials');
          } else if (statusCode === 429) {
            console.error('APNs rate limited - too many requests');
          }
          
          resolve(false);
        }
        client.close();
      });

      req.on('error', (err) => {
        console.error('APNs request error:', err);
        resolve(false);
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  } catch (error) {
    console.error('Send push notification error:', error);
    return false;
  }
}

async function sendPushToEventAttendees(eventId, excludeUserId, title, body, data = {}) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.push_token 
       FROM event_attendees ea 
       JOIN users u ON ea.user_id = u.id 
       WHERE ea.event_id = $1 AND u.id != $2 AND u.push_token IS NOT NULL`,
      [eventId, excludeUserId]
    );

    const promises = result.rows.map(user => 
      sendPushNotification(user.id, title, body, data)
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Send push to attendees error:', error);
    return false;
  }
}

module.exports = {
  sendPushNotification,
  sendPushToEventAttendees
};
