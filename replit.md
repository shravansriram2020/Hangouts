# Hangouts - Event Planning & Coordination App

## Overview

Hangouts is a mobile-first social event planning application built with React Native and Expo. Its core purpose is to enable users to create, coordinate, and manage social gatherings efficiently. Key capabilities include event creation with integrated location services, real-time messaging, ride coordination, expense splitting, live location sharing, conflict resolution through voting, and ephemeral photo sharing. The project aims to provide a real-time, collaborative experience across iOS, Android, and web platforms, leveraging location-based functionalities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing:**
- React Native 0.81.4 and Expo SDK 54.
- File-based routing with Expo Router 6.0 for navigation, separating routes (`app/`) from components (`src/`).
- Root layout (`app/_layout.tsx`) handles authentication and font loading.
- Dynamic routing for event details (`app/event/[id].tsx`) with tab-based navigation.

**State Management:**
- React Context API for global authentication (`context/AuthContext.tsx`).
- Local component state with React hooks.
- AsyncStorage for persistent user data and tokens.

**UI Components & Design:**
- Custom component library (`src/components/`) for modularity.
- Modal-based architecture for secondary workflows (e.g., Settings, Create Event).
- Tab-based navigation within event details.
- Consistent theme (`constants/theme.ts`) with brand colors, custom fonts (Prompt family), and shadows.
- Utilizes linear gradients (`expo-linear-gradient`) and blur effects (`expo-blur`) for visual appeal.
- Haptic feedback integrated for iOS interactions.
- Responsive design considerations.
- UI/UX decisions include redesigned event details, updated card visuals, two-tab share modal, brand-colored loading dots, avatar-inclusive messages, snappy modal animations, haptic feedback on navigation, and dynamic date box colors.
- Smart Location Suggestions feature a glassmorphism modal with a mile radius slider, AI-based suggestions, and expanded category support, leveraging a multi-layer search strategy for accuracy.
- Map features use `react-native-maps` (lazy-loaded) with a static TomTom image fallback, custom user markers, route polylines, and real-time location tracking.

### Backend Architecture

**Server Framework:**
- Express.js 5.1.0 (`server/index.js`) implementing a RESTful API.
- Middleware for JWT-based authentication and CORS.

**API Structure:**
- Routes organized by domain: `/api/auth`, `/api/users`, `/api/events`, `/api/rides`, `/api/money`, `/api/messages`, `/api/photos`, `/api/notifications`, `/api/conflicts`, `/api/location`.

**Authentication & Authorization:**
- JWT-based authentication (30-day expiry) with `bcryptjs` for password hashing.
- Stateless authentication suitable for mobile and scalability.

### Data Storage

**Database:**
- PostgreSQL via `pg` library.
- Schema initialized on startup, utilizing connection pooling.

**Schema Design:**
- Key tables: `users`, `events`, `event_attendees`, `rides`, `ride_passengers`, `money_requests`, `messages`, `event_photos`, `notifications`, `conflicts`, `conflict_votes`.
- UUID primary keys, timestamps, and soft deletes.
- Relational model chosen for complex queries and transaction support.

### Security & Performance

- **Helmet Security Headers**: CSP, HSTS (1 year), X-Frame-Options, Referrer-Policy, X-Content-Type-Options
- **CORS Hardening**: Whitelist-based CORS with ALLOWED_ORIGINS env var support
- **Auth Rate Limiting**: 5 attempts per hour with skipSuccessfulRequests (prevents brute-force)
- **Input Sanitization**: Gradient colors validated to hex pattern before storage (prevents XSS)
- **API Key Protection**: Server exits if EXPO_PUBLIC_TOMTOM_API_KEY is detected (prevents client exposure)
- TomTom API keys and sensitive data are server-side secrets, not exposed to the frontend
- All location features are proxied through backend endpoints
- Rate limiting implemented for global, authentication, messages, and location endpoints
- Server-side enforcement for location privacy, including transactional cleanup of location data when disabled
- **Photo Cleanup Endpoint**: POST /api/photos/cleanup with CLEANUP_SECRET_KEY header for cron-based ephemeral photo deletion

## External Dependencies

**Location Services:**
- TomTom Maps API: For location search, POI suggestions, and map visualization.
- `expo-location`: For device GPS access and real-time location updates.
- OpenStreetMap Nominatim API: For location search.

**Image Handling:**
- `expo-image-picker`: For photo selection.
- `multer`: For multipart form uploads on the backend.

**Authentication & Storage:**
- `jsonwebtoken`: For JWT generation and verification.
- `@react-native-async-storage/async-storage`: For client-side persistence.

**UI Libraries:**
- `@expo/vector-icons`: For iconography.
- `expo-linear-gradient`: For visual design.
- `expo-blur`: For glassmorphism effects.
- `@react-navigation`: For navigation primitives.
- `react-native-gesture-handler`, `react-native-reanimated`: For animations.
- `react-native-maps`: For native map rendering.

**Development Tools:**
- TypeScript: For type safety.
- ESLint: For code quality.
- `dotenv`: For environment variable management.