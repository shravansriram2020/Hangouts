const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mr.*, 
       ru.first_name as requester_first_name, ru.profile_photo as requester_photo,
       ou.first_name as ower_first_name, ou.profile_photo as ower_photo
       FROM money_requests mr
       JOIN users ru ON mr.requester_id = ru.id
       JOIN users ou ON mr.ower_id = ou.id
       WHERE mr.event_id = $1 AND mr.is_cleared = false
       ORDER BY mr.created_at DESC`,
      [req.params.eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get money requests error:', error);
    res.status(500).json({ error: 'Failed to get money requests' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { eventId, owerId, amount, description } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO money_requests (event_id, requester_id, ower_id, amount, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [eventId, req.user.id, owerId, amount, description]
    );

    const userResult = await pool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [req.user.id]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id)
       VALUES ($1, 'money', 'Money Request', $2, $3)`,
      [owerId, `${userResult.rows[0].first_name} requested $${amount}`, eventId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create money request error:', error);
    res.status(500).json({ error: 'Failed to create money request' });
  }
});

router.put('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT * FROM money_requests WHERE id = $1 AND ower_id = $2',
      [req.params.id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      'UPDATE money_requests SET is_paid = true WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Marked as paid' });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

router.put('/:id/clear', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT * FROM money_requests WHERE id = $1 AND requester_id = $2 AND is_paid = true',
      [req.params.id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or not yet paid' });
    }

    await pool.query(
      'UPDATE money_requests SET is_cleared = true WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Request cleared' });
  } catch (error) {
    console.error('Clear request error:', error);
    res.status(500).json({ error: 'Failed to clear request' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM money_requests WHERE id = $1 AND requester_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Request deleted' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

module.exports = router;
