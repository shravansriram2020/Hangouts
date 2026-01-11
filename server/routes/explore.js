const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const TRENDING_CATEGORIES = [
  { category: 'Amusement Parks', emoji: '🔥', searchTerm: 'amusement park theme park' },
  { category: 'Restaurants', emoji: '🍽️', searchTerm: 'restaurant dining' },
  { category: 'Coffee Shops', emoji: '☕', searchTerm: 'coffee cafe' },
  { category: 'Bars & Nightlife', emoji: '🍸', searchTerm: 'bar nightclub' },
  { category: 'Parks & Recreation', emoji: '🌳', searchTerm: 'park recreation outdoor' },
  { category: 'Shopping', emoji: '🛍️', searchTerm: 'shopping mall' },
  { category: 'Movies', emoji: '🎬', searchTerm: 'cinema movie theater' },
  { category: 'Sports', emoji: '⚽', searchTerm: 'sports stadium gym' },
];


async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function searchNearbyPlaces(lat, lng, query, limit = 5) {
  if (!TOMTOM_API_KEY) {
    console.log('TomTom API key not configured, returning empty results');
    return [];
  }

  try {
    const url = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=10000&limit=${limit}&query=${encodeURIComponent(query)}`;
    
    const response = await fetchWithTimeout(url, 5000);
    
    if (!response.ok) {
      console.error('TomTom API returned status:', response.status);
      return [];
    }
    
    const data = await response.json();

    const results = (data.results || []).map(result => {
      const resultLat = result.position?.lat;
      const resultLng = result.position?.lon;
      const distanceMiles = calculateDistance(lat, lng, resultLat, resultLng);
      
      const name = result.poi?.name || result.address?.freeformAddress || 'Unknown Location';
      const abbreviatedName = name.length > 25 ? name.substring(0, 22) + '...' : name;

      return {
        id: result.id,
        name: name,
        abbreviatedName: abbreviatedName,
        address: result.address?.freeformAddress || '',
        lat: resultLat,
        lng: resultLng,
        category: result.poi?.categories?.[0] || '',
        distance: distanceMiles,
        imageUrl: null,
      };
    });
    
    return results;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('TomTom API timeout');
    } else {
      console.error('TomTom nearby search error:', error.message);
    }
    return [];
  }
}

async function searchPlacesByCategory(lat, lng, categoryCode, limit = 5) {
  if (!TOMTOM_API_KEY) {
    return [];
  }

  try {
    const url = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=15000&limit=${limit}&categorySet=${categoryCode}`;
    
    const response = await fetchWithTimeout(url, 5000);
    
    if (!response.ok) {
      console.error('TomTom category API returned status:', response.status);
      return [];
    }
    
    const data = await response.json();

    const results = (data.results || []).map(result => {
      const resultLat = result.position?.lat;
      const resultLng = result.position?.lon;
      const distanceMiles = calculateDistance(lat, lng, resultLat, resultLng);
      
      const name = result.poi?.name || result.address?.freeformAddress || 'Unknown Location';
      const abbreviatedName = name.length > 25 ? name.substring(0, 22) + '...' : name;

      return {
        id: result.id,
        name: name,
        abbreviatedName: abbreviatedName,
        address: result.address?.freeformAddress || '',
        lat: resultLat,
        lng: resultLng,
        category: result.poi?.categories?.[0] || '',
        distance: distanceMiles,
        imageUrl: null,
      };
    });
    
    return results;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('TomTom category API timeout');
    } else {
      console.error('TomTom category search error:', error.message);
    }
    return [];
  }
}

router.get('/feed', authenticateToken, async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Location coordinates required' });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  try {
    const suggestedLocationsPromise = searchNearbyPlaces(userLat, userLng, 'restaurant cafe bar entertainment', 5);

    const trendingLocationsPromise = searchNearbyPlaces(userLat, userLng, 'popular attraction landmark', 6);

    const randomCategories = TRENDING_CATEGORIES
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const trendingCategoriesPromise = Promise.all(
      randomCategories.map(async (cat) => {
        const locations = await searchNearbyPlaces(userLat, userLng, cat.searchTerm, 4);
        return {
          category: cat.category,
          emoji: cat.emoji,
          locations,
        };
      })
    );

    let sharedPhotos = [];
    try {
      const photosResult = await pool.query(`
        SELECT 
          ep.id,
          ep.photo_url as "imageUrl",
          COALESCE(u.first_name, 'User') as username,
          e.location_name as "locationName",
          e.location_address as "locationAddress",
          e.location_lat as lat,
          e.location_lng as lng
        FROM event_photos ep
        JOIN events e ON ep.event_id = e.id
        JOIN users u ON ep.uploader_id = u.id
        WHERE ep.share_to_explore = true
          AND ep.moderation_status = 'approved'
          AND e.location_lat IS NOT NULL
          AND e.location_lng IS NOT NULL
        ORDER BY ep.created_at DESC
        LIMIT 5
      `);
      sharedPhotos = photosResult.rows;
    } catch (dbError) {
      console.log('Shared photos query failed (columns may not exist yet):', dbError.message);
    }

    const [suggestedLocations, trendingLocations, trendingCategories] = await Promise.all([
      suggestedLocationsPromise,
      trendingLocationsPromise,
      trendingCategoriesPromise,
    ]);

    res.json({
      suggestedLocations,
      trendingLocations,
      trendingCategories: trendingCategories.filter(cat => cat.locations.length > 0),
      sharedPhotos,
    });
  } catch (error) {
    console.error('Explore feed error:', error);
    res.status(500).json({ error: 'Failed to fetch explore feed' });
  }
});

router.get('/shared-photos', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ep.id,
        ep.photo_url as "imageUrl",
        COALESCE(u.first_name, 'User') as username,
        e.location_name as "locationName",
        e.location_address as "locationAddress",
        e.location_lat as lat,
        e.location_lng as lng,
        ep.created_at as "createdAt"
      FROM event_photos ep
      JOIN events e ON ep.event_id = e.id
      JOIN users u ON ep.uploader_id = u.id
      WHERE ep.share_to_explore = true
        AND ep.moderation_status = 'approved'
        AND e.location_lat IS NOT NULL
      ORDER BY ep.created_at DESC
      LIMIT 20
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Shared photos error:', error);
    res.status(500).json({ error: 'Failed to fetch shared photos' });
  }
});

router.post('/photos/:photoId/share', authenticateToken, async (req, res) => {
  const { photoId } = req.params;
  const { share } = req.body;
  const userId = req.user.id;

  try {
    const photoCheck = await pool.query(
      'SELECT id, uploader_id FROM event_photos WHERE id = $1',
      [photoId]
    );

    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photoCheck.rows[0].uploader_id !== userId) {
      return res.status(403).json({ error: 'You can only share your own photos' });
    }

    await pool.query(
      `UPDATE event_photos 
       SET share_to_explore = $1, 
           moderation_status = CASE WHEN $1 = true THEN 'pending' ELSE NULL END
       WHERE id = $2`,
      [share, photoId]
    );

    res.json({ success: true, shared: share });
  } catch (error) {
    console.error('Share photo error:', error);
    res.status(500).json({ error: 'Failed to update photo sharing' });
  }
});

module.exports = router;
