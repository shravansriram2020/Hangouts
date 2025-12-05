const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  const { 
    title, description, eventImage, eventDate, eventTime, 
    locationName, locationAddress, locationLat, locationLng,
    gradientColor1, gradientColor2, notes, invitedUsers 
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO events (
        host_id, title, description, event_image, event_date, event_time,
        location_name, location_address, location_lat, location_lng,
        gradient_color1, gradient_color2, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [req.user.id, title, description, eventImage, eventDate, eventTime,
       locationName, locationAddress, locationLat, locationLng,
       gradientColor1, gradientColor2, notes]
    );

    const event = result.rows[0];

    await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, status)
       VALUES ($1, $2, 'accepted')`,
      [event.id, req.user.id]
    );

    // If notes were provided during event creation, add them as a sticky note
    if (notes && notes.trim()) {
      await pool.query(
        `INSERT INTO event_notes (event_id, user_id, content)
         VALUES ($1, $2, $3)`,
        [event.id, req.user.id, notes.trim()]
      );
    }

    if (invitedUsers && invitedUsers.length > 0) {
      for (const userId of invitedUsers) {
        await pool.query(
          `INSERT INTO event_attendees (event_id, user_id, status)
           VALUES ($1, $2, 'invited')
           ON CONFLICT (event_id, user_id) DO NOTHING`,
          [event.id, userId]
        );

        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, event_id)
           VALUES ($1, 'invite', 'Hangout Invitation', $2, $3)`,
          [userId, `You've been invited to ${title}`, event.id]
        );
      }
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.username as host_username, u.first_name as host_first_name, u.profile_photo as host_photo,
       (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id AND status = 'accepted') as attendee_count,
       (SELECT COUNT(*) FROM event_photos WHERE event_id = e.id) as photo_count,
       ea.status as user_status
       FROM events e
       JOIN users u ON e.host_id = u.id
       JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = $1
       WHERE e.is_archived = false
       AND (e.event_date + e.event_time) > NOW()
       ORDER BY e.event_date, e.event_time`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

router.get('/archived', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM events 
       WHERE (is_archived = true OR (event_date + event_time) <= NOW())
       AND event_date < NOW() - INTERVAL '30 days'`
    );

    const result = await pool.query(
      `SELECT e.*, u.username as host_username, u.first_name as host_first_name, u.profile_photo as host_photo,
       (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id AND status = 'accepted') as attendee_count,
       (SELECT COUNT(*) FROM event_photos WHERE event_id = e.id AND expires_at > NOW()) as photo_count
       FROM events e
       JOIN users u ON e.host_id = u.id
       JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = $1
       WHERE e.is_archived = true OR (e.event_date + e.event_time) <= NOW()
       ORDER BY e.event_date DESC, e.event_time DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get archived events error:', error);
    res.status(500).json({ error: 'Failed to get archived events' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const eventResult = await pool.query(
      `SELECT e.*, u.username as host_username, u.first_name as host_first_name, 
       u.last_name as host_last_name, u.profile_photo as host_photo
       FROM events e
       JOIN users u ON e.host_id = u.id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    const attendeesResult = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.profile_photo,
       ea.status, ea.is_on_my_way, ea.location_sharing, ea.current_lat, ea.current_lng
       FROM event_attendees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1 AND ea.status = 'accepted'`,
      [req.params.id]
    );

    const notesResult = await pool.query(
      `SELECT en.*, u.first_name, u.profile_photo
       FROM event_notes en
       JOIN users u ON en.user_id = u.id
       WHERE en.event_id = $1
       ORDER BY en.created_at DESC`,
      [req.params.id]
    );

    res.json({
      ...event,
      attendees: attendeesResult.rows,
      notes: notesResult.rows,
      isHost: event.host_id === req.user.id
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { title, eventDate, eventTime, locationName, locationAddress, locationLat, locationLng, gradientColor1, gradientColor2 } = req.body;

  try {
    const eventCheck = await pool.query(
      'SELECT host_id FROM events WHERE id = $1',
      [req.params.id]
    );

    if (eventCheck.rows.length === 0 || eventCheck.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE events SET 
        title = COALESCE($1, title),
        event_date = COALESCE($2, event_date),
        event_time = COALESCE($3, event_time),
        location_name = COALESCE($4, location_name),
        location_address = COALESCE($5, location_address),
        location_lat = COALESCE($6, location_lat),
        location_lng = COALESCE($7, location_lng),
        gradient_color1 = COALESCE($8, gradient_color1),
        gradient_color2 = COALESCE($9, gradient_color2),
        updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [title, eventDate, eventTime, locationName, locationAddress, locationLat, locationLng, gradientColor1, gradientColor2, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const eventCheck = await pool.query(
      'SELECT host_id FROM events WHERE id = $1',
      [req.params.id]
    );

    if (eventCheck.rows.length === 0 || eventCheck.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE event_attendees SET status = 'accepted' 
       WHERE event_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Joined event' });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

router.post('/:id/archive', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE events SET is_archived = true WHERE id = $1 AND host_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Event archived' });
  } catch (error) {
    console.error('Archive event error:', error);
    res.status(500).json({ error: 'Failed to archive event' });
  }
});

router.delete('/:id/permanent', authenticateToken, async (req, res) => {
  try {
    const eventCheck = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND is_archived = true',
      [req.params.id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Archived event not found' });
    }

    await pool.query(
      'DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    res.json({ message: 'Event removed from your archived list' });
  } catch (error) {
    console.error('Remove archived event error:', error);
    res.status(500).json({ error: 'Failed to remove event from archived list' });
  }
});

router.post('/:id/invite', authenticateToken, async (req, res) => {
  const { userId } = req.body;

  try {
    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [req.params.id]
    );

    await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, status)
       VALUES ($1, $2, 'invited')
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [req.params.id, userId]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id)
       VALUES ($1, 'invite', 'Hangout Invitation', $2, $3)`,
      [userId, `You've been invited to ${eventResult.rows[0].title}`, req.params.id]
    );

    res.json({ message: 'Invitation sent' });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

router.post('/:id/notes', authenticateToken, async (req, res) => {
  const { content } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO event_notes (event_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, req.user.id, content]
    );

    const noteWithUser = await pool.query(
      `SELECT en.*, u.first_name, u.profile_photo
       FROM event_notes en
       JOIN users u ON en.user_id = u.id
       WHERE en.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(noteWithUser.rows[0]);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

router.delete('/:eventId/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM event_notes WHERE id = $1 AND user_id = $2',
      [req.params.noteId, req.user.id]
    );
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

router.post('/:id/rsvp', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['going', 'maybe', 'not_going'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // Get user and event info for notification
    const userResult = await pool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [req.params.id]
    );

    if (status === 'not_going') {
      await pool.query(
        'DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      return res.json({ message: 'Removed from event', removed: true });
    }

    const dbStatus = status === 'going' ? 'accepted' : 'maybe';
    
    await pool.query(
      `UPDATE event_attendees SET status = $1 
       WHERE event_id = $2 AND user_id = $3`,
      [dbStatus, req.params.id, req.user.id]
    );

    // Notify other attendees about the RSVP
    const attendees = await pool.query(
      'SELECT user_id FROM event_attendees WHERE event_id = $1 AND user_id != $2',
      [req.params.id, req.user.id]
    );

    const statusText = status === 'going' ? 'is going' : 'might be going';
    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'rsvp', 'RSVP Update', $2, $3)`,
        [attendee.user_id, `${userResult.rows[0].first_name} ${statusText} to ${eventResult.rows[0].title}`, req.params.id]
      );
    }
    
    res.json({ message: 'RSVP updated', status: dbStatus });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

router.get('/:id/user-status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ status: null });
    }
    
    res.json({ status: result.rows[0].status });
  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
