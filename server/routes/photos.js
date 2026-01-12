const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { validateImageUpload } = require('../utils/fileValidator');
const { sendPushNotification } = require('../services/pushNotifications');

const router = express.Router();

router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    console.log('[Photos] Fetching photos for event:', req.params.eventId);
    const result = await pool.query(
      `SELECT ep.*, ep.uploader_id as user_id, ep.share_to_explore, ep.moderation_status, u.username, u.profile_photo
       FROM event_photos ep
       JOIN users u ON ep.uploader_id = u.id
       WHERE ep.event_id = $1
       ORDER BY ep.created_at DESC`,
      [req.params.eventId]
    );
    console.log('[Photos] Found', result.rows.length, 'photos');

    res.json(result.rows);
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { eventId, photoUrl } = req.body;

  if (!photoUrl) {
    return res.status(400).json({ error: 'No photo provided' });
  }

  const validation = validateImageUpload(photoUrl);
  if (!validation.valid) {
    console.log('[Photos] Upload validation failed:', validation.error);
    return res.status(400).json({ error: validation.error });
  }

  if (validation.isRemoteUrl) {
    console.log('[Photos] Remote URL provided, skipping content validation');
  } else {
    console.log('[Photos] Upload validated - type:', validation.mimeType, 'size:', Math.round(validation.estimatedSize / 1024), 'KB');
  }

  try {
    const result = await pool.query(
      `INSERT INTO event_photos (event_id, uploader_id, photo_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [eventId, req.user.id, photoUrl]
    );

    const photoWithUser = await pool.query(
      `SELECT ep.*, u.username, u.profile_photo
       FROM event_photos ep
       JOIN users u ON ep.uploader_id = u.id
       WHERE ep.id = $1`,
      [result.rows[0].id]
    );

    // Notify other attendees about the new photo
    const userResult = await pool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [eventId]
    );
    const attendees = await pool.query(
      'SELECT user_id FROM event_attendees WHERE event_id = $1 AND user_id != $2',
      [eventId, req.user.id]
    );

    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'photo', 'New Photo Added', $2, $3)`,
        [attendee.user_id, `${userResult.rows[0].first_name} added a photo to ${eventResult.rows[0].title}`, eventId]
      );
      sendPushNotification(
        attendee.user_id,
        'New Photo Added',
        `${userResult.rows[0].first_name} added a photo to ${eventResult.rows[0].title}`,
        { type: 'photo', eventId }
      ).catch(console.error);
    }

    res.status(201).json(photoWithUser.rows[0]);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

router.post('/batch', authenticateToken, async (req, res) => {
  const { eventId, photoUrls } = req.body;

  if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return res.status(400).json({ error: 'No photos provided' });
  }

  try {
    const uploadedPhotos = [];
    const failedCount = [];
    
    for (let i = 0; i < photoUrls.length; i++) {
      const photoUrl = photoUrls[i];
      const validation = validateImageUpload(photoUrl);
      if (!validation.valid) {
        console.log('[Photos] Batch upload validation failed for photo', i, ':', validation.error);
        failedCount.push({ index: i, error: validation.error });
        continue;
      }

      const result = await pool.query(
        `INSERT INTO event_photos (event_id, uploader_id, photo_url)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [eventId, req.user.id, photoUrl]
      );

      const photoWithUser = await pool.query(
        `SELECT ep.*, u.first_name, u.profile_photo
         FROM event_photos ep
         JOIN users u ON ep.uploader_id = u.id
         WHERE ep.id = $1`,
        [result.rows[0].id]
      );

      uploadedPhotos.push(photoWithUser.rows[0]);
    }

    if (uploadedPhotos.length === 0) {
      return res.status(400).json({ error: 'No valid photos uploaded', failed: failedCount });
    }

    const userResult = await pool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const eventResult = await pool.query(
      'SELECT title FROM events WHERE id = $1',
      [eventId]
    );
    const attendees = await pool.query(
      'SELECT user_id FROM event_attendees WHERE event_id = $1 AND user_id != $2',
      [eventId, req.user.id]
    );

    const photoCount = uploadedPhotos.length;
    const photoText = photoCount === 1 ? 'photo' : 'photos';
    const message = `${userResult.rows[0].first_name} added ${photoCount} ${photoText} to ${eventResult.rows[0].title}`;

    for (const attendee of attendees.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, event_id)
         VALUES ($1, 'photo', 'New Photos Added', $2, $3)`,
        [attendee.user_id, message, eventId]
      );
      sendPushNotification(
        attendee.user_id,
        'New Photos Added',
        message,
        { type: 'photo', eventId }
      ).catch(console.error);
    }

    res.status(201).json({ 
      uploaded: uploadedPhotos, 
      uploadedCount: uploadedPhotos.length,
      failed: failedCount,
      failedCount: failedCount.length 
    });
  } catch (error) {
    console.error('Batch upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

router.patch('/:id/share', authenticateToken, async (req, res) => {
  const { share_to_explore } = req.body;
  
  try {
    // Get the photo and its associated event
    const photoResult = await pool.query(
      `SELECT ep.*, e.location_name, e.location_address
       FROM event_photos ep
       JOIN events e ON ep.event_id = e.id
       WHERE ep.id = $1`,
      [req.params.id]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = photoResult.rows[0];

    // If trying to share, validate location is not a house/residential address
    if (share_to_explore) {
      const locationName = photo.location_name?.toLowerCase() || '';
      const locationAddress = photo.location_address?.toLowerCase() || '';
      
      // Check if this looks like a residential address (no business name)
      const hasBusinessName = photo.location_name && photo.location_name.trim().length > 0;
      
      // Residential indicators - addresses that are just street addresses without business names
      const residentialPatterns = [
        /^\d+\s+[a-z]/i,  // Starts with house number like "123 Main St"
        /home|house|residence|apartment|apt|condo|unit\s*#?\d/i,
        /my\s+(place|house|home|apartment)/i
      ];
      
      // Check if location name looks residential
      const looksResidential = !hasBusinessName || 
        residentialPatterns.some(pattern => pattern.test(locationName));
      
      // Business indicators that override residential detection
      const businessIndicators = [
        /restaurant|cafe|bar|grill|bistro|diner|eatery|kitchen|bakery/i,
        /park|recreation|sports|arena|stadium|field|court|gym|fitness/i,
        /theater|theatre|cinema|museum|gallery|library/i,
        /mall|plaza|center|centre|shop|store|market/i,
        /hotel|inn|resort|lodge|motel/i,
        /club|lounge|pub|tavern|brewery|winery/i,
        /beach|lake|river|mountain|trail|garden|zoo|aquarium/i,
        /bowling|golf|skating|swimming|pool/i,
        /entertainment|amusement|arcade|gaming/i
      ];
      
      const isLikelyBusiness = businessIndicators.some(pattern => 
        pattern.test(locationName) || pattern.test(locationAddress)
      );
      
      if (looksResidential && !isLikelyBusiness) {
        return res.status(400).json({ 
          error: 'Cannot share photos from private addresses to Explore. Only photos from businesses and public venues can be shared.' 
        });
      }
    }

    const result = await pool.query(
      `UPDATE event_photos 
       SET share_to_explore = $1, 
           moderation_status = $2
       WHERE id = $3
       RETURNING *`,
      [share_to_explore, share_to_explore ? 'pending' : null, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update share preference error:', error);
    res.status(500).json({ error: 'Failed to update share preference' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM event_photos WHERE id = $1 AND uploader_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
