const https = require('https');
const http2 = require('http2');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const APNS_HOST = 'api.push.apple.com';
const APNS_PORT = 443;
const BUNDLE_ID = 'com.sdj.hangouts';

let cachedJWT = null;
let jwtExpiry = 0;

function formatPrivateKey(key) {
  if (!key) {
    console.error('[APNs] No private key provided');
    return null;
  }
  
  let cleanKey = key
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  let pemType = 'PRIVATE KEY';
  let beginMarker = '-----BEGIN PRIVATE KEY-----';
  let endMarker = '-----END PRIVATE KEY-----';
  
  if (cleanKey.includes('EC PRIVATE KEY')) {
    pemType = 'EC PRIVATE KEY';
    beginMarker = '-----BEGIN EC PRIVATE KEY-----';
    endMarker = '-----END EC PRIVATE KEY-----';
  }
  
  let keyContent = cleanKey;
  
  if (cleanKey.includes(beginMarker)) {
    const afterBegin = cleanKey.split(beginMarker)[1] || '';
    if (afterBegin.includes(endMarker)) {
      keyContent = afterBegin.split(endMarker)[0];
    } else {
      keyContent = afterBegin;
    }
  } else if (cleanKey.includes(endMarker)) {
    keyContent = cleanKey.split(endMarker)[0];
  }
  
  keyContent = keyContent.replace(/[\s\n\r]/g, '');
  
  if (!keyContent || keyContent.length < 50) {
    console.error('[APNs] Key content too short or empty. Length:', keyContent ? keyContent.length : 0);
    console.error('[APNs] Raw key starts with:', key.substring(0, 50));
    return null;
  }
  
  const chunks = keyContent.match(/.{1,64}/g) || [];
  const formattedKey = [beginMarker, ...chunks, endMarker].join('\n');
  
  console.log('[APNs] Key formatted successfully, type:', pemType, 'content length:', keyContent.length);
  
  return formattedKey;
}

function getAPNsJWT() {
  const now = Math.floor(Date.now() / 1000);
  
  if (cachedJWT && jwtExpiry > now + 60) {
    return cachedJWT;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const authKey = process.env.APNS_AUTH_KEY;

  if (!keyId || !teamId || !authKey) {
    console.error('[APNs] Missing credentials');
    return null;
  }

  const privateKey = formatPrivateKey(authKey);
  
  if (!privateKey) {
    console.error('[APNs] Failed to format private key');
    return null;
  }

  try {
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
  } catch (error) {
    console.error('Error signing APNs JWT:', error.message);
    cachedJWT = null;
    jwtExpiry = 0;
    return null;
  }
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

async function getUnreadCount(userId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('[Push] Error getting unread count:', error);
    return 1;
  }
}

async function sendPushNotification(userId, title, body, data = {}) {
  try {
    console.log(`[Push] Attempting to send notification to user ${userId}: "${title}"`);
    
    const userResult = await pool.query(
      'SELECT push_token FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].push_token) {
      console.log(`[Push] No push token for user ${userId}`);
      return false;
    }

    const pushToken = userResult.rows[0].push_token;
    console.log(`[Push] Token found for user ${userId}, token prefix: ${pushToken.substring(0, 20)}...`);
    
    const jwtToken = getAPNsJWT();

    if (!jwtToken) {
      console.error('[Push] Could not generate APNs JWT - check APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY');
      return false;
    }
    
    console.log(`[Push] JWT generated successfully, sending to APNs...`);

    const badgeCount = await getUnreadCount(userId);

    const payload = {
      aps: {
        alert: {
          title: title,
          body: body
        },
        sound: 'default',
        badge: badgeCount + 1
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

async function clearBadge(userId) {
  try {
    console.log(`[Push] Clearing badge for user ${userId}`);
    
    const userResult = await pool.query(
      'SELECT push_token FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].push_token) {
      console.log(`[Push] No push token for user ${userId}, skipping badge clear`);
      return false;
    }

    const pushToken = userResult.rows[0].push_token;
    const jwtToken = getAPNsJWT();

    if (!jwtToken) {
      console.error('[Push] Could not generate APNs JWT for badge clear');
      return false;
    }

    const payload = {
      aps: {
        'content-available': 1,
        badge: 0
      }
    };

    return new Promise((resolve) => {
      const client = http2.connect(`https://${APNS_HOST}:${APNS_PORT}`);

      client.on('error', (err) => {
        console.error('[Push] Badge clear connection error:', err);
        client.close();
        resolve(false);
      });

      const headers = {
        ':method': 'POST',
        ':path': `/3/device/${pushToken}`,
        'authorization': `bearer ${jwtToken}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'background',
        'apns-priority': '5',
        'content-type': 'application/json'
      };

      const req = client.request(headers);

      req.on('response', (headers) => {
        const statusCode = headers[':status'];
        if (statusCode === 200) {
          console.log(`[Push] Badge cleared for user ${userId}`);
          resolve(true);
        } else {
          resolve(false);
        }
      });

      req.on('end', () => {
        client.close();
      });

      req.on('error', (err) => {
        console.error('[Push] Badge clear request error:', err);
        resolve(false);
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  } catch (error) {
    console.error('[Push] Clear badge error:', error);
    return false;
  }
}

module.exports = {
  sendPushNotification,
  sendPushToEventAttendees,
  clearBadge
};
