const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const { sendPushNotification } = require('../services/pushNotifications');

// Email service for 2FA codes
const sendAdminVerificationEmail = async (email, code) => {
  const Resend = require('resend').Resend;
  const resendApiKey = process.env.VERIFIED_RESEND_KEY || process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }
  
  const resend = new Resend(resendApiKey);
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1a1a2e; margin: 0;">Hangouts Admin</h1>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
        <h2 style="color: #1a1a2e; margin: 0 0 16px;">Your verification code</h2>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #666; margin: 0;">This code expires in 10 minutes.</p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
        If you didn't request this code, please ignore this email.
      </p>
    </div>
  `;
  
  return await resend.emails.send({
    from: 'Hangouts Admin <admin@hangouts-app.com>',
    to: email,
    subject: 'Your Admin Login Code',
    html
  });
};

// Generate verification code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate session token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const result = await pool.query(
      `SELECT s.*, a.email, a.name, a.is_active 
       FROM admin_sessions s
       JOIN admin_users a ON s.admin_id = a.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    if (!result.rows[0].is_active) {
      return res.status(403).json({ error: 'Admin account is disabled' });
    }
    
    req.admin = {
      id: result.rows[0].admin_id,
      email: result.rows[0].email,
      name: result.rows[0].name
    };
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Log admin action
const logAction = async (adminId, action, targetUserId = null, details = null) => {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, action, targetUserId, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// Request login code
router.post('/login/request-code', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    // Check if admin exists
    const adminResult = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    
    if (adminResult.rows.length === 0) {
      // Don't reveal if admin exists or not
      return res.json({ message: 'If this email is registered, a code has been sent' });
    }
    
    // Generate and store code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await pool.query(
      `INSERT INTO admin_verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)`,
      [email.toLowerCase(), code, expiresAt]
    );
    
    // Send email
    await sendAdminVerificationEmail(email, code);
    
    console.log('[Admin] Verification code sent to:', email);
    res.json({ message: 'If this email is registered, a code has been sent' });
  } catch (error) {
    console.error('Request code error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify code and login
router.post('/login/verify', async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }
  
  try {
    // Verify code
    const codeResult = await pool.query(
      `SELECT * FROM admin_verification_codes 
       WHERE email = $1 AND code = $2 AND expires_at > NOW() AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase(), code]
    );
    
    if (codeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }
    
    // Mark code as used
    await pool.query(
      'UPDATE admin_verification_codes SET used = true WHERE id = $1',
      [codeResult.rows[0].id]
    );
    
    // Get admin
    const adminResult = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found' });
    }
    
    const admin = adminResult.rows[0];
    
    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await pool.query(
      `INSERT INTO admin_sessions (admin_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [admin.id, token, expiresAt]
    );
    
    await logAction(admin.id, 'login', null, { ip: req.ip });
    
    console.log('[Admin] Login successful:', admin.email);
    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Logout
router.post('/logout', authenticateAdmin, async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    await pool.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    await logAction(req.admin.id, 'logout');
    res.json({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Get current admin info
router.get('/me', authenticateAdmin, async (req, res) => {
  res.json(req.admin);
});

// Get all users (paginated)
router.get('/users', authenticateAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;
  
  try {
    let whereClause = '';
    let params = [limit, offset];
    
    if (search) {
      whereClause = `WHERE first_name ILIKE $3 OR last_name ILIKE $3 OR email ILIKE $3 OR username ILIKE $3`;
      params.push(`%${search}%`);
    }
    
    const usersResult = await pool.query(
      `SELECT id, username, email, first_name, last_name, profile_photo, 
              is_banned, ban_reason, ban_expires_at, created_at,
              (SELECT COUNT(*) FROM events WHERE host_id = users.id) as events_hosted,
              (SELECT COUNT(*) FROM event_attendees WHERE user_id = users.id) as events_attended
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    
    const countParams = search ? [`%${search}%`] : [];
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ${search ? `WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR username ILIKE $1` : ''}`,
      countParams
    );
    
    await logAction(req.admin.id, 'view_users', null, { page, search });
    
    res.json({
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user details
router.get('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, first_name, last_name, profile_photo, 
              is_banned, ban_reason, ban_expires_at, created_at,
              (SELECT COUNT(*) FROM events WHERE host_id = users.id) as events_hosted,
              (SELECT COUNT(*) FROM event_attendees WHERE user_id = users.id) as events_attended
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Ban/suspend user
router.post('/users/:id/ban', authenticateAdmin, async (req, res) => {
  const { reason, duration } = req.body; // duration in hours, null = permanent
  
  try {
    const banExpiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;
    
    await pool.query(
      `UPDATE users SET is_banned = true, ban_reason = $1, ban_expires_at = $2, banned_by = $3
       WHERE id = $4`,
      [reason || 'Violation of terms', banExpiresAt, req.admin.id, req.params.id]
    );
    
    await logAction(req.admin.id, 'ban_user', req.params.id, { reason, duration });
    
    console.log('[Admin] User banned:', req.params.id, 'by', req.admin.email);
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user
router.post('/users/:id/unban', authenticateAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET is_banned = false, ban_reason = NULL, ban_expires_at = NULL, banned_by = NULL
       WHERE id = $1`,
      [req.params.id]
    );
    
    await logAction(req.admin.id, 'unban_user', req.params.id);
    
    console.log('[Admin] User unbanned:', req.params.id, 'by', req.admin.email);
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Send push notification to all users
router.post('/broadcast', authenticateAdmin, async (req, res) => {
  const { title, message } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  
  try {
    // Get all users with push tokens
    const usersResult = await pool.query(
      `SELECT id, push_token FROM users 
       WHERE push_token IS NOT NULL AND (is_banned = false OR is_banned IS NULL)`
    );
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of usersResult.rows) {
      try {
        await sendPushNotification(user.id, title, message, { type: 'admin_broadcast' });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }
    
    await logAction(req.admin.id, 'broadcast_notification', null, { 
      title, 
      message, 
      successCount, 
      failCount 
    });
    
    console.log('[Admin] Broadcast sent by', req.admin.email, '- success:', successCount, 'fail:', failCount);
    res.json({ 
      message: 'Broadcast sent',
      successCount,
      failCount,
      totalUsers: usersResult.rows.length
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Get audit log
router.get('/audit-log', authenticateAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  try {
    const result = await pool.query(
      `SELECT l.*, a.name as admin_name, a.email as admin_email,
              u.first_name as target_first_name, u.last_name as target_last_name
       FROM admin_audit_log l
       LEFT JOIN admin_users a ON l.admin_id = a.id
       LEFT JOIN users u ON l.target_user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countResult = await pool.query('SELECT COUNT(*) FROM admin_audit_log');
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [usersResult, eventsResult, bannedResult, activeResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_banned = true'),
      pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`)
    ]);
    
    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalEvents: parseInt(eventsResult.rows[0].count),
      bannedUsers: parseInt(bannedResult.rows[0].count),
      newUsersThisWeek: parseInt(activeResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
