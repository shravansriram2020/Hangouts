const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('mov', 'mp3');

// CORS middleware only needed for development tunnel connectivity
// In production, Expo builds are standalone apps that don't need Metro
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Only allow specific Expo development origins
        const allowedOrigins = [
          /^https?:\/\/localhost(:\d+)?$/,
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
          /\.exp\.direct$/,
          /\.expo\.dev$/,
        ];
        
        const origin = req.headers.origin || '';
        const isAllowed = allowedOrigins.some(pattern => 
          typeof pattern === 'string' ? origin === pattern : pattern.test(origin)
        );
        
        if (isAllowed || !origin) {
          res.setHeader('Access-Control-Allow-Origin', origin || '*');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        middleware(req, res, next);
      };
    },
  };
}

module.exports = config;
