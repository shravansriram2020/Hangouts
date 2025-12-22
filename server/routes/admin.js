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
    
    // Get user details for email
    const userResult = await pool.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [req.params.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    await pool.query(
      `UPDATE users SET is_banned = true, ban_reason = $1, ban_expires_at = $2, banned_by = $3
       WHERE id = $4`,
      [reason || 'Violation of terms', banExpiresAt, req.admin.id, req.params.id]
    );
    
    // Send ban notification email
    try {
      await sendBanNotificationEmail(user.email, user.first_name, reason || 'Violation of community guidelines', banExpiresAt);
      console.log('[Admin] Ban notification email sent to:', user.email);
    } catch (emailError) {
      console.error('[Admin] Failed to send ban notification email:', emailError);
    }
    
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

// Send email to all users
router.post('/broadcast-email', authenticateAdmin, async (req, res) => {
  const { subject, htmlContent } = req.body;
  
  if (!subject || !htmlContent) {
    return res.status(400).json({ error: 'Subject and content are required' });
  }
  
  try {
    // Get all users with email addresses (exclude banned users)
    const usersResult = await pool.query(
      `SELECT id, email, first_name FROM users 
       WHERE email IS NOT NULL AND email != '' 
       AND (is_banned = false OR is_banned IS NULL)`
    );
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    const delayMs = 1000; // 1 second between batches
    
    for (let i = 0; i < usersResult.rows.length; i += batchSize) {
      const batch = usersResult.rows.slice(i, i + batchSize);
      
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
      if (i + batchSize < usersResult.rows.length) {
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
      totalUsers: usersResult.rows.length
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

module.exports = router;
