const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ep.*, ep.uploader_id as user_id, u.first_name, u.profile_photo
       FROM event_photos ep
       JOIN users u ON ep.uploader_id = u.id
       WHERE ep.event_id = $1
       ORDER BY ep.created_at DESC`,
      [req.params.eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { eventId, photoUrl } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO event_photos (event_id, uploader_id, photo_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [eventId, req.user.id, photoUrl]
    );

    const photoWithUser = await pool.query(
      `SELECT ep.*, u.first_name, u.profile_photo
       FROM event_photos ep
       JOIN users u ON ep.uploader_id = u.id
       WHERE ep.id = $1`,
      [result.rows[0].id]
    );

    // Notify other attendees about the new photo
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

    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'photo', 'New Photo Added', $2, $3)`,
        [attendee.user_id, `${userResult.rows[0].first_name} added a photo to ${eventResult.rows[0].title}`, eventId]
      );
    }

    res.status(201).json(photoWithUser.rows[0]);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM event_photos WHERE id = $1 AND uploader_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
