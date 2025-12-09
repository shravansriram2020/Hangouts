const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.username, u.first_name, u.profile_photo,
       (SELECT COUNT(*) FROM ride_passengers WHERE ride_id = r.id) as passenger_count,
       (SELECT json_agg(json_build_object(
         'id', rp.id,
         'userId', rp.user_id,
         'firstName', pu.first_name,
         'profilePhoto', pu.profile_photo
       )) FROM ride_passengers rp 
        JOIN users pu ON rp.user_id = pu.id 
        WHERE rp.ride_id = r.id) as passengers
       FROM rides r
       JOIN users u ON r.driver_id = u.id
       WHERE r.event_id = $1 AND r.is_cancelled = false
       ORDER BY r.created_at DESC`,
      [req.params.eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get rides error:', error);
    res.status(500).json({ error: 'Failed to get rides' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { eventId, spotsAvailable, pickupLocation, pickupLat, pickupLng, canDriveTo, canDriveFrom } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO rides (event_id, driver_id, spots_available, pickup_location, pickup_lat, pickup_lng, can_drive_to, can_drive_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [eventId, req.user.id, spotsAvailable, pickupLocation, pickupLat, pickupLng, canDriveTo, canDriveFrom]
    );

    const attendees = await pool.query(
      `SELECT user_id FROM event_attendees WHERE event_id = $1 AND user_id != $2`,
      [eventId, req.user.id]
    );

    const userResult = await pool.query(
      'SELECT first_name, username, profile_photo FROM users WHERE id = $1',
      [req.user.id]
    );

    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'ride', 'New Ride Available', $2, $3)`,
        [attendee.user_id, `${userResult.rows[0].first_name} is offering a ride`, eventId]
      );
    }

    // Return complete ride data with driver info
    const completeRide = {
      ...result.rows[0],
      username: userResult.rows[0].username,
      first_name: userResult.rows[0].first_name,
      profile_photo: userResult.rows[0].profile_photo,
      passenger_count: 0,
      passengers: null,
    };

    res.status(201).json(completeRide);
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ error: 'Failed to create ride' });
  }
});

router.post('/:rideId/join', authenticateToken, async (req, res) => {
  try {
    const rideCheck = await pool.query(
      `SELECT r.*, e.id as event_id, 
       (SELECT COUNT(*) FROM ride_passengers WHERE ride_id = r.id) as current_count
       FROM rides r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [req.params.rideId]
    );

    if (rideCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const ride = rideCheck.rows[0];
    if (ride.current_count >= ride.spots_available) {
      return res.status(400).json({ error: 'Ride is full' });
    }

    await pool.query(
      `INSERT INTO ride_passengers (ride_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (ride_id, user_id) DO NOTHING`,
      [req.params.rideId, req.user.id]
    );

    const userResult = await pool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [req.user.id]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id)
       VALUES ($1, 'ride', 'Passenger Joined', $2, $3)`,
      [ride.driver_id, `${userResult.rows[0].first_name} joined your ride`, ride.event_id]
    );

    res.json({ message: 'Joined ride' });
  } catch (error) {
    console.error('Join ride error:', error);
    res.status(500).json({ error: 'Failed to join ride' });
  }
});

router.post('/:rideId/leave', authenticateToken, async (req, res) => {
  try {
    const rideCheck = await pool.query(
      'SELECT r.*, e.id as event_id FROM rides r JOIN events e ON r.event_id = e.id WHERE r.id = $1',
      [req.params.rideId]
    );

    await pool.query(
      'DELETE FROM ride_passengers WHERE ride_id = $1 AND user_id = $2',
      [req.params.rideId, req.user.id]
    );

    if (rideCheck.rows.length > 0) {
      const ride = rideCheck.rows[0];
      const userResult = await pool.query(
        'SELECT first_name FROM users WHERE id = $1',
        [req.user.id]
      );

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'ride', 'Passenger Left', $2, $3)`,
        [ride.driver_id, `${userResult.rows[0].first_name} left your ride`, ride.event_id]
      );
    }

    res.json({ message: 'Left ride' });
  } catch (error) {
    console.error('Leave ride error:', error);
    res.status(500).json({ error: 'Failed to leave ride' });
  }
});

router.delete('/:rideId', authenticateToken, async (req, res) => {
  try {
    const rideCheck = await pool.query(
      'SELECT * FROM rides WHERE id = $1 AND driver_id = $2',
      [req.params.rideId, req.user.id]
    );

    if (rideCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM ride_passengers WHERE ride_id = $1', [req.params.rideId]);
    await pool.query('DELETE FROM rides WHERE id = $1', [req.params.rideId]);

    res.json({ message: 'Ride deleted' });
  } catch (error) {
    console.error('Delete ride error:', error);
    res.status(500).json({ error: 'Failed to delete ride' });
  }
});

module.exports = router;
