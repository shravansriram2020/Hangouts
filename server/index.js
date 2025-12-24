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
const adminRoutes = require('./routes/admin');
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

// Serve admin portal
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Apple App Site Association file for Universal Links
app.get('/.well-known/apple-app-site-association', (req, res) => {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: '694Y4SHTTZ.com.sdj.hangouts',
          paths: ['/share/*', '/event/*', '/invite/*']
        }
      ]
    }
  };
  res.setHeader('Content-Type', 'application/json');
  res.json(aasa);
});

// App Store ID - update this with your actual App Store ID
const APP_STORE_ID = process.env.APP_STORE_ID || 'YOUR_APP_STORE_ID';

// Universal Link fallback pages for users without the app
const generateFallbackPage = (eventId, type = 'event') => {
  const deepLink = `hangouts://event/${eventId}`;
  const appStoreUrl = `https://apps.apple.com/app/id${APP_STORE_ID}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=hangouts://event/${eventId}">
  <title>Hangouts - View Event</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #D4EDFC 0%, #A8D8F0 100%);
      padding: 20px;
    }
    .container {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 48px 32px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(30, 58, 95, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
    .logo {
      width: 100px;
      height: 100px;
      border-radius: 24px;
      margin: 0 auto 24px;
      object-fit: cover;
    }
    h1 { 
      font-size: 28px; 
      color: #1E3A5F; 
      margin-bottom: 12px; 
      font-weight: 600;
    }
    p { 
      color: #4B5563; 
      margin-bottom: 32px; 
      line-height: 1.6;
      font-weight: 400;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      margin-bottom: 12px;
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: 'Prompt', sans-serif;
    }
    .btn:hover { 
      transform: scale(1.02); 
      box-shadow: 0 8px 24px rgba(30, 58, 95, 0.2);
    }
    .btn-primary {
      background: #1E3A5F;
      color: white;
    }
    .btn-secondary {
      background: rgba(30, 58, 95, 0.1);
      color: #1E3A5F;
    }
    .footer { 
      margin-top: 24px; 
      font-size: 12px; 
      color: #6B7280; 
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/public/logo.png" alt="Hangouts" class="logo">
    <h1>You've been invited!</h1>
    <p>Someone shared a hangout with you. Open the Hangouts app to view the details.</p>
    <a href="${deepLink}" class="btn btn-primary">Open in App</a>
    <a href="${appStoreUrl}" class="btn btn-secondary">Download Hangouts</a>
    <p class="footer">Don't have the app? Download it free from the App Store.</p>
  </div>
  <script>
    // Try to open the app automatically
    setTimeout(() => {
      window.location.href = '${deepLink}';
    }, 100);
  </script>
</body>
</html>`;
};

app.get('/share/:id', (req, res) => {
  res.send(generateFallbackPage(req.params.id, 'share'));
});

app.get('/event/:id', (req, res) => {
  res.send(generateFallbackPage(req.params.id, 'event'));
});

app.get('/invite/:id', (req, res) => {
  res.send(generateFallbackPage(req.params.id, 'invite'));
});

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
app.use('/api/admin', adminRoutes);

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
  
  res.json(checks);
});

const { sendPushNotification } = require('./services/pushNotifications');
const { sendVerificationEmail, generateVerificationCode } = require('./utils/emailService');

app.post('/api/test-email', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }
  
  try {
    console.log('[Test Email] Testing email to:', email);
    const code = generateVerificationCode();
    const result = await sendVerificationEmail(email, code);
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      emailId: result?.id
    });
  } catch (error) {
    console.error('[Test Email] Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
});

app.post('/api/test-push', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    console.log('[Test Push] Sending test push to user:', userId);
    const result = await sendPushNotification(
      userId,
      'Test Notification',
      'This is a test push notification from Hangouts!',
      { type: 'test' }
    );
    
    res.json({ 
      success: result, 
      message: result ? 'Push notification sent successfully' : 'Failed to send push notification - check server logs'
    });
  } catch (error) {
    console.error('[Test Push] Error:', error);
    res.status(500).json({ error: error.message });
  }
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
