const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;

if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET or SESSION_SECRET environment variable is required');
  process.exit(1);
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user is banned
    const result = await pool.query(
      'SELECT is_banned, ban_reason, ban_expires_at FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Check if user is banned and ban hasn't expired
      if (user.is_banned) {
        const now = new Date();
        if (!user.ban_expires_at || new Date(user.ban_expires_at) > now) {
          return res.status(403).json({ 
            error: 'Account suspended',
            reason: user.ban_reason || 'Your account has been suspended.',
            expiresAt: user.ban_expires_at
          });
        }
        // Ban has expired, automatically unban
        await pool.query(
          'UPDATE users SET is_banned = false, ban_reason = NULL, ban_expires_at = NULL WHERE id = $1',
          [decoded.id]
        );
      }
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

module.exports = { authenticateToken, generateToken, JWT_SECRET };
