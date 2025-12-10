require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { pool, initDb } = require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const eventsRoutes = require('./routes/events');
const ridesRoutes = require('./routes/rides');
const moneyRoutes = require('./routes/money');
const messagesRoutes = require('./routes/messages');
const photosRoutes = require('./routes/photos');
const notificationsRoutes = require('./routes/notifications');
const conflictsRoutes = require('./routes/conflicts');
const locationRoutes = require('./routes/location');
const { isResendConfigured } = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const locationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many location requests, please slow down.' },
});

const allowedOrigins = [
  process.env.EXPO_PUBLIC_API_URL,
  'https://hangouts-devteam.replit.app',
  'https://api.hangouts-app.com',
  'https://hangouts-app.com',
  /\.replit\.dev$/,
  /\.exp\.direct$/,
  /\.hangouts-app\.com$/
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) return callback(null, true);
    callback(null, true);
  },
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(globalLimiter);

app.use('/api/photos', express.json({ limit: '15mb' }), express.urlencoded({ extended: true, limit: '15mb' }), photosRoutes);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/money', moneyRoutes);
app.use('/api/messages', messageLimiter, messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/conflicts', conflictsRoutes);
app.use('/api/location', locationLimiter, locationRoutes);

app.get('/api/health', async (req, res) => {
  const resendConfigured = await isResendConfigured();
  
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apns: {
      keyId: process.env.APNS_KEY_ID ? 'configured' : 'missing',
      teamId: process.env.APNS_TEAM_ID ? 'configured' : 'missing',
      authKey: process.env.APNS_AUTH_KEY ? 'configured' : 'missing'
    },
    resend: {
      apiKey: resendConfigured ? 'configured' : 'missing'
    },
    database: 'unknown'
  };
  
  try {
    const dbResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
    const tokenResult = await pool.query('SELECT COUNT(*) as token_count FROM users WHERE push_token IS NOT NULL');
    checks.database = 'connected';
    checks.userCount = parseInt(dbResult.rows[0].user_count);
    checks.usersWithPushTokens = parseInt(tokenResult.rows[0].token_count);
  } catch (error) {
    checks.database = 'error: ' + error.message;
  }
  
  console.log('[Health Check]', JSON.stringify(checks, null, 2));
  res.json(checks);
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hangouts API</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #D4EDFC 0%, #B8E0F7 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 40px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { color: #1a1a2e; font-size: 28px; margin-bottom: 16px; }
        .status { 
          background: #22c55e; 
          color: white; 
          padding: 8px 16px; 
          border-radius: 20px; 
          display: inline-block;
          margin-bottom: 24px;
          font-size: 14px;
        }
        p { color: #4a4a6a; line-height: 1.6; margin-bottom: 16px; }
        a { color: #7C3AED; text-decoration: none; font-weight: 600; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Hangouts API Server</h1>
        <div class="status">Running</div>
        <p>Hangouts is accessible by downloading the app on iOS/Android. Visit our landing page at <a href="https://hangouts-app.com">hangouts-app.com</a></p>
      </div>
    </body>
    </html>
  `);
});

const startServer = async () => {
  try {
    console.log('='.repeat(60));
    console.log('HANGOUTS SERVER STARTING');
    console.log('='.repeat(60));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`APNs Key ID: ${process.env.APNS_KEY_ID ? 'configured' : 'MISSING'}`);
    console.log(`APNs Team ID: ${process.env.APNS_TEAM_ID ? 'configured' : 'MISSING'}`);
    console.log(`APNs Auth Key: ${process.env.APNS_AUTH_KEY ? 'configured (' + process.env.APNS_AUTH_KEY.length + ' chars)' : 'MISSING'}`);
    console.log(`Resend API Key: ${process.env.RESEND_API_KEY ? 'configured' : 'MISSING'}`);
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'configured' : 'MISSING'}`);
    console.log('='.repeat(60));
    
    await initDb();
    
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const tokenCount = await pool.query('SELECT COUNT(*) FROM users WHERE push_token IS NOT NULL');
    console.log(`Database connected - ${userCount.rows[0].count} users, ${tokenCount.rows[0].count} with push tokens`);
    console.log('='.repeat(60));
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
