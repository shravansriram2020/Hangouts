const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { validateImageUpload } = require('../utils/fileValidator');

const router = express.Router();

router.get('/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 1) {
    return res.json([]);
  }

  try {
    // Only search among friends - users can only invite/search friends
    const result = await pool.query(
      `SELECT u.id, u.username, u.profile_photo 
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND u.username ILIKE $2
       ORDER BY u.username ASC
       LIMIT 20`,
      [req.user.id, `%${q}%`]
    );

    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      profilePhoto: u.profile_photo,
      isFriend: true
    })));
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.profile_photo, f.created_at as friended_at
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY u.first_name ASC, u.username ASC`,
      [req.user.id]
    );

    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      firstName: u.first_name,
      profilePhoto: u.profile_photo,
      friendedAt: u.friended_at
    })));
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// Add friend
router.post('/friends/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot add yourself as friend' });
  }

  try {
    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add friend (ignore if already exists)
    await pool.query(
      `INSERT INTO friends (user_id, friend_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [req.user.id, userId]
    );

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// Remove friend
router.delete('/friends/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    await pool.query(
      'DELETE FROM friends WHERE user_id = $1 AND friend_id = $2',
      [req.user.id, userId]
    );

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { username, firstName, lastName, profilePhoto, locationEnabled, exploreVisibility } = req.body;

  try {
    const currentUser = await pool.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [req.user.id]
    );
    const currentPhoto = currentUser.rows[0]?.profile_photo;

    if (profilePhoto && profilePhoto !== currentPhoto) {
      const validation = validateImageUpload(profilePhoto);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    if (username) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username.toLowerCase(), req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE users SET 
          username = COALESCE($1, username),
          first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          profile_photo = COALESCE($4, profile_photo),
          location_enabled = COALESCE($5, location_enabled),
          explore_visibility = COALESCE($6, explore_visibility),
          updated_at = NOW()
         WHERE id = $7
         RETURNING id, email, username, first_name, last_name, profile_photo, location_enabled, explore_visibility`,
        [username?.toLowerCase(), firstName, lastName, profilePhoto, locationEnabled, exploreVisibility, req.user.id]
      );

      if (locationEnabled === false) {
        await client.query(
          'UPDATE event_attendees SET location_sharing = false WHERE user_id = $1',
          [req.user.id]
        );
      }
      
      await client.query('COMMIT');

      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePhoto: user.profile_photo,
        locationEnabled: user.location_enabled,
        exploreVisibility: user.explore_visibility || 'public'
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/password', authenticateToken, async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.put('/tutorial-complete', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET tutorial_completed = true WHERE id = $1',
      [req.user.id]
    );
    res.json({ message: 'Tutorial marked as complete' });
  } catch (error) {
    console.error('Tutorial complete error:', error);
    res.status(500).json({ error: 'Failed to update tutorial status' });
  }
});

router.delete('/account', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ============== NEWS ENDPOINTS ==============

// Get latest news for user (not yet dismissed)
router.get('/news/latest', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.title, n.caption, n.image_url, n.published_at
       FROM news_items n
       WHERE n.is_published = true
       AND NOT EXISTS (
         SELECT 1 FROM news_dismissals d 
         WHERE d.news_id = n.id AND d.user_id = $1
       )
       ORDER BY n.published_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get latest news error:', error);
    res.status(500).json({ error: 'Failed to get news' });
  }
});

// Dismiss a news item
router.post('/news/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO news_dismissals (user_id, news_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, news_id) DO NOTHING`,
      [req.user.id, req.params.id]
    );
    
    res.json({ message: 'News dismissed' });
  } catch (error) {
    console.error('Dismiss news error:', error);
    res.status(500).json({ error: 'Failed to dismiss news' });
  }
});

module.exports = router;
