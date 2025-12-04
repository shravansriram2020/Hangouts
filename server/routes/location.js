const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
}

// OpenStreetMap Nominatim search (free, no API key required)
async function searchNominatim(query, lat, lng) {
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=15&addressdetails=1`;
    
    // Add viewbox bias towards user location if available (but don't restrict)
    if (lat && lng) {
      const viewboxSize = 0.5; // ~35 miles
      url += `&viewbox=${lng - viewboxSize},${lat + viewboxSize},${lng + viewboxSize},${lat - viewboxSize}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HangoutsApp/1.0 (contact@example.com)' // Nominatim requires User-Agent
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map(result => {
      const resultLat = parseFloat(result.lat);
      const resultLng = parseFloat(result.lon);
      const distanceMiles = (lat && lng) ? calculateDistance(parseFloat(lat), parseFloat(lng), resultLat, resultLng) : null;
      
      // Extract a clean name from the result
      const name = result.name || 
                   result.address?.amenity ||
                   result.address?.building ||
                   result.address?.tourism ||
                   result.address?.leisure ||
                   result.address?.shop ||
                   result.address?.road ||
                   result.display_name.split(',')[0];
      
      return {
        id: `osm-${result.place_id}`,
        name: name,
        address: result.display_name,
        lat: resultLat,
        lng: resultLng,
        distanceMiles: distanceMiles ? distanceMiles.toFixed(1) : null,
        distance: distanceMiles ? distanceMiles * 1609.34 : null, // Convert to meters for sorting
        category: result.type,
        source: 'nominatim'
      };
    });
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}

// TomTom search as fallback/secondary source
async function searchTomTom(query, lat, lng) {
  if (!TOMTOM_API_KEY) return [];
  
  try {
    let url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&limit=15&typeahead=true`;
    
    if (lat && lng) {
      url += `&lat=${lat}&lon=${lng}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.results || []).map(result => {
      const resultLat = result.position?.lat;
      const resultLng = result.position?.lon;
      const distanceMiles = (lat && lng && resultLat && resultLng) 
        ? calculateDistance(parseFloat(lat), parseFloat(lng), resultLat, resultLng) 
        : null;
      
      return {
        id: result.id,
        name: result.poi?.name || result.address?.freeformAddress,
        address: result.address?.freeformAddress,
        lat: resultLat,
        lng: resultLng,
        distanceMiles: distanceMiles ? distanceMiles.toFixed(1) : null,
        distance: distanceMiles ? distanceMiles * 1609.34 : null,
        category: result.poi?.categories?.[0],
        source: 'tomtom'
      };
    });
  } catch (error) {
    console.error('TomTom search error:', error);
    return [];
  }
}

router.get('/search', authenticateToken, async (req, res) => {
  const { query, lat, lng } = req.query;

  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    // Use only OpenStreetMap Nominatim for faster results
    const results = await searchNominatim(query, lat, lng);
    
    // Filter valid results and sort by distance
    let validResults = results.filter(r => r.name && r.lat && r.lng);
    
    if (lat && lng) {
      validResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }
    
    // Return top 15 results
    res.json(validResults.slice(0, 15));
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
      
      const normalizedPoints = (leg.points || []).map(p => ({
        latitude: p.latitude,
        longitude: p.longitude
      }));
      
      res.json({
        distance: (leg.summary.lengthInMeters / 1609.34).toFixed(1),
        duration: Math.round(leg.summary.travelTimeInSeconds / 60),
        points: normalizedPoints
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
       SET current_lat = $1, current_lng = $2, is_on_my_way = COALESCE($3, is_on_my_way)
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

router.put('/on-my-way', authenticateToken, async (req, res) => {
  const { eventId, isOnMyWay } = req.body;

  try {
    await pool.query(
      'UPDATE event_attendees SET is_on_my_way = $1 WHERE event_id = $2 AND user_id = $3',
      [isOnMyWay, eventId, req.user.id]
    );

    res.json({ message: 'On my way status updated' });
  } catch (error) {
    console.error('On my way error:', error);
    res.status(500).json({ error: 'Failed to update on my way status' });
  }
});

router.get('/attendees/:eventId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id as user_id, u.first_name as user_name, u.profile_photo as profile_image, 
       ea.current_lat as lat, ea.current_lng as lng, ea.is_on_my_way, ea.location_sharing
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
