const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendPushNotification } = require('../services/pushNotifications');

const router = express.Router();

router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const attendeeCheck = await pool.query(
      `SELECT status FROM event_attendees 
       WHERE event_id = $1 AND user_id = $2 AND status IN ('accepted', 'maybe')`,
      [req.params.eventId, req.user.id]
    );

    if (attendeeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You must RSVP to the event to view conflicts' });
    }

    const result = await pool.query(
      `SELECT c.*, u.first_name, u.profile_photo,
       (SELECT json_agg(json_build_object(
         'id', cv.id,
         'userId', cv.user_id,
         'vote', cv.vote,
         'firstName', vu.first_name
       )) FROM conflict_votes cv 
        JOIN users vu ON cv.user_id = vu.id 
        WHERE cv.conflict_id = c.id) as votes
       FROM conflicts c
       JOIN users u ON c.reporter_id = u.id
       WHERE c.event_id = $1 AND c.is_resolved = false
       ORDER BY c.created_at DESC`,
      [req.params.eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get conflicts error:', error);
    res.status(500).json({ error: 'Failed to get conflicts' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { eventId, conflictType, reason, suggestedTime, suggestedLocation, suggestedLat, suggestedLng } = req.body;

  try {
    // Validate that suggested time is not in the past
    if (conflictType === 'time' && suggestedTime) {
      // Parse the string directly to avoid UTC interpretation
      const match = suggestedTime.match(/(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hours, minutes] = match;
        const suggestedDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();
        if (suggestedDate < now) {
          return res.status(400).json({ error: 'Cannot schedule a conflict for a time in the past' });
        }
      }
    }

    const attendeeCheck = await pool.query(
      `SELECT status FROM event_attendees 
       WHERE event_id = $1 AND user_id = $2 AND status IN ('accepted', 'maybe')`,
      [eventId, req.user.id]
    );

    if (attendeeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You must RSVP to the event to report a conflict' });
    }

    const result = await pool.query(
      `INSERT INTO conflicts (event_id, reporter_id, conflict_type, reason, suggested_time, suggested_location, suggested_lat, suggested_lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [eventId, req.user.id, conflictType, reason, suggestedTime, suggestedLocation, suggestedLat, suggestedLng]
    );

    const attendees = await pool.query(
      'SELECT user_id FROM event_attendees WHERE event_id = $1 AND user_id != $2',
      [eventId, req.user.id]
    );

    const userResult = await pool.query(
      'SELECT first_name, profile_photo FROM users WHERE id = $1',
      [req.user.id]
    );

    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [eventId]
    );

    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'conflict', 'New Conflict Reported', $2, $3)`,
        [attendee.user_id, `${userResult.rows[0].first_name} reported a ${conflictType} conflict for ${eventResult.rows[0].title}`, eventId]
      );
      sendPushNotification(
        attendee.user_id,
        'New Conflict Reported',
        `${userResult.rows[0].first_name} reported a ${conflictType} conflict for ${eventResult.rows[0].title}`,
        { type: 'conflict', eventId }
      ).catch(console.error);
    }

    // Return complete conflict data with user info
    const completeConflict = {
      ...result.rows[0],
      first_name: userResult.rows[0].first_name,
      profile_photo: userResult.rows[0].profile_photo,
      votes: null,
    };

    res.status(201).json(completeConflict);
  } catch (error) {
    console.error('Create conflict error:', error);
    res.status(500).json({ error: 'Failed to create conflict' });
  }
});

router.post('/:id/vote', authenticateToken, async (req, res) => {
  const { vote } = req.body;

  try {
    const conflictCheck = await pool.query(
      'SELECT event_id FROM conflicts WHERE id = $1',
      [req.params.id]
    );

    if (conflictCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conflict not found' });
    }

    const eventId = conflictCheck.rows[0].event_id;

    const attendeeCheck = await pool.query(
      `SELECT status FROM event_attendees 
       WHERE event_id = $1 AND user_id = $2 AND status IN ('accepted', 'maybe')`,
      [eventId, req.user.id]
    );

    if (attendeeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You must RSVP to the event to vote on conflicts' });
    }

    await pool.query(
      `INSERT INTO conflict_votes (conflict_id, user_id, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (conflict_id, user_id) DO UPDATE SET vote = $3`,
      [req.params.id, req.user.id, vote]
    );

    // Mark conflict notifications for this event as read for the voting user
    await pool.query(
      `UPDATE notifications SET is_read = true 
       WHERE user_id = $1 AND event_id = $2 AND type = 'conflict' AND is_read = false`,
      [req.user.id, eventId]
    );

    res.json({ message: 'Vote recorded' });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const conflictCheck = await pool.query(
      'SELECT * FROM conflicts WHERE id = $1',
      [req.params.id]
    );

    if (conflictCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conflict not found' });
    }

    const conflict = conflictCheck.rows[0];

    // Only the creator can delete their own conflict
    if (conflict.reporter_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete conflicts you created' });
    }

    // Delete related votes first
    await pool.query('DELETE FROM conflict_votes WHERE conflict_id = $1', [req.params.id]);
    
    // Delete the conflict
    await pool.query('DELETE FROM conflicts WHERE id = $1', [req.params.id]);

    res.json({ message: 'Conflict deleted' });
  } catch (error) {
    console.error('Delete conflict error:', error);
    res.status(500).json({ error: 'Failed to delete conflict' });
  }
});

router.put('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const conflictCheck = await pool.query(
      `SELECT c.*, e.host_id, e.notes FROM conflicts c
       JOIN events e ON c.event_id = e.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (conflictCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conflict not found' });
    }

    const conflict = conflictCheck.rows[0];

    if (conflict.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can resolve conflicts' });
    }

    // Update event based on conflict type
    if (conflict.conflict_type === 'time' && conflict.suggested_time) {
      // Parse the timestamp string directly to avoid timezone conversion
      // The timestamp is stored as-is (user's local time) without timezone info
      const timeStr = conflict.suggested_time.toString();
      const match = timeStr.match(/(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})/);
      
      let eventDate, eventTime;
      if (match) {
        const [, year, month, day, hours, minutes] = match;
        eventDate = `${year}-${month}-${day}`;
        eventTime = `${hours}:${minutes}`;
      } else {
        // Fallback for unexpected format
        const suggestedDate = new Date(conflict.suggested_time);
        eventDate = `${suggestedDate.getFullYear()}-${String(suggestedDate.getMonth() + 1).padStart(2, '0')}-${String(suggestedDate.getDate()).padStart(2, '0')}`;
        eventTime = `${String(suggestedDate.getHours()).padStart(2, '0')}:${String(suggestedDate.getMinutes()).padStart(2, '0')}`;
      }
      
      await pool.query(
        'UPDATE events SET event_date = $1, event_time = $2, updated_at = NOW() WHERE id = $3',
        [eventDate, eventTime, conflict.event_id]
      );
    } else if (conflict.conflict_type === 'location' && conflict.suggested_location) {
      // Update event location - use location_name and location_address columns
      if (conflict.suggested_lat != null && conflict.suggested_lng != null) {
        await pool.query(
          'UPDATE events SET location_address = $1, location_lat = $2, location_lng = $3, updated_at = NOW() WHERE id = $4',
          [conflict.suggested_location, conflict.suggested_lat, conflict.suggested_lng, conflict.event_id]
        );
      } else {
        // Only update location address if coordinates are missing
        await pool.query(
          'UPDATE events SET location_address = $1, updated_at = NOW() WHERE id = $2',
          [conflict.suggested_location, conflict.event_id]
        );
      }
    } else if (conflict.conflict_type === 'other' && conflict.reason) {
      // Add the conflict reason as a sticky note to the event
      await pool.query(
        'INSERT INTO event_notes (event_id, user_id, content) VALUES ($1, $2, $3)',
        [conflict.event_id, conflict.reporter_id, conflict.reason]
      );
    }

    // Mark conflict as resolved
    await pool.query(
      'UPDATE conflicts SET is_resolved = true WHERE id = $1',
      [req.params.id]
    );

    // Notify all attendees about the conflict resolution
    const attendees = await pool.query(
      'SELECT user_id FROM event_attendees WHERE event_id = $1',
      [conflict.event_id]
    );
    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [conflict.event_id]
    );

    let resolutionMessage = '';
    if (conflict.conflict_type === 'time' && conflict.suggested_time) {
      // Parse the timestamp string directly to avoid timezone conversion
      const timeStr = conflict.suggested_time.toString();
      const match = timeStr.match(/(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})/);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let monthName, day, hourNum, minute;
      
      if (match) {
        const [, , monthStr, dayStr, hoursStr, minutesStr] = match;
        monthName = monthNames[parseInt(monthStr) - 1];
        day = parseInt(dayStr);
        hourNum = parseInt(hoursStr);
        minute = minutesStr;
      } else {
        // Fallback for unexpected format
        const suggestedDate = new Date(conflict.suggested_time);
        monthName = monthNames[suggestedDate.getMonth()];
        day = suggestedDate.getDate();
        hourNum = suggestedDate.getHours();
        minute = String(suggestedDate.getMinutes()).padStart(2, '0');
      }
      
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const hour12 = hourNum % 12 || 12;
      resolutionMessage = `Time changed to ${monthName} ${day} at ${hour12}:${minute} ${ampm}`;
    } else if (conflict.conflict_type === 'location' && conflict.suggested_location) {
      resolutionMessage = `Location changed to ${conflict.suggested_location}`;
    } else if (conflict.conflict_type === 'other') {
      resolutionMessage = `A concern was addressed for ${eventResult.rows[0].title}`;
    }

    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'conflict', 'Conflict Resolved', $2, $3)`,
        [attendee.user_id, resolutionMessage, conflict.event_id]
      );
      sendPushNotification(
        attendee.user_id,
        'Conflict Resolved',
        resolutionMessage,
        { type: 'conflict', eventId: conflict.event_id }
      ).catch(console.error);
    }

    res.json({ message: 'Conflict resolved', conflictType: conflict.conflict_type });
  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({ error: 'Failed to resolve conflict' });
  }
});

module.exports = router;
