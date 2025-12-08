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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
