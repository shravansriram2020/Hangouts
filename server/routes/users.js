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
    const result = await pool.query(
      `SELECT id, username, profile_photo FROM users 
       WHERE username ILIKE $1 AND id != $2
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    );

    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      profilePhoto: u.profile_photo
    })));
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { username, firstName, lastName, profilePhoto, locationEnabled } = req.body;

  if (profilePhoto) {
    const validation = validateImageUpload(profilePhoto);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
  }

  try {
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
          updated_at = NOW()
         WHERE id = $6
         RETURNING id, email, username, first_name, last_name, profile_photo, location_enabled`,
        [username?.toLowerCase(), firstName, lastName, profilePhoto, locationEnabled, req.user.id]
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
        locationEnabled: user.location_enabled
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

module.exports = router;
