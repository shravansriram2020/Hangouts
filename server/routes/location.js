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
    // Use TomTom as primary search for reliability
    const results = await searchTomTom(query, lat, lng);
    
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

// TomTom Category mappings for smart suggestions
// Reference: https://developer.tomtom.com/search-api/documentation/product-information/supported-category-codes
const CATEGORY_MAPPINGS = {
  // Movies/Cinema
  movie: '7342',
  cinema: '7342',
  film: '7342',
  theater: '7342',
  theatre: '7342',
  
  // Restaurants/Food
  dinner: '7315',
  lunch: '7315',
  food: '7315',
  restaurant: '7315',
  eat: '7315',
  dining: '7315',
  brunch: '7315',
  breakfast: '7315',
  
  // Bars/Nightlife
  bar: '9376',
  drinks: '9376',
  pub: '9376',
  nightclub: '9379',
  club: '9379',
  nightlife: '9379',
  dancing: '9379',
  
  // Coffee/Cafe
  coffee: '9376006',
  cafe: '9376006',
  
  // Parks/Outdoors
  park: '9362',
  hike: '9362',
  hiking: '9362',
  picnic: '9362',
  outdoor: '9362',
  nature: '9362',
  walk: '9362',
  
  // Sports/Fitness
  gym: '7320',
  workout: '7320',
  fitness: '7320',
  sport: '7374',
  game: '7374',
  bowling: '7339',
  golf: '7335',
  tennis: '7347',
  basketball: '7374',
  soccer: '7374',
  football: '7374',
  
  // Entertainment
  arcade: '9902',
  amusement: '9902',
  theme: '9902',
  fun: '9902',
  entertainment: '9377',
  concert: '7318',
  music: '7318',
  show: '7318',
  
  // Shopping
  shop: '9361',
  shopping: '9361',
  mall: '7373',
  store: '9361',
  
  // Beach/Water
  beach: '9357',
  pool: '7338',
  swim: '7338',
  water: '9357',
  
  // Museums/Culture
  museum: '7317',
  art: '7317',
  gallery: '7317',
  exhibit: '7317',
  
  // Spa/Relaxation
  spa: '9356',
  relax: '9356',
  massage: '9356',
  
  // Games/Activities
  escape: '9902',
  laser: '9902',
  karaoke: '9379',
  trivia: '9376',
  board: '9902',
  
  // Study/Work
  library: '9913',
  study: '9913',
  cowork: '7388',
};

// Broad mixed categories for general hangouts - includes cafes, restaurants, entertainment, parks, bars
const MIXED_HANGOUT_CATEGORIES = '9376006,7315,9376,9362,7342,9902,9377,9361,7373,9379,7318,7317,9357';

function getCategoriesFromTitle(title) {
  if (!title || title.trim() === '') {
    // No title - use broad mixed categories
    return { categories: MIXED_HANGOUT_CATEGORIES, searchTerm: null };
  }
  
  const lowerTitle = title.toLowerCase();
  const foundCategories = new Set();
  let primarySearchTerm = null;
  
  // Check each keyword in the title
  for (const [keyword, categoryCode] of Object.entries(CATEGORY_MAPPINGS)) {
    if (lowerTitle.includes(keyword)) {
      foundCategories.add(categoryCode);
      // Use the first matching keyword as primary search term
      if (!primarySearchTerm) {
        primarySearchTerm = keyword;
      }
    }
  }
  
  // If no specific categories found, use mixed hangout categories for variety
  if (foundCategories.size === 0) {
    return { categories: MIXED_HANGOUT_CATEGORIES, searchTerm: null };
  }
  
  return { 
    categories: Array.from(foundCategories).join(','),
    searchTerm: primarySearchTerm
  };
}

router.get('/suggest', authenticateToken, async (req, res) => {
  const { title, lat, lng, radius = 5 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Location coordinates required' });
  }

  try {
    const { categories, searchTerm } = getCategoriesFromTitle(title);
    const radiusMeters = Math.round(parseFloat(radius) * 1609.34); // Convert miles to meters accurately
    
    let allResults = [];
    
    // Strategy 1: Category-based nearby search (most accurate for finding nearby POIs)
    const nearbyUrl = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=${radiusMeters}&limit=50&categorySet=${categories}`;
    
    try {
      const nearbyResponse = await fetch(nearbyUrl);
      const nearbyData = await nearbyResponse.json();
      
      if (nearbyData.results) {
        allResults.push(...nearbyData.results);
      }
    } catch (e) {
      console.error('Nearby search error:', e);
    }
    
    // Strategy 2: If we have a search term, also do POI search to broaden results
    if (searchTerm) {
      const poiUrl = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(searchTerm)}.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=${radiusMeters}&limit=30&categorySet=${categories}`;
      
      try {
        const poiResponse = await fetch(poiUrl);
        const poiData = await poiResponse.json();
        
        if (poiData.results) {
          allResults.push(...poiData.results);
        }
      } catch (e) {
        console.error('POI search error:', e);
      }
    }
    
    // Strategy 3: If still few results, do a broader mixed category search
    if (allResults.length < 10) {
      const broadUrl = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=${radiusMeters}&limit=50&categorySet=${MIXED_HANGOUT_CATEGORIES}`;
      
      try {
        const broadResponse = await fetch(broadUrl);
        const broadData = await broadResponse.json();
        
        if (broadData.results) {
          allResults.push(...broadData.results);
        }
      } catch (e) {
        console.error('Broad search error:', e);
      }
    }
    
    // Deduplicate by ID and name, then map to our format
    const seenIds = new Set();
    const seenNames = new Set();
    let results = [];
    
    for (const result of allResults) {
      const id = result.id;
      const name = result.poi?.name || result.address?.freeformAddress;
      
      if (!id || !name || !result.position?.lat || !result.position?.lon) continue;
      if (seenIds.has(id) || seenNames.has(name.toLowerCase())) continue;
      
      seenIds.add(id);
      seenNames.add(name.toLowerCase());
      
      results.push({
        id: id,
        name: name,
        address: result.address?.freeformAddress,
        lat: result.position?.lat,
        lng: result.position?.lon,
        distance: result.dist,
        category: result.poi?.categories?.[0]
      });
    }
    
    // Sort by distance
    results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    
    // Filter to only include results within the specified radius
    results = results.filter(r => !r.distance || r.distance <= radiusMeters);

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
    const userResult = await pool.query(
      'SELECT COALESCE(location_enabled, true) as location_enabled FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows[0]?.location_enabled === false) {
      return res.status(403).json({ error: 'Location sharing is disabled in your settings' });
    }

    const updateResult = await pool.query(
      `UPDATE event_attendees 
       SET current_lat = $1, current_lng = $2, is_on_my_way = COALESCE($3, is_on_my_way), location_updated_at = NOW()
       WHERE event_id = $4 AND user_id = $5 AND location_sharing = true`,
      [lat, lng, isOnMyWay, eventId, req.user.id]
    );

    if (updateResult.rowCount === 0) {
      return res.json({ message: 'Location sharing not enabled for this event' });
    }

    await pool.query(
      `UPDATE users SET current_lat = $1, current_lng = $2 WHERE id = $3 
       AND COALESCE(location_enabled, true) = true`,
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
    if (sharing) {
      const userResult = await pool.query(
        'SELECT COALESCE(location_enabled, true) as location_enabled FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userResult.rows[0]?.location_enabled === false) {
        return res.status(403).json({ error: 'Enable location sharing in Settings first' });
      }
    }

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
    if (isOnMyWay) {
      const userResult = await pool.query(
        'SELECT COALESCE(location_enabled, true) as location_enabled FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userResult.rows[0]?.location_enabled === false) {
        return res.status(403).json({ error: 'Enable location sharing in Settings first' });
      }
    }

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
       WHERE ea.event_id = $1 AND ea.location_sharing = true AND ea.status = 'accepted'
       AND COALESCE(u.location_enabled, true) = true`,
      [req.params.eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get attendee locations error:', error);
    res.status(500).json({ error: 'Failed to get attendee locations' });
  }
});

router.get('/static-map', authenticateToken, async (req, res) => {
  const { lat, lng, zoom = 14, width = 512, height = 400 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }

  if (!TOMTOM_API_KEY) {
    return res.status(500).json({ error: 'Map service not configured' });
  }

  try {
    const mapUrl = `https://api.tomtom.com/map/1/staticimage?key=${TOMTOM_API_KEY}&center=${lng},${lat}&zoom=${zoom}&width=${width}&height=${height}&format=png`;
    res.json({ url: mapUrl });
  } catch (error) {
    console.error('Static map error:', error);
    res.status(500).json({ error: 'Failed to generate static map' });
  }
});

module.exports = router;
