const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

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
      `SELECT m.*, u.first_name as user_name, u.profile_photo as user_profile_image
       FROM messages m
       JOIN users u ON m.user_id = u.id
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
      `SELECT m.*, u.first_name as user_name, u.profile_photo as user_profile_image
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(messageWithUser.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
