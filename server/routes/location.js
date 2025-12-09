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
// Each mapping includes priority (1=high, 3=low) for scoring relevance
const CATEGORY_MAPPINGS = {
  // Movies/Cinema - High priority
  movie: { code: '7342', priority: 1 },
  movies: { code: '7342', priority: 1 },
  cinema: { code: '7342', priority: 1 },
  film: { code: '7342', priority: 1 },
  theater: { code: '7342', priority: 1 },
  theatre: { code: '7342', priority: 1 },
  flick: { code: '7342', priority: 2 },
  screening: { code: '7342', priority: 2 },
  
  // Restaurants/Food - High priority
  dinner: { code: '7315', priority: 1 },
  lunch: { code: '7315', priority: 1 },
  food: { code: '7315', priority: 1 },
  restaurant: { code: '7315', priority: 1 },
  eat: { code: '7315', priority: 1 },
  eating: { code: '7315', priority: 1 },
  dining: { code: '7315', priority: 1 },
  brunch: { code: '7315', priority: 1 },
  breakfast: { code: '7315', priority: 1 },
  meal: { code: '7315', priority: 1 },
  hungry: { code: '7315', priority: 2 },
  feast: { code: '7315', priority: 2 },
  grub: { code: '7315', priority: 2 },
  bite: { code: '7315', priority: 2 },
  dine: { code: '7315', priority: 1 },
  sushi: { code: '7315', priority: 1 },
  pizza: { code: '7315', priority: 1 },
  tacos: { code: '7315', priority: 1 },
  burger: { code: '7315', priority: 1 },
  burgers: { code: '7315', priority: 1 },
  bbq: { code: '7315', priority: 1 },
  steak: { code: '7315', priority: 1 },
  seafood: { code: '7315', priority: 1 },
  chinese: { code: '7315', priority: 2 },
  italian: { code: '7315', priority: 2 },
  mexican: { code: '7315', priority: 2 },
  thai: { code: '7315', priority: 2 },
  indian: { code: '7315', priority: 2 },
  
  // Bars/Nightlife
  bar: { code: '9376', priority: 1 },
  bars: { code: '9376', priority: 1 },
  drinks: { code: '9376', priority: 1 },
  drinking: { code: '9376', priority: 1 },
  pub: { code: '9376', priority: 1 },
  pubs: { code: '9376', priority: 1 },
  nightclub: { code: '9379', priority: 1 },
  club: { code: '9379', priority: 1 },
  clubbing: { code: '9379', priority: 1 },
  nightlife: { code: '9379', priority: 1 },
  dancing: { code: '9379', priority: 1 },
  dance: { code: '9379', priority: 1 },
  party: { code: '9379', priority: 1 },
  partying: { code: '9379', priority: 1 },
  cocktail: { code: '9376', priority: 1 },
  cocktails: { code: '9376', priority: 1 },
  beer: { code: '9376', priority: 1 },
  wine: { code: '9376', priority: 1 },
  happy: { code: '9376', priority: 2 }, // happy hour
  pregame: { code: '9376', priority: 2 },
  
  // Coffee/Cafe
  coffee: { code: '9376006', priority: 1 },
  cafe: { code: '9376006', priority: 1 },
  latte: { code: '9376006', priority: 1 },
  espresso: { code: '9376006', priority: 1 },
  tea: { code: '9376006', priority: 2 },
  boba: { code: '9376006', priority: 1 },
  matcha: { code: '9376006', priority: 2 },
  
  // Parks/Outdoors
  park: { code: '9362', priority: 1 },
  parks: { code: '9362', priority: 1 },
  hike: { code: '9362', priority: 1 },
  hiking: { code: '9362', priority: 1 },
  picnic: { code: '9362', priority: 1 },
  outdoor: { code: '9362', priority: 1 },
  outdoors: { code: '9362', priority: 1 },
  nature: { code: '9362', priority: 1 },
  walk: { code: '9362', priority: 1 },
  walking: { code: '9362', priority: 1 },
  trail: { code: '9362', priority: 1 },
  trails: { code: '9362', priority: 1 },
  garden: { code: '9362', priority: 2 },
  botanical: { code: '9362', priority: 2 },
  
  // Sports/Fitness
  gym: { code: '7320', priority: 1 },
  workout: { code: '7320', priority: 1 },
  fitness: { code: '7320', priority: 1 },
  exercise: { code: '7320', priority: 1 },
  yoga: { code: '7320', priority: 1 },
  pilates: { code: '7320', priority: 2 },
  sport: { code: '7374', priority: 1 },
  sports: { code: '7374', priority: 1 },
  game: { code: '7374', priority: 2 },
  bowling: { code: '7339', priority: 1 },
  golf: { code: '7335', priority: 1 },
  minigolf: { code: '7335', priority: 1 },
  tennis: { code: '7347', priority: 1 },
  basketball: { code: '7374', priority: 1 },
  soccer: { code: '7374', priority: 1 },
  football: { code: '7374', priority: 1 },
  volleyball: { code: '7374', priority: 1 },
  batting: { code: '7374', priority: 1 },
  climbing: { code: '9362', priority: 1 },
  rock: { code: '9362', priority: 2 },
  skate: { code: '7374', priority: 1 },
  skating: { code: '7374', priority: 1 },
  
  // Entertainment
  arcade: { code: '9902', priority: 1 },
  amusement: { code: '9902', priority: 1 },
  theme: { code: '9902', priority: 2 },
  fun: { code: '9902', priority: 3 },
  entertainment: { code: '9377', priority: 2 },
  concert: { code: '7318', priority: 1 },
  concerts: { code: '7318', priority: 1 },
  music: { code: '7318', priority: 2 },
  show: { code: '7318', priority: 2 },
  live: { code: '7318', priority: 2 },
  comedy: { code: '7318', priority: 1 },
  standup: { code: '7318', priority: 1 },
  
  // Shopping
  shop: { code: '9361', priority: 1 },
  shopping: { code: '9361', priority: 1 },
  mall: { code: '7373', priority: 1 },
  store: { code: '9361', priority: 2 },
  
  // Beach/Water
  beach: { code: '9357', priority: 1 },
  pool: { code: '7338', priority: 1 },
  swim: { code: '7338', priority: 1 },
  swimming: { code: '7338', priority: 1 },
  water: { code: '9357', priority: 2 },
  waterpark: { code: '9902', priority: 1 },
  
  // Museums/Culture
  museum: { code: '7317', priority: 1 },
  museums: { code: '7317', priority: 1 },
  art: { code: '7317', priority: 1 },
  gallery: { code: '7317', priority: 1 },
  exhibit: { code: '7317', priority: 1 },
  exhibition: { code: '7317', priority: 1 },
  zoo: { code: '9902', priority: 1 },
  aquarium: { code: '9902', priority: 1 },
  planetarium: { code: '7317', priority: 1 },
  
  // Spa/Relaxation
  spa: { code: '9356', priority: 1 },
  relax: { code: '9356', priority: 2 },
  relaxing: { code: '9356', priority: 2 },
  massage: { code: '9356', priority: 1 },
  pampering: { code: '9356', priority: 2 },
  
  // Games/Activities
  escape: { code: '9902', priority: 1 },
  laser: { code: '9902', priority: 1 },
  lasertag: { code: '9902', priority: 1 },
  karaoke: { code: '9379', priority: 1 },
  trivia: { code: '9376', priority: 1 },
  board: { code: '9902', priority: 2 },
  games: { code: '9902', priority: 2 },
  axe: { code: '9902', priority: 1 }, // axe throwing
  throwing: { code: '9902', priority: 2 },
  trampoline: { code: '9902', priority: 1 },
  paintball: { code: '9902', priority: 1 },
  gokart: { code: '9902', priority: 1 },
  racing: { code: '9902', priority: 2 },
  
  // Study/Work
  library: { code: '9913', priority: 1 },
  study: { code: '9913', priority: 1 },
  studying: { code: '9913', priority: 1 },
  cowork: { code: '7388', priority: 1 },
  coworking: { code: '7388', priority: 1 },
  
  // Social activities
  meetup: { code: '9376006', priority: 2 },
  hangout: { code: '9376006', priority: 2 },
  hang: { code: '9376006', priority: 3 },
  chill: { code: '9376006', priority: 2 },
  catchup: { code: '9376006', priority: 2 },
  
  // Date activities
  date: { code: '7315', priority: 2 },
  romantic: { code: '7315', priority: 2 },
  anniversary: { code: '7315', priority: 2 },
  
  // Special occasions
  birthday: { code: '7315', priority: 2 },
  celebration: { code: '7315', priority: 2 },
  celebrate: { code: '7315', priority: 2 },
};

// Broad mixed categories for general hangouts - includes cafes, restaurants, entertainment, parks, bars
const MIXED_HANGOUT_CATEGORIES = '9376006,7315,9376,9362,7342,9902,9377,9361,7373,9379,7318,7317,9357';

function getCategoriesFromTitle(title) {
  if (!title || title.trim() === '') {
    // No title - use broad mixed categories
    return { categories: MIXED_HANGOUT_CATEGORIES, searchTerm: null, matchedKeywords: [] };
  }
  
  const lowerTitle = title.toLowerCase();
  // Clean and tokenize the title for better matching
  const words = lowerTitle.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  
  const foundMatches = [];
  const processedKeywords = new Set();
  
  // Check each keyword in the title with priority scoring
  for (const [keyword, data] of Object.entries(CATEGORY_MAPPINGS)) {
    // Check for exact word match first (higher confidence)
    const exactMatch = words.includes(keyword);
    // Then check for partial match (word contains keyword)
    const partialMatch = !exactMatch && lowerTitle.includes(keyword);
    
    if (exactMatch || partialMatch) {
      // Avoid duplicate categories but track all matched keywords
      if (!processedKeywords.has(keyword)) {
        processedKeywords.add(keyword);
        foundMatches.push({
          keyword,
          code: data.code,
          priority: data.priority,
          isExact: exactMatch
        });
      }
    }
  }
  
  // If no specific categories found, use mixed hangout categories for variety
  if (foundMatches.length === 0) {
    return { categories: MIXED_HANGOUT_CATEGORIES, searchTerm: null, matchedKeywords: [] };
  }
  
  // Sort by priority (1 is highest) and exact match preference
  foundMatches.sort((a, b) => {
    // Exact matches first
    if (a.isExact !== b.isExact) return b.isExact ? 1 : -1;
    // Then by priority (lower number = higher priority)
    return a.priority - b.priority;
  });
  
  // Deduplicate category codes while preserving order
  const uniqueCodes = [...new Set(foundMatches.map(m => m.code))];
  
  // Use the highest priority matched keyword as search term
  const primarySearchTerm = foundMatches[0]?.keyword || null;
  const matchedKeywords = foundMatches.map(m => m.keyword);
  
  return { 
    categories: uniqueCodes.join(','),
    searchTerm: primarySearchTerm,
    matchedKeywords
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
    const userResult = await pool.query(
      'SELECT location_enabled FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const globalLocationEnabled = userResult.rows[0]?.location_enabled;
    
    if (!globalLocationEnabled && sharing === true) {
      return res.status(400).json({ 
        error: 'Location sharing is disabled in your settings',
        globalDisabled: true 
      });
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
       WHERE ea.event_id = $1 AND ea.location_sharing = true AND ea.status = 'accepted' AND u.location_enabled = true`,
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
