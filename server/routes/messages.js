const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendPushNotification } = require('../services/pushNotifications');

const router = express.Router();

const TIME_KEYWORDS = ['change the time', 'different time', 'new time', 'move the time', "let's change the time", 'reschedule', 'postpone', 'earlier', 'later'];
const LOCATION_KEYWORDS = ['change the location', 'different place', 'new location', 'move the location', "let's change the location", 'different location'];

const detectSuggestion = (content) => {
  const lowerContent = content.toLowerCase();
  const hasTimeSuggestion = TIME_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  const hasLocationSuggestion = LOCATION_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  return { hasTimeSuggestion, hasLocationSuggestion };
};

router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        m.*, 
        u.first_name, 
        u.profile_photo,
        reply.content as reply_to_content,
        reply_user.first_name as reply_to_user
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN messages reply ON m.reply_to_id = reply.id
       LEFT JOIN users reply_user ON reply.user_id = reply_user.id
       WHERE m.event_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { eventId, content, replyToId } = req.body;

  try {
    const { hasTimeSuggestion, hasLocationSuggestion } = detectSuggestion(content);

    const result = await pool.query(
      `INSERT INTO messages (event_id, user_id, content, reply_to_id, has_time_suggestion, has_location_suggestion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, req.user.id, content, replyToId, hasTimeSuggestion, hasLocationSuggestion]
    );

    const messageWithUser = await pool.query(
      `SELECT m.*, u.first_name as user_name, u.profile_photo as user_profile_image,
              reply.content as reply_to_content,
              reply_user.first_name as reply_to_user
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN messages reply ON m.reply_to_id = reply.id
       LEFT JOIN users reply_user ON reply.user_id = reply_user.id
       WHERE m.id = $1`,
      [result.rows[0].id]
    );

    // Notify other attendees about the new message
    const userResult = await pool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [eventId]
    );
    const attendees = await pool.query(
      'SELECT user_id FROM event_attendees WHERE event_id = $1 AND user_id != $2',
      [eventId, req.user.id]
    );

    // Truncate long messages for notification
    const previewContent = content.length > 50 ? content.substring(0, 47) + '...' : content;
    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'message', 'New Message', $2, $3)`,
        [attendee.user_id, `${userResult.rows[0].first_name}: ${previewContent}`, eventId]
      );
      sendPushNotification(
        attendee.user_id,
        'New Message',
        `${userResult.rows[0].first_name}: ${previewContent}`,
        { type: 'message', eventId }
      ).catch(console.error);
    }

    res.status(201).json(messageWithUser.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
