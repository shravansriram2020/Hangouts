const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

router.get('/search', authenticateToken, async (req, res) => {
  const { query, lat, lng, radius = 10, category } = req.query;

  try {
    let url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&limit=10`;
    
    if (lat && lng) {
      url += `&lat=${lat}&lon=${lng}&radius=${radius * 1609}`; // Convert miles to meters
    }

    if (category) {
      url += `&categorySet=${category}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    const results = data.results?.map(result => ({
      id: result.id,
      name: result.poi?.name || result.address?.freeformAddress,
      address: result.address?.freeformAddress,
      lat: result.position?.lat,
      lng: result.position?.lon,
      distance: result.dist,
      category: result.poi?.categories?.[0]
    })) || [];

    res.json(results);
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ error: 'Failed to search locations' });
  }
});

router.get('/suggest', authenticateToken, async (req, res) => {
  const { title, lat, lng, radius = 5 } = req.query;

  try {
    const categories = '7315,7374,7376,9361,9362,9376,9377,9378,9379,9380,9381,9382,9902';
    
    let url = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(title || 'fun')}.json?key=${TOMTOM_API_KEY}&limit=10&categorySet=${categories}`;
    
    if (lat && lng) {
      url += `&lat=${lat}&lon=${lng}&radius=${radius * 1609}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    const results = data.results?.map(result => ({
      id: result.id,
      name: result.poi?.name || result.address?.freeformAddress,
      address: result.address?.freeformAddress,
      lat: result.position?.lat,
      lng: result.position?.lon,
      distance: result.dist,
      category: result.poi?.categories?.[0]
    })) || [];

    res.json(results);
  } catch (error) {
    console.error('Location suggest error:', error);
    res.status(500).json({ error: 'Failed to suggest locations' });
  }
});

router.get('/route', authenticateToken, async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;

  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json?key=${TOMTOM_API_KEY}&traffic=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      res.json({
        distance: (leg.summary.lengthInMeters / 1609.34).toFixed(1),
        duration: Math.round(leg.summary.travelTimeInSeconds / 60),
        points: leg.points
      });
    } else {
      res.json({ distance: null, duration: null, points: [] });
    }
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

router.put('/update', authenticateToken, async (req, res) => {
  const { eventId, lat, lng, isOnMyWay } = req.body;

  try {
    await pool.query(
      `UPDATE event_attendees 
       SET current_lat = $1, current_lng = $2, is_on_my_way = COALESCE($3, is_on_my_way), location_sharing = true
       WHERE event_id = $4 AND user_id = $5`,
      [lat, lng, isOnMyWay, eventId, req.user.id]
    );

    await pool.query(
      'UPDATE users SET current_lat = $1, current_lng = $2 WHERE id = $3',
      [lat, lng, req.user.id]
    );

    res.json({ message: 'Location updated' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

router.put('/toggle-sharing', authenticateToken, async (req, res) => {
  const { eventId, sharing } = req.body;

  try {
    await pool.query(
      'UPDATE event_attendees SET location_sharing = $1 WHERE event_id = $2 AND user_id = $3',
      [sharing, eventId, req.user.id]
    );

    res.json({ message: 'Location sharing updated' });
  } catch (error) {
    console.error('Toggle sharing error:', error);
    res.status(500).json({ error: 'Failed to toggle sharing' });
  }
});

router.get('/attendees/:eventId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.profile_photo, 
       ea.current_lat, ea.current_lng, ea.is_on_my_way, ea.location_sharing
       FROM event_attendees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1 AND ea.location_sharing = true AND ea.status = 'accepted'`,
      [req.params.eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get attendee locations error:', error);
    res.status(500).json({ error: 'Failed to get attendee locations' });
  }
});

module.exports = router;
