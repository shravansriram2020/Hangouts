const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { sendPushNotification } = require('../services/pushNotifications');

// Create admin uploads directories
const adminUploadsDir = path.join(__dirname, '../uploads/admin');
const newsUploadsDir = path.join(adminUploadsDir, 'news');
const emailUploadsDir = path.join(adminUploadsDir, 'email');

[adminUploadsDir, newsUploadsDir, emailUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer storage configuration for admin uploads
const adminStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.uploadType || 'news';
    const dir = type === 'email' ? emailUploadsDir : newsUploadsDir;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

const adminUpload = multer({
  storage: adminStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
  }
});

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

// Send ban notification email
const sendBanNotificationEmail = async (email, firstName, reason, banExpiresAt) => {
  const Resend = require('resend').Resend;
  const resendApiKey = process.env.VERIFIED_RESEND_KEY || process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }
  
  const resend = new Resend(resendApiKey);
  
  const expirationText = banExpiresAt 
    ? `Your suspension will be lifted on <strong>${new Date(banExpiresAt).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })}</strong>.`
    : 'This suspension is <strong>permanent</strong>.';
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <img src="https://hangouts-app.com/logo.png" alt="Hangouts" style="width: 120px; height: auto;">
      </div>
      <div style="background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 12px; padding: 32px;">
        <h2 style="color: #c62828; margin: 0 0 16px;">Account Suspended</h2>
        <p style="color: #333; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; line-height: 1.6;">
          Your Hangouts account has been suspended due to a violation of our community guidelines.
        </p>
        <div style="background: #fff; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 8px; font-size: 14px;"><strong>Reason:</strong></p>
          <p style="color: #333; margin: 0;">${reason || 'Violation of community guidelines'}</p>
        </div>
        <p style="color: #333; line-height: 1.6;">
          ${expirationText}
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          If you believe this was a mistake, please contact our support team.
        </p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
        &copy; ${new Date().getFullYear()} Hangouts. All rights reserved.
      </p>
    </div>
  `;
  
  return await resend.emails.send({
    from: 'Hangouts <noreply@hangouts-app.com>',
    to: email,
    subject: 'Your Hangouts Account Has Been Suspended',
    html
  });
};

// Send broadcast email to users
const sendBroadcastEmail = async (email, firstName, subject, htmlContent) => {
  const Resend = require('resend').Resend;
  const resendApiKey = process.env.VERIFIED_RESEND_KEY || process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }
  
  const resend = new Resend(resendApiKey);
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <img src="https://hangouts-app.com/logo.png" alt="Hangouts" style="width: 120px; height: auto;">
      </div>
      <div style="background: #ffffff; border-radius: 12px; padding: 32px;">
        <p style="color: #333; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <div style="color: #333; line-height: 1.8;">
          ${htmlContent}
        </div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
        &copy; ${new Date().getFullYear()} Hangouts. All rights reserved.
      </p>
    </div>
  `;
  
  return await resend.emails.send({
    from: 'Hangouts <noreply@hangouts-app.com>',
    to: email,
    subject,
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

// Hardcoded whitelist of allowed admin emails - NEVER remove this check
const ALLOWED_ADMIN_EMAILS = [
  'kermanjude@gmail.com',
  'shravan.sriram2020@gmail.com',
  'deva.avk@gmail.com'
];

// Request login code
router.post('/login/request-code', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // SECURITY: Check hardcoded whitelist first
  if (!ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())) {
    // Don't reveal if email is not whitelisted
    return res.json({ message: 'If this email is registered, a code has been sent' });
  }
  
  try {
    // Check if admin exists in database
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
    const isPermanent = !duration;
    
    // Get user details for email
    const userResult = await pool.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [req.params.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Send ban notification email first (before potential deletion)
    if (user.email && user.email.includes('@')) {
      try {
        await sendBanNotificationEmail(user.email, user.first_name, reason || 'Violation of community guidelines', banExpiresAt);
        console.log('[Admin] Ban notification email sent to:', user.email);
      } catch (emailError) {
        console.error('[Admin] Failed to send ban notification email:', emailError);
      }
    } else {
      console.log('[Admin] User has no valid email, skipping ban notification');
    }
    
    if (isPermanent) {
      // For permanent bans: block email and delete account
      console.log('[Admin] Permanent ban - blocking email and deleting account for:', user.email);
      
      // Block the email from future signups
      if (user.email && user.email.includes('@')) {
        await pool.query(
          `INSERT INTO blocked_emails (email, reason, blocked_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET reason = $2, blocked_by = $3, blocked_at = NOW()`,
          [user.email.toLowerCase(), reason || 'Permanently banned for violation of terms', req.admin.id]
        );
        console.log('[Admin] Email blocked:', user.email);
      }
      
      // Log the action before deleting (preserve user ID reference)
      await logAction(req.admin.id, 'permanent_ban_delete_user', req.params.id, { 
        reason, 
        email: user.email,
        firstName: user.first_name 
      });
      
      // Delete the user account (cascades to related data)
      await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      
      console.log('[Admin] User permanently banned and deleted:', req.params.id, 'by', req.admin.email);
      res.json({ message: 'User permanently banned. Account deleted and email blocked from future signups.' });
    } else {
      // For temporary bans: just suspend the account
      await pool.query(
        `UPDATE users SET is_banned = true, ban_reason = $1, ban_expires_at = $2, banned_by = $3
         WHERE id = $4`,
        [reason || 'Violation of terms', banExpiresAt, req.admin.id, req.params.id]
      );
      
      await logAction(req.admin.id, 'ban_user', req.params.id, { reason, duration });
      
      console.log('[Admin] User temporarily banned:', req.params.id, 'by', req.admin.email);
      res.json({ message: 'User banned successfully' });
    }
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
    // Get ALL active users (not just those with push tokens)
    const allUsersResult = await pool.query(
      `SELECT id FROM users WHERE (is_banned = false OR is_banned IS NULL)`
    );
    
    // Create in-app notifications for ALL users so they can view/dismiss in the app
    let inAppCount = 0;
    for (const user of allUsersResult.rows) {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, 'admin_broadcast', $2, $3)`,
          [user.id, title, message]
        );
        inAppCount++;
      } catch (error) {
        console.error('Failed to create in-app notification for user:', user.id, error.message);
      }
    }
    
    // Get users with push tokens for push notifications
    const pushUsersResult = await pool.query(
      `SELECT id, push_token FROM users 
       WHERE push_token IS NOT NULL AND (is_banned = false OR is_banned IS NULL)`
    );
    
    let pushSuccessCount = 0;
    let pushFailCount = 0;
    
    for (const user of pushUsersResult.rows) {
      try {
        await sendPushNotification(user.id, title, message, { type: 'admin_broadcast' });
        pushSuccessCount++;
      } catch (error) {
        pushFailCount++;
      }
    }
    
    await logAction(req.admin.id, 'broadcast_notification', null, { 
      title, 
      message, 
      inAppCount,
      pushSuccessCount, 
      pushFailCount 
    });
    
    console.log('[Admin] Broadcast sent by', req.admin.email, '- in-app:', inAppCount, '- push success:', pushSuccessCount, 'fail:', pushFailCount);
    res.json({ 
      message: 'Broadcast sent',
      inAppNotifications: inAppCount,
      pushSuccessCount,
      pushFailCount,
      totalUsers: allUsersResult.rows.length
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Send email to all users
router.post('/broadcast-email', authenticateAdmin, async (req, res) => {
  const { subject, htmlContent } = req.body;
  
  if (!subject || !htmlContent) {
    return res.status(400).json({ error: 'Subject and content are required' });
  }
  
  try {
    // Get all users with valid email addresses (exclude banned users)
    const usersResult = await pool.query(
      `SELECT id, email, first_name FROM users 
       WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
       AND (is_banned = false OR is_banned IS NULL)`
    );
    
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    // Filter to only valid emails
    const validUsers = usersResult.rows.filter(user => user.email && user.email.includes('@'));
    skippedCount = usersResult.rows.length - validUsers.length;
    
    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    const delayMs = 1000; // 1 second between batches
    
    for (let i = 0; i < validUsers.length; i += batchSize) {
      const batch = validUsers.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (user) => {
        try {
          await sendBroadcastEmail(user.email, user.first_name, subject, htmlContent);
          successCount++;
        } catch (error) {
          failCount++;
          errors.push({ email: user.email, error: error.message });
        }
      }));
      
      // Wait between batches if not the last batch
      if (i + batchSize < validUsers.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    await logAction(req.admin.id, 'broadcast_email', null, { 
      subject, 
      successCount, 
      failCount 
    });
    
    console.log('[Admin] Email broadcast sent by', req.admin.email, '- success:', successCount, 'fail:', failCount);
    res.json({ 
      message: 'Email broadcast sent',
      successCount,
      failCount,
      totalUsers: validUsers.length,
      errors: failCount > 0 ? errors.slice(0, 10) : []
    });
  } catch (error) {
    console.error('Email broadcast error:', error);
    res.status(500).json({ error: 'Failed to send email broadcast' });
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

// Get email list for export
router.get('/email-list', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT email FROM users WHERE is_banned = false AND email IS NOT NULL ORDER BY created_at DESC`
    );
    
    const emails = result.rows.map(row => row.email);
    
    res.json({
      emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Get email list error:', error);
    res.status(500).json({ error: 'Failed to get email list' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [
      usersResult, 
      eventsResult, 
      bannedResult, 
      newUsersWeekResult,
      newUsersMonthResult,
      activeEventsResult,
      messagesResult,
      photosResult,
      usersWithPushResult,
      // Retention metrics
      day1Retention,
      day7Retention,
      day30Retention,
      // Growth over time
      userGrowth,
      eventGrowth
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_banned = true'),
      pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) FROM events WHERE is_archived = false`),
      pool.query('SELECT COUNT(*) FROM messages'),
      pool.query('SELECT COUNT(*) FROM event_photos'),
      pool.query('SELECT COUNT(*) FROM users WHERE push_token IS NOT NULL'),
      // Day 1 retention: users who created an event or attended one within 1 day of signup
      pool.query(`
        SELECT COUNT(DISTINCT u.id) FROM users u
        WHERE u.created_at > NOW() - INTERVAL '30 days'
        AND (
          EXISTS (SELECT 1 FROM events e WHERE e.host_id = u.id AND e.created_at <= u.created_at + INTERVAL '1 day')
          OR EXISTS (SELECT 1 FROM event_attendees ea WHERE ea.user_id = u.id AND ea.joined_at <= u.created_at + INTERVAL '1 day')
        )
      `),
      // Day 7 retention
      pool.query(`
        SELECT COUNT(DISTINCT u.id) FROM users u
        WHERE u.created_at > NOW() - INTERVAL '60 days' AND u.created_at < NOW() - INTERVAL '7 days'
        AND (
          EXISTS (SELECT 1 FROM events e WHERE e.host_id = u.id AND e.created_at > u.created_at + INTERVAL '7 days')
          OR EXISTS (SELECT 1 FROM event_attendees ea WHERE ea.user_id = u.id AND ea.joined_at > u.created_at + INTERVAL '7 days')
          OR EXISTS (SELECT 1 FROM messages m WHERE m.user_id = u.id AND m.created_at > u.created_at + INTERVAL '7 days')
        )
      `),
      // Day 30 retention
      pool.query(`
        SELECT COUNT(DISTINCT u.id) FROM users u
        WHERE u.created_at > NOW() - INTERVAL '90 days' AND u.created_at < NOW() - INTERVAL '30 days'
        AND (
          EXISTS (SELECT 1 FROM events e WHERE e.host_id = u.id AND e.created_at > u.created_at + INTERVAL '30 days')
          OR EXISTS (SELECT 1 FROM event_attendees ea WHERE ea.user_id = u.id AND ea.joined_at > u.created_at + INTERVAL '30 days')
          OR EXISTS (SELECT 1 FROM messages m WHERE m.user_id = u.id AND m.created_at > u.created_at + INTERVAL '30 days')
        )
      `),
      // User growth by week (last 8 weeks)
      pool.query(`
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as count
        FROM users
        WHERE created_at > NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
      `),
      // Event growth by week (last 8 weeks)
      pool.query(`
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as count
        FROM events
        WHERE created_at > NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
      `)
    ]);
    
    // Calculate retention percentages
    const totalUsersLast30Days = parseInt(newUsersMonthResult.rows[0].count) || 1;
    const eligibleFor7Day = await pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '7 days'`);
    const eligibleFor30Day = await pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '90 days' AND created_at < NOW() - INTERVAL '30 days'`);
    
    const day1RetentionRate = totalUsersLast30Days > 0 
      ? Math.round((parseInt(day1Retention.rows[0].count) / totalUsersLast30Days) * 100) 
      : 0;
    const day7RetentionRate = parseInt(eligibleFor7Day.rows[0].count) > 0 
      ? Math.round((parseInt(day7Retention.rows[0].count) / parseInt(eligibleFor7Day.rows[0].count)) * 100) 
      : 0;
    const day30RetentionRate = parseInt(eligibleFor30Day.rows[0].count) > 0 
      ? Math.round((parseInt(day30Retention.rows[0].count) / parseInt(eligibleFor30Day.rows[0].count)) * 100) 
      : 0;
    
    res.json({
      // Basic stats
      totalUsers: parseInt(usersResult.rows[0].count),
      totalEvents: parseInt(eventsResult.rows[0].count),
      activeEvents: parseInt(activeEventsResult.rows[0].count),
      bannedUsers: parseInt(bannedResult.rows[0].count),
      totalMessages: parseInt(messagesResult.rows[0].count),
      totalPhotos: parseInt(photosResult.rows[0].count),
      usersWithPush: parseInt(usersWithPushResult.rows[0].count),
      
      // Growth
      newUsersThisWeek: parseInt(newUsersWeekResult.rows[0].count),
      newUsersThisMonth: parseInt(newUsersMonthResult.rows[0].count),
      
      // Retention
      retention: {
        day1: day1RetentionRate,
        day7: day7RetentionRate,
        day30: day30RetentionRate
      },
      
      // Growth charts
      userGrowth: userGrowth.rows.map(r => ({
        week: r.week,
        count: parseInt(r.count)
      })),
      eventGrowth: eventGrowth.rows.map(r => ({
        week: r.week,
        count: parseInt(r.count)
      }))
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============== NEWS MANAGEMENT ==============

// Get all news items (admin)
router.get('/news', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, a.name as created_by_name
       FROM news_items n
       LEFT JOIN admin_users a ON n.created_by = a.id
       ORDER BY n.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ error: 'Failed to get news items' });
  }
});

// Create news item
router.post('/news', authenticateAdmin, async (req, res) => {
  const { title, caption, imageUrl } = req.body;
  
  if (!caption) {
    return res.status(400).json({ error: 'Caption is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO news_items (title, caption, image_url, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title || null, caption, imageUrl || null, req.admin.id]
    );
    
    await logAction(req.admin.id, 'create_news', null, { newsId: result.rows[0].id, title });
    
    console.log('[Admin] News item created by', req.admin.email);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({ error: 'Failed to create news item' });
  }
});

// Update news item
router.put('/news/:id', authenticateAdmin, async (req, res) => {
  const { title, caption, imageUrl } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE news_items 
       SET title = $1, caption = $2, image_url = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title || null, caption, imageUrl || null, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News item not found' });
    }
    
    await logAction(req.admin.id, 'update_news', null, { newsId: req.params.id });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({ error: 'Failed to update news item' });
  }
});

// Publish/unpublish news item
router.post('/news/:id/publish', authenticateAdmin, async (req, res) => {
  const { publish } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE news_items 
       SET is_published = $1, published_at = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [publish, publish ? new Date() : null, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News item not found' });
    }
    
    await logAction(req.admin.id, publish ? 'publish_news' : 'unpublish_news', null, { newsId: req.params.id });
    
    console.log('[Admin] News item', publish ? 'published' : 'unpublished', 'by', req.admin.email);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Publish news error:', error);
    res.status(500).json({ error: 'Failed to update news item' });
  }
});

// Delete news item
router.delete('/news/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM news_items WHERE id = $1', [req.params.id]);
    
    await logAction(req.admin.id, 'delete_news', null, { newsId: req.params.id });
    
    console.log('[Admin] News item deleted by', req.admin.email);
    res.json({ message: 'News item deleted' });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({ error: 'Failed to delete news item' });
  }
});

// Upload image for news
router.post('/upload/news', authenticateAdmin, (req, res, next) => {
  req.uploadType = 'news';
  next();
}, adminUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    // Remove /api suffix from EXPO_PUBLIC_API_URL if present
    let baseUrl = process.env.EXPO_PUBLIC_API_URL || `${protocol}://${req.get('host')}`;
    baseUrl = baseUrl.replace(/\/api$/, '');
    const imageUrl = `${baseUrl}/uploads/admin/news/${req.file.filename}`;
    
    await logAction(req.admin.id, 'upload_news_image', null, { filename: req.file.filename });
    
    console.log('[Admin] News image uploaded by', req.admin.email);
    res.json({ url: imageUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Upload news image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload image for email
router.post('/upload/email', authenticateAdmin, (req, res, next) => {
  req.uploadType = 'email';
  next();
}, adminUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    // Remove /api suffix from EXPO_PUBLIC_API_URL if present
    let baseUrl = process.env.EXPO_PUBLIC_API_URL || `${protocol}://${req.get('host')}`;
    baseUrl = baseUrl.replace(/\/api$/, '');
    const imageUrl = `${baseUrl}/uploads/admin/email/${req.file.filename}`;
    
    await logAction(req.admin.id, 'upload_email_image', null, { filename: req.file.filename });
    
    console.log('[Admin] Email image uploaded by', req.admin.email);
    res.json({ url: imageUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Upload email image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Explore posts management endpoints
const EXPLORE_CATEGORIES = [
  'Food & Dining',
  'Cafes & Coffee',
  'Entertainment',
  'Parks & Recreation',
  'Sports & Fitness',
  'Museums & Culture',
  'Shopping',
  'Amusement',
  'Beaches & Waterfront',
  'Live Music & Events',
  'Bowling & Arcades',
  'Spas & Wellness',
  'Golf & Country Clubs',
  'Hiking & Nature',
  'Other'
];

router.get('/photos/all', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ep.*, 
             u.first_name as uploader_name, 
             u.username,
             u.email as uploader_email,
             u.profile_photo as user_avatar,
             e.title as event_title,
             COALESCE(ep.location_name, e.location_name) as location_name,
             COALESCE(ep.location_address, e.location_address) as location_address
      FROM event_photos ep
      JOIN users u ON ep.uploader_id = u.id
      LEFT JOIN events e ON ep.event_id = e.id
      WHERE ep.share_to_explore = true
    `;
    
    const params = [];
    if (status && status !== 'all' && status !== 'approved') {
      params.push(status);
      query += ` AND ep.moderation_status = $1`;
    } else if (status === 'approved') {
      query += ` AND ep.moderation_status = 'approved'`;
    }
    
    query += ` ORDER BY ep.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all shared photos error:', error);
    res.status(500).json({ error: 'Failed to get shared photos' });
  }
});

router.patch('/photos/:id/category', authenticateAdmin, async (req, res) => {
  const { category, restore } = req.body;
  
  // Handle restore request
  if (restore) {
    try {
      const result = await pool.query(
        `UPDATE event_photos 
         SET share_to_explore = true, moderation_status = 'approved'
         WHERE id = $1
         RETURNING *`,
        [req.params.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      await logAction(req.admin.id, 'restore_explore_photo', null, { photoId: req.params.id });
      
      console.log('[Admin] Photo restored to Explore by', req.admin.email);
      return res.json(result.rows[0]);
    } catch (error) {
      console.error('Restore photo error:', error);
      return res.status(500).json({ error: 'Failed to restore photo' });
    }
  }
  
  if (!EXPLORE_CATEGORIES.includes(category)) {
    return res.status(400).json({ 
      error: 'Invalid category. Must be one of: ' + EXPLORE_CATEGORIES.join(', ')
    });
  }
  
  try {
    const result = await pool.query(
      `UPDATE event_photos 
       SET explore_category = $1
       WHERE id = $2
       RETURNING *`,
      [category, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await logAction(req.admin.id, 'update_photo_category', null, { 
      photoId: req.params.id, 
      category 
    });
    
    console.log('[Admin] Photo category updated to', category, 'by', req.admin.email);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update photo category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/photos/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE event_photos 
       SET share_to_explore = false, moderation_status = 'removed'
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await logAction(req.admin.id, 'remove_explore_photo', null, { photoId: req.params.id });
    
    console.log('[Admin] Photo removed from Explore by', req.admin.email);
    res.json({ success: true, message: 'Photo removed from Explore' });
  } catch (error) {
    console.error('Remove photo error:', error);
    res.status(500).json({ error: 'Failed to remove photo' });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

module.exports = router;
