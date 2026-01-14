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

// Track which chat each user is currently viewing (in-memory for simplicity)
const activeChats = new Map(); // userId -> { eventId, timestamp }

// Clean up stale entries older than 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of activeChats.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) {
      activeChats.delete(userId);
    }
  }
}, 60 * 1000);

// Endpoint to report user is viewing a specific chat
router.post('/active-chat', authenticateToken, async (req, res) => {
  const { eventId } = req.body;
  
  if (eventId) {
    activeChats.set(req.user.id, { eventId, timestamp: Date.now() });
  } else {
    activeChats.delete(req.user.id);
  }
  
  res.json({ success: true });
});

// Check if user is currently viewing a specific chat
function isUserInChat(userId, eventId) {
  const activeChat = activeChats.get(userId);
  if (!activeChat) return false;
  
  // Consider stale if older than 30 seconds
  if (Date.now() - activeChat.timestamp > 30 * 1000) {
    activeChats.delete(userId);
    return false;
  }
  
  return activeChat.eventId === eventId;
}

router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    // Update active chat tracking when user fetches messages
    activeChats.set(req.user.id, { eventId: req.params.eventId, timestamp: Date.now() });
    
    const result = await pool.query(
      `SELECT 
        m.*, 
        m.edited_at,
        u.first_name, 
        u.profile_photo,
        UPPER(LEFT(u.first_name, 1)) as user_initial,
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
      `SELECT m.*, u.first_name, u.profile_photo,
              UPPER(LEFT(u.first_name, 1)) as user_initial,
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
      // Always create the in-app notification
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'message', 'New Message', $2, $3)`,
        [attendee.user_id, `${userResult.rows[0].first_name}: ${previewContent}`, eventId]
      );
      
      // Only send push notification if user is NOT currently viewing this chat
      if (!isUserInChat(attendee.user_id, eventId)) {
        sendPushNotification(
          attendee.user_id,
          'New Message',
          `${userResult.rows[0].first_name}: ${previewContent}`,
          { type: 'message', eventId }
        ).catch(console.error);
      } else {
        console.log(`[Push] Skipping push for user ${attendee.user_id} - currently viewing chat ${eventId}`);
      }
    }

    res.status(201).json(messageWithUser.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Edit a message (only by the message owner)
router.put('/:messageId', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  try {
    // Verify the user owns this message
    const messageCheck = await pool.query(
      'SELECT user_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (messageCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Re-detect suggestions in the updated content
    const { hasTimeSuggestion, hasLocationSuggestion } = detectSuggestion(content.trim());

    // Update the message
    const result = await pool.query(
      `UPDATE messages 
       SET content = $1, edited_at = NOW(), has_time_suggestion = $2, has_location_suggestion = $3
       WHERE id = $4
       RETURNING *`,
      [content.trim(), hasTimeSuggestion, hasLocationSuggestion, messageId]
    );

    // Fetch the updated message with user info
    const messageWithUser = await pool.query(
      `SELECT m.*, m.edited_at, u.first_name, u.profile_photo,
              UPPER(LEFT(u.first_name, 1)) as user_initial,
              reply.content as reply_to_content,
              reply_user.first_name as reply_to_user
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN messages reply ON m.reply_to_id = reply.id
       LEFT JOIN users reply_user ON reply.user_id = reply_user.id
       WHERE m.id = $1`,
      [messageId]
    );

    res.json(messageWithUser.rows[0]);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

module.exports = router;
