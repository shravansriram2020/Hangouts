const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

let fallbackData = null;
try {
  const fallbackPath = path.join(__dirname, '../data/exploreFallback.json');
  fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
} catch (e) {
  console.log('Fallback data not loaded:', e.message);
}

function getCategoryImage(category) {
  if (!fallbackData?.categoryImages) {
    return 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=300&fit=crop';
  }
  
  const lowerCategory = (category || '').toLowerCase();
  
  if (lowerCategory.includes('restaurant') || lowerCategory.includes('food') || lowerCategory.includes('pizza') || lowerCategory.includes('burger')) {
    return fallbackData.categoryImages.restaurant;
  }
  if (lowerCategory.includes('cafe') || lowerCategory.includes('coffee')) {
    return fallbackData.categoryImages.cafe;
  }
  if (lowerCategory.includes('bar') || lowerCategory.includes('pub')) {
    return fallbackData.categoryImages.bar;
  }
  if (lowerCategory.includes('club') || lowerCategory.includes('nightlife')) {
    return fallbackData.categoryImages.nightclub;
  }
  if (lowerCategory.includes('cinema') || lowerCategory.includes('theater') || lowerCategory.includes('movie')) {
    return fallbackData.categoryImages.cinema;
  }
  if (lowerCategory.includes('park') || lowerCategory.includes('garden')) {
    return fallbackData.categoryImages.park;
  }
  if (lowerCategory.includes('beach')) {
    return fallbackData.categoryImages.beach;
  }
  if (lowerCategory.includes('gym') || lowerCategory.includes('fitness')) {
    return fallbackData.categoryImages.gym;
  }
  if (lowerCategory.includes('sport') || lowerCategory.includes('court') || lowerCategory.includes('golf')) {
    return fallbackData.categoryImages.sports;
  }
  if (lowerCategory.includes('bowling')) {
    return fallbackData.categoryImages.bowling;
  }
  if (lowerCategory.includes('entertainment') || lowerCategory.includes('arcade') || lowerCategory.includes('game')) {
    return fallbackData.categoryImages.entertainment;
  }
  
  return fallbackData.categoryImages.default;
}

function getFallbackLocations(categoryKey, count = 6) {
  if (!fallbackData?.categories?.[categoryKey]) {
    return [];
  }
  
  const category = fallbackData.categories[categoryKey];
  return category.locations.slice(0, count).map((loc, index) => ({
    id: `fallback-${categoryKey}-${index}`,
    name: loc.name,
    abbreviatedName: loc.name.length > 25 ? loc.name.substring(0, 22) + '...' : loc.name,
    address: '',
    lat: null,
    lng: null,
    category: loc.category,
    distance: null,
    imageUrl: loc.image,
    isFallback: true,
  }));
}

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

const MAX_DISTANCE_MILES = 60;
const MAX_RADIUS_METERS = 96560;

const CATEGORY_CODES = {
  FOOD: '7315',
  ENTERTAINMENT: '9362,7342,9902,9361',
  OUTDOORS: '9362,9927,7305',
  SPORTS: '7320,7374,9361',
  NIGHTLIFE: '9376,9379',
};

const TRENDING_CATEGORIES = [
  { category: 'Food', emoji: '🍽️', categoryCodes: CATEGORY_CODES.FOOD },
  { category: 'Entertainment', emoji: '🎬', categoryCodes: CATEGORY_CODES.ENTERTAINMENT },
  { category: 'Outdoors', emoji: '🌳', categoryCodes: CATEGORY_CODES.OUTDOORS },
  { category: 'Sports', emoji: '⚽', categoryCodes: CATEGORY_CODES.SPORTS },
  { category: 'Nightlife', emoji: '🍸', categoryCodes: CATEGORY_CODES.NIGHTLIFE },
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

async function searchNearbyPlaces(lat, lng, categoryCodes, limit = 5) {
  if (!TOMTOM_API_KEY) {
    console.log('TomTom API key not configured, returning empty results');
    return [];
  }

  try {
    const url = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=${MAX_RADIUS_METERS}&limit=${limit}&categorySet=${categoryCodes}`;
    
    const response = await fetchWithTimeout(url, 5000);
    
    if (!response.ok) {
      console.error('TomTom API returned status:', response.status);
      return [];
    }
    
    const data = await response.json();

    const results = (data.results || [])
      .map(result => {
        const resultLat = result.position?.lat;
        const resultLng = result.position?.lon;
        const distanceMiles = calculateDistance(lat, lng, resultLat, resultLng);
        
        if (distanceMiles > MAX_DISTANCE_MILES) {
          return null;
        }
        
        const name = result.poi?.name || result.address?.freeformAddress || 'Unknown Location';
        const abbreviatedName = name.length > 25 ? name.substring(0, 22) + '...' : name;

        const poiCategory = result.poi?.categories?.[0] || '';
        return {
          id: result.id,
          name: name,
          abbreviatedName: abbreviatedName,
          address: result.address?.freeformAddress || '',
          lat: resultLat,
          lng: resultLng,
          category: poiCategory,
          distance: distanceMiles,
          imageUrl: getCategoryImage(poiCategory),
        };
      })
      .filter(Boolean);
    
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

async function searchPlacesByCategory(lat, lng, categoryCodes, limit = 5) {
  if (!TOMTOM_API_KEY) {
    return [];
  }

  try {
    const url = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=${MAX_RADIUS_METERS}&limit=${limit}&categorySet=${categoryCodes}`;
    
    const response = await fetchWithTimeout(url, 5000);
    
    if (!response.ok) {
      console.error('TomTom category API returned status:', response.status);
      return [];
    }
    
    const data = await response.json();

    const results = (data.results || [])
      .map(result => {
        const resultLat = result.position?.lat;
        const resultLng = result.position?.lon;
        const distanceMiles = calculateDistance(lat, lng, resultLat, resultLng);
        
        if (distanceMiles > MAX_DISTANCE_MILES) {
          return null;
        }
        
        const name = result.poi?.name || result.address?.freeformAddress || 'Unknown Location';
        const abbreviatedName = name.length > 25 ? name.substring(0, 22) + '...' : name;

        const poiCategory = result.poi?.categories?.[0] || '';
        return {
          id: result.id,
          name: name,
          abbreviatedName: abbreviatedName,
          address: result.address?.freeformAddress || '',
          lat: resultLat,
          lng: resultLng,
          category: poiCategory,
          distance: distanceMiles,
          imageUrl: getCategoryImage(poiCategory),
        };
      })
      .filter(Boolean);
    
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
    const allFunCategoryCodes = `${CATEGORY_CODES.FOOD},${CATEGORY_CODES.ENTERTAINMENT},${CATEGORY_CODES.NIGHTLIFE}`;
    const suggestedLocationsPromise = searchNearbyPlaces(userLat, userLng, allFunCategoryCodes, 6);

    const trendingCategoriesPromise = Promise.all(
      TRENDING_CATEGORIES.map(async (cat) => {
        const locations = await searchPlacesByCategory(userLat, userLng, cat.categoryCodes, 4);
        return {
          category: cat.category,
          emoji: cat.emoji,
          locations,
        };
      })
    );

    let userHangouts = [];
    try {
      const hangoutsResult = await pool.query(`
        SELECT 
          e.id,
          e.location_name as name,
          CASE WHEN LENGTH(e.location_name) > 25 
            THEN SUBSTRING(e.location_name, 1, 22) || '...' 
            ELSE e.location_name 
          END as "abbreviatedName",
          e.location_address as address,
          e.location_lat as lat,
          e.location_lng as lng,
          u.first_name as "creatorName",
          COUNT(DISTINCT ea.user_id) as "attendeeCount"
        FROM events e
        JOIN users u ON e.creator_id = u.id
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.location_lat IS NOT NULL
          AND e.location_lng IS NOT NULL
          AND e.date >= CURRENT_DATE
          AND (
            3959 * acos(
              cos(radians($1)) * cos(radians(e.location_lat)) *
              cos(radians(e.location_lng) - radians($2)) +
              sin(radians($1)) * sin(radians(e.location_lat))
            )
          ) <= $3
        GROUP BY e.id, e.location_name, e.location_address, e.location_lat, e.location_lng, u.first_name
        ORDER BY "attendeeCount" DESC, e.date ASC
        LIMIT 10
      `, [userLat, userLng, MAX_DISTANCE_MILES]);
      
      userHangouts = hangoutsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        abbreviatedName: row.abbreviatedName,
        address: row.address,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        category: 'hangout',
        distance: calculateDistance(userLat, userLng, parseFloat(row.lat), parseFloat(row.lng)),
        attendeeCount: parseInt(row.attendeeCount) || 0,
        imageUrl: getCategoryImage('bar'),
        isUserHangout: true,
        creatorName: row.creatorName || 'A user',
      }));
    } catch (dbError) {
      console.log('User hangouts query failed:', dbError.message);
    }

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

    const [suggestedLocations, trendingCategories] = await Promise.all([
      suggestedLocationsPromise,
      trendingCategoriesPromise,
    ]);

    let finalSuggested = suggestedLocations;
    if (finalSuggested.length === 0) {
      finalSuggested = getFallbackLocations('food', 6);
    }

    let finalTrending = trendingCategories.filter(cat => cat.locations.length > 0);
    if (finalTrending.length === 0) {
      const categoryKeyMap = {
        'Food': 'food',
        'Entertainment': 'entertainment',
        'Outdoors': 'outdoors',
        'Sports': 'sports',
        'Nightlife': 'nightlife',
      };
      
      finalTrending = TRENDING_CATEGORIES.map(cat => ({
        category: cat.category,
        emoji: cat.emoji,
        locations: getFallbackLocations(categoryKeyMap[cat.category] || 'food', 4),
      }));
    }

    res.json({
      suggestedLocations: finalSuggested,
      userHangouts,
      trendingCategories: finalTrending,
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
