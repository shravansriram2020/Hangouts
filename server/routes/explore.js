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

const VENUE_TYPE_IMAGES = {
  bowling: [
    'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1562079579-79a7ea2f7c2e?w=400&h=300&fit=crop',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  ],
  bar: [
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1574126154517-d1e0d89ef734?w=400&h=300&fit=crop',
  ],
  nightclub: [
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=400&h=300&fit=crop',
  ],
  cinema: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=400&h=300&fit=crop',
  ],
  park: [
    'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?w=400&h=300&fit=crop',
  ],
  beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400&h=300&fit=crop',
  ],
  gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop',
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1526676037777-05a232554f77?w=400&h=300&fit=crop',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1536818968680-deeec2e9fd11?w=400&h=300&fit=crop',
  ],
  amusement: [
    'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=400&h=300&fit=crop',
  ],
  pizza: [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&h=300&fit=crop',
  ],
  sushi: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=300&fit=crop',
  ],
  mexican: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
  ],
  brewery: [
    'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=300&fit=crop',
  ],
  default: [
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&h=300&fit=crop',
  ],
};

function getCategoryImage(category, venueName = '') {
  const combined = `${category || ''} ${venueName || ''}`.toLowerCase();
  
  let imagePool = VENUE_TYPE_IMAGES.default;
  
  if (combined.includes('bowling') || combined.includes('bowlero') || combined.includes('amf')) {
    imagePool = VENUE_TYPE_IMAGES.bowling;
  } else if (combined.includes('pizza') || combined.includes('pizzeria')) {
    imagePool = VENUE_TYPE_IMAGES.pizza;
  } else if (combined.includes('burger') || combined.includes('grill') || combined.includes('five guys') || combined.includes('in-n-out')) {
    imagePool = VENUE_TYPE_IMAGES.burger;
  } else if (combined.includes('sushi') || combined.includes('japanese') || combined.includes('ramen')) {
    imagePool = VENUE_TYPE_IMAGES.sushi;
  } else if (combined.includes('mexican') || combined.includes('taco') || combined.includes('burrito')) {
    imagePool = VENUE_TYPE_IMAGES.mexican;
  } else if (combined.includes('brewery') || combined.includes('brewing')) {
    imagePool = VENUE_TYPE_IMAGES.brewery;
  } else if (combined.includes('restaurant') || combined.includes('food') || combined.includes('dining')) {
    imagePool = VENUE_TYPE_IMAGES.restaurant;
  } else if (combined.includes('cafe') || combined.includes('coffee') || combined.includes('starbucks')) {
    imagePool = VENUE_TYPE_IMAGES.cafe;
  } else if (combined.includes('bar') || combined.includes('pub') || combined.includes('tavern')) {
    imagePool = VENUE_TYPE_IMAGES.bar;
  } else if (combined.includes('club') || combined.includes('nightlife') || combined.includes('lounge')) {
    imagePool = VENUE_TYPE_IMAGES.nightclub;
  } else if (combined.includes('cinema') || combined.includes('theater') || combined.includes('movie') || combined.includes('amc')) {
    imagePool = VENUE_TYPE_IMAGES.cinema;
  } else if (combined.includes('park') || combined.includes('garden') || combined.includes('trail')) {
    imagePool = VENUE_TYPE_IMAGES.park;
  } else if (combined.includes('beach') || combined.includes('pier')) {
    imagePool = VENUE_TYPE_IMAGES.beach;
  } else if (combined.includes('gym') || combined.includes('fitness') || combined.includes('equinox') || combined.includes('planet fitness')) {
    imagePool = VENUE_TYPE_IMAGES.gym;
  } else if (combined.includes('sport') || combined.includes('court') || combined.includes('golf') || combined.includes('stadium')) {
    imagePool = VENUE_TYPE_IMAGES.sports;
  } else if (combined.includes('amusement') || combined.includes('theme park') || combined.includes('disneyland') || combined.includes('universal') || combined.includes('six flags')) {
    imagePool = VENUE_TYPE_IMAGES.amusement;
  } else if (combined.includes('entertainment') || combined.includes('arcade') || combined.includes('game') || combined.includes('dave') || combined.includes('round1')) {
    imagePool = VENUE_TYPE_IMAGES.entertainment;
  }
  
  const randomIndex = Math.floor(Math.random() * imagePool.length);
  return imagePool[randomIndex];
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

const MAX_DISTANCE_MILES = 30;
const MAX_RADIUS_METERS = 48000;

const EXPLORE_CATEGORIES = [
  { name: 'Food & Dining', emoji: '🍽️', codes: '7315' },
  { name: 'Bars & Pubs', emoji: '🍺', codes: '9376' },
  { name: 'Nightlife', emoji: '🌙', codes: '9379' },
  { name: 'Entertainment', emoji: '🎬', codes: '7335,7342' },
  { name: 'Parks & Recreation', emoji: '🏞️', codes: '9362' },
  { name: 'Sports & Fitness', emoji: '⚽', codes: '7320,9373' },
  { name: 'Museums & Culture', emoji: '🏛️', codes: '7316,7317' },
  { name: 'Shopping', emoji: '🛍️', codes: '7338' },
  { name: 'Amusement', emoji: '🎢', codes: '9902' },
  { name: 'Cafes & Coffee', emoji: '☕', codes: '9377' },
];

const ALL_FUN_CODES = EXPLORE_CATEGORIES.map(c => c.codes).join(',');

const EXCLUDED_NAMES = ['home', 'apartment', 'residence', 'city hall', 'hospital', 'medical', 'clinic', 'school', 'church', 'office', 'bank', 'atm', 'gas station', 'parking', 'city', 'county', 'municipality', 'government', 'police', 'fire station', 'post office', 'library', 'university', 'college', 'dmv', 'court', 'prison', 'jail'];

const EXCLUDED_CATEGORIES = ['city', 'town', 'municipality', 'administrative', 'geographic', 'neighbourhood', 'hamlet', 'village', 'suburb', 'borough', 'district'];

function isFunLocation(name, category) {
  const combined = `${name} ${category}`.toLowerCase();
  if (EXCLUDED_CATEGORIES.some(excluded => combined.includes(excluded))) {
    return false;
  }
  return !EXCLUDED_NAMES.some(excluded => combined.includes(excluded));
}


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

async function searchNearbyPlaces(lat, lng, categoryCodes, limit = 10) {
  if (!TOMTOM_API_KEY) {
    console.log('TomTom API key not configured, returning empty results');
    return [];
  }

  try {
    const url = `https://api.tomtom.com/search/2/nearbySearch.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=${MAX_RADIUS_METERS}&limit=${limit}&categorySet=${categoryCodes}`;
    
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
        
        if (!result.poi?.name) {
          return null;
        }
        
        const name = result.poi.name;
        const poiCategory = result.poi?.categories?.[0] || '';
        
        if (!isFunLocation(name, poiCategory)) {
          return null;
        }
        
        const fullAddress = result.address?.freeformAddress || '';
        if (!fullAddress) {
          return null;
        }
        
        const abbreviatedName = name.length > 25 ? name.substring(0, 22) + '...' : name;

        return {
          id: result.id,
          name: name,
          abbreviatedName: abbreviatedName,
          address: result.address?.freeformAddress || '',
          lat: resultLat,
          lng: resultLng,
          category: poiCategory,
          distance: distanceMiles,
          imageUrl: getCategoryImage(poiCategory, name),
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
    const url = `https://api.tomtom.com/search/2/nearbySearch.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lng}&radius=${MAX_RADIUS_METERS}&limit=${limit}&categorySet=${categoryCodes}`;
    
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
        
        if (!result.poi?.name) {
          return null;
        }
        
        const name = result.poi.name;
        const fullAddress = result.address?.freeformAddress || '';
        if (!fullAddress) {
          return null;
        }
        
        const abbreviatedName = name.length > 25 ? name.substring(0, 22) + '...' : name;
        const poiCategory = result.poi?.categories?.[0] || '';
        
        return {
          id: result.id,
          name: name,
          abbreviatedName: abbreviatedName,
          address: fullAddress,
          lat: resultLat,
          lng: resultLng,
          category: poiCategory,
          distance: distanceMiles,
          imageUrl: getCategoryImage(poiCategory, name),
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

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const REQUIRED_CATEGORIES = [
  { id: 'restaurants', name: 'Restaurants', emoji: '🍽️', codes: '7315' },
  { id: 'amusement', name: 'Amusement Parks', emoji: '🎢', codes: '9902' },
  { id: 'sports', name: 'Sports & Recreation', emoji: '⚽', codes: '7320,9373' },
];

const OPTIONAL_CATEGORIES = [
  { id: 'cafes', name: 'Coffee & Cafes', emoji: '☕', codes: '9377' },
  { id: 'bars', name: 'Bars & Nightlife', emoji: '🍺', codes: '9376,9379' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', codes: '7335,7342' },
  { id: 'parks', name: 'Parks & Outdoors', emoji: '🏞️', codes: '9362' },
  { id: 'museums', name: 'Museums & Culture', emoji: '🏛️', codes: '7316,7317' },
];

const REQUIRED_ADS = ['adBanner1', 'adBanner2', 'adBanner3', 'adBanner4'];
const CONTENT_SECTIONS = [
  'suggestedLocation1',
  'featuredHangout', 
  'sharedPhotos',
  'suggestedLocation2',
  'hangoutBanner1',
  'trending',
  'categories',
  'suggestedLocation3',
  'hangoutBanner2',
  'moreHangouts',
  'discoverMore',
  'hangoutBanner3',
];

function generateRandomLayout() {
  const shuffledContent = shuffleArray([...CONTENT_SECTIONS]);
  const shuffledAds = shuffleArray([...REQUIRED_ADS]);
  
  const result = [];
  let adIndex = 0;
  
  for (let i = 0; i < shuffledContent.length; i++) {
    result.push(shuffledContent[i]);
    if ((i + 1) % 3 === 0 && adIndex < shuffledAds.length) {
      result.push(shuffledAds[adIndex]);
      adIndex++;
    }
  }
  
  while (adIndex < shuffledAds.length) {
    const insertPos = result.length - 1;
    result.splice(insertPos, 0, shuffledAds[adIndex]);
    adIndex++;
  }
  
  return result;
}

function sampleAcrossRadius(locations, count) {
  if (locations.length <= count) return locations;
  const sorted = [...locations].sort((a, b) => a.distance - b.distance);
  const result = [];
  const bucketSize = Math.ceil(sorted.length / count);
  for (let i = 0; i < count && i * bucketSize < sorted.length; i++) {
    const bucketStart = i * bucketSize;
    const bucketEnd = Math.min(bucketStart + bucketSize, sorted.length);
    const randomIndex = bucketStart + Math.floor(Math.random() * (bucketEnd - bucketStart));
    result.push(sorted[randomIndex]);
  }
  return shuffleArray(result);
}

router.get('/feed', authenticateToken, async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Location coordinates required' });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  try {
    const layoutOrder = generateRandomLayout();
    
    const shuffledCategories = shuffleArray([...REQUIRED_CATEGORIES]);
    
    const categoryPromises = shuffledCategories.map(section => 
      searchNearbyPlaces(userLat, userLng, section.codes, 8).then(locations => ({
        ...section,
        locations: sampleAcrossRadius(locations, 4),
      }))
    );
    
    const allCategoryCodes = shuffledCategories.map(s => s.codes).join(',');
    console.log('[Explore] Layout order:', layoutOrder.slice(0, 5).join(', ') + '...');
    console.log('[Explore] Categories:', shuffledCategories.map(s => s.name).join(', '));
    const suggestedLocationsPromise = searchNearbyPlaces(userLat, userLng, allCategoryCodes, 20);

    const trendingEventsPromise = pool.query(`
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
        u.username as "creatorName",
        e.event_date,
        COUNT(DISTINCT ea.user_id) as "attendeeCount",
        (
          SELECT ep.photo_url FROM event_photos ep 
          WHERE ep.event_id = e.id 
            AND ep.share_to_explore = true 
            AND ep.moderation_status = 'approved'
          ORDER BY ep.created_at DESC 
          LIMIT 1
        ) as "eventPhoto",
        (
          3959 * acos(
            cos(radians($1)) * cos(radians(e.location_lat)) *
            cos(radians(e.location_lng) - radians($2)) +
            sin(radians($1)) * sin(radians(e.location_lat))
          )
        ) as distance
      FROM events e
      JOIN users u ON e.host_id = u.id
      LEFT JOIN event_attendees ea ON e.id = ea.event_id
      WHERE e.location_lat IS NOT NULL
        AND e.location_lng IS NOT NULL
        AND e.event_date >= CURRENT_DATE - INTERVAL '30 days'
        AND LOWER(e.location_name) NOT LIKE '%hospital%'
        AND LOWER(e.location_name) NOT LIKE '%medical%'
        AND LOWER(e.location_name) NOT LIKE '%clinic%'
        AND LOWER(e.location_name) NOT LIKE '%school%'
        AND LOWER(e.location_name) NOT LIKE '%church%'
        AND LOWER(e.location_name) NOT LIKE '%bank%'
        AND LOWER(e.location_name) NOT LIKE '%office%'
        AND (
          3959 * acos(
            cos(radians($1)) * cos(radians(e.location_lat)) *
            cos(radians(e.location_lng) - radians($2)) +
            sin(radians($1)) * sin(radians(e.location_lat))
          )
        ) <= $3
      GROUP BY e.id, e.location_name, e.location_address, e.location_lat, e.location_lng, 
               u.username, e.event_date
      ORDER BY "attendeeCount" DESC, e.event_date DESC
      LIMIT 12
    `, [userLat, userLng, MAX_DISTANCE_MILES]).catch(err => {
      console.log('Trending events query failed:', err.message);
      return { rows: [] };
    });

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
          u.username as "creatorName",
          COUNT(DISTINCT ea.user_id) as "attendeeCount"
        FROM events e
        JOIN users u ON e.host_id = u.id
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.location_lat IS NOT NULL
          AND e.location_lng IS NOT NULL
          AND e.event_date >= CURRENT_DATE
          AND (
            3959 * acos(
              cos(radians($1)) * cos(radians(e.location_lat)) *
              cos(radians(e.location_lng) - radians($2)) +
              sin(radians($1)) * sin(radians(e.location_lat))
            )
          ) <= $3
        GROUP BY e.id, e.location_name, e.location_address, e.location_lat, e.location_lng, u.username
        ORDER BY "attendeeCount" DESC, e.event_date ASC
        LIMIT 8
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
        imageUrl: getCategoryImage('', row.name),
        isUserHangout: true,
        creatorName: row.creatorName || 'A user',
      }));
    } catch (dbError) {
      console.log('User hangouts query failed:', dbError.message);
    }

    let sharedPhotos = [];
    try {
      const photosResult = await pool.query(`
        SELECT DISTINCT ON (ep.photo_url)
          ep.id,
          ep.photo_url as "imageUrl",
          COALESCE(u.username, 'User') as username,
          e.location_name as "locationName",
          e.location_address as "locationAddress",
          e.location_lat as lat,
          e.location_lng as lng,
          (
            3959 * acos(
              cos(radians($1)) * cos(radians(e.location_lat)) *
              cos(radians(e.location_lng) - radians($2)) +
              sin(radians($1)) * sin(radians(e.location_lat))
            )
          ) as distance,
          ep.created_at
        FROM event_photos ep
        JOIN events e ON ep.event_id = e.id
        JOIN users u ON ep.uploader_id = u.id
        WHERE ep.share_to_explore = true
          AND ep.moderation_status = 'approved'
          AND e.location_lat IS NOT NULL
          AND e.location_lng IS NOT NULL
          AND (
            3959 * acos(
              cos(radians($1)) * cos(radians(e.location_lat)) *
              cos(radians(e.location_lng) - radians($2)) +
              sin(radians($1)) * sin(radians(e.location_lat))
            )
          ) <= $3
        ORDER BY ep.photo_url, distance ASC, ep.created_at DESC
        LIMIT 10
      `, [userLat, userLng, MAX_DISTANCE_MILES]);
      sharedPhotos = photosResult.rows;
    } catch (dbError) {
      console.log('Shared photos query failed (columns may not exist yet):', dbError.message);
    }

    const [suggestedLocations, trendingEventsResult] = await Promise.all([
      suggestedLocationsPromise,
      trendingEventsPromise,
    ]);

    let finalSuggested = suggestedLocations;
    if (finalSuggested.length === 0) {
      finalSuggested = getFallbackLocations('food', 6);
    }

    const trendingEvents = trendingEventsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      abbreviatedName: row.abbreviatedName,
      address: row.address,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      category: 'event',
      distance: parseFloat(row.distance) || 0,
      attendeeCount: parseInt(row.attendeeCount) || 0,
      imageUrl: row.eventPhoto || getCategoryImage('', row.name),
      creatorName: row.creatorName || 'A user',
      eventDate: row.event_date,
      isRealEvent: true,
    }));

    const categorySections = (await Promise.all(categoryPromises)).slice(0, 3);
    
    res.json({
      layoutOrder,
      categorySections,
      suggestedLocations: finalSuggested,
      userHangouts,
      trendingEvents,
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
        COALESCE(u.username, 'User') as username,
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
