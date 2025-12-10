const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/push-token', authenticateToken, async (req, res) => {
  try {
    const { pushToken } = req.body;

    console.log(`[Push Token] Registering token for user ${req.user.id}`);
    console.log(`[Push Token] Token prefix: ${pushToken ? pushToken.substring(0, 30) + '...' : 'null'}`);

    if (!pushToken) {
      console.log('[Push Token] Error: No push token provided');
      return res.status(400).json({ error: 'Push token is required' });
    }

    await pool.query(
      'UPDATE users SET push_token = $1, updated_at = NOW() WHERE id = $2',
      [pushToken, req.user.id]
    );

    console.log(`[Push Token] Successfully registered token for user ${req.user.id}`);
    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('[Push Token] Register push token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

router.delete('/push-token', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET push_token = NULL, updated_at = NOW() WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: 'Push token removed successfully' });
  } catch (error) {
    console.error('Remove push token error:', error);
    res.status(500).json({ error: 'Failed to remove push token' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, e.title as event_title
       FROM notifications n
       LEFT JOIN events e ON n.event_id = e.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.put('/event/:eventId/type/:type/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE event_id = $1 AND user_id = $2 AND type = $3',
      [req.params.eventId, req.user.id, req.params.type]
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark read by type error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.delete('/all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ message: 'All notifications dismissed' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Failed to dismiss notifications' });
  }
});

module.exports = router;
