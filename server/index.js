require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { pool, initDb } = require('./db');

// Validate TomTom API key is not exposed client-side
if (process.env.EXPO_PUBLIC_TOMTOM_API_KEY) {
  console.error('SECURITY WARNING: TomTom API key is exposed as EXPO_PUBLIC_TOMTOM_API_KEY!');
  console.error('This key is visible to all clients. Use TOMTOM_API_KEY instead.');
  process.exit(1);
}

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
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // 5 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again in an hour.' },
  skipSuccessfulRequests: true, // Only count failed attempts
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

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // Allow embedding for mobile app
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:8081', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins list or Expo development domains
    const isAllowed = allowedOrigins.includes(origin) || 
      /\.exp\.direct$/.test(origin) ||
      /\.expo\.dev$/.test(origin) ||
      /localhost:\d+$/.test(origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

app.use(globalLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/money', moneyRoutes);
app.use('/api/messages', messageLimiter, messagesRoutes);
app.use('/api/photos', photosRoutes);
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
        .url { 
          background: #f0f0f5; 
          padding: 12px; 
          border-radius: 8px; 
          font-family: monospace;
          font-size: 12px;
          word-break: break-all;
          margin: 16px 0;
        }
        .cta {
          background: #7C3AED;
          color: white;
          padding: 14px 28px;
          border-radius: 12px;
          text-decoration: none;
          display: inline-block;
          margin-top: 16px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Hangouts API Server</h1>
        <div class="status">Running</div>
        <p>The backend API is running and ready to accept requests.</p>
        <p><strong>To use the app:</strong></p>
        <p>Open <strong>Expo Go</strong> on your mobile device and enter this URL:</p>
        <div class="url" style="background: #7C3AED; color: white; font-size: 14px; font-weight: bold;">exp://75v3xi4-anonymous-8080.exp.direct</div>
        <p style="color: #dc2626; font-weight: bold; margin-top: 20px;">DO NOT use the Replit domain URL!</p>
        <p style="font-size: 12px; color: #666;">The Replit domain is for the API only. Use the tunnel URL above for Expo Go.</p>
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
