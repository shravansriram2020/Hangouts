# Hangouts - Event Planning & Coordination App

## Overview

Hangouts is a mobile-first social event planning application built with React Native and Expo. The app enables users to create, coordinate, and manage social gatherings with friends. Key features include event creation with location services, real-time messaging, ride coordination, expense splitting, live location sharing, conflict resolution through voting, and ephemeral photo sharing.

The application targets iOS, Android, and web platforms using Expo's universal app capabilities, with a focus on real-time collaboration and location-based features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing:**
- Built with React Native 0.81.4 and Expo SDK 54
- File-based routing using Expo Router 6.0 for navigation
- Main entry point: `app/index.tsx` handles authentication flow and conditionally renders SignIn, SignUp, Tutorial, or Home screens
- Dynamic routes for event details: `app/event/[id].tsx`
- Non-route files (screens, components) are placed outside the `app/` directory to prevent Metro from treating them as routes

**Project Structure:**
```
app/                    # Expo Router routes only
  _layout.tsx           # Root layout with AuthProvider and fonts
  index.tsx             # Main entry point (auth flow)
  event/[id].tsx        # Dynamic event detail route
src/                    # Application code
  screens/              # All screen components
  components/           # Reusable UI components
context/                # React Context providers
services/               # API service layer
constants/              # Theme, colors, fonts
server/                 # Express.js backend
```

**State Management:**
- React Context API for global authentication state (`context/AuthContext.tsx`)
- Local component state with React hooks for UI state
- AsyncStorage for persistent token and user data storage

**UI Components:**
- Custom component library in `src/components/` for modular, reusable UI elements
- Modal-based architecture for secondary flows (Settings, Notifications, Create Event, Rides, Money, Conflicts, Notes, Share)
- Tab-based navigation within event details (Details, Messages, Map, Photos)
- Theme system defined in `constants/theme.ts` with consistent colors, fonts (Prompt family), and shadows

**Design Decisions:**
- Linear gradients for visual appeal (expo-linear-gradient)
- Blur effects for depth (expo-blur)
- Custom font loading with Google Fonts (Prompt)
- Haptic feedback for iOS interactions
- Responsive design with device dimension calculations

### Backend Architecture

**Server Framework:**
- Express.js 5.1.0 server (`server/index.js`)
- RESTful API design with route-based organization
- Middleware-based authentication using JWT tokens
- CORS enabled for cross-origin requests

**API Structure:**
Routes organized by domain:
- `/api/auth` - Authentication (signup, signin)
- `/api/users` - User management and search
- `/api/events` - Event CRUD operations
- `/api/rides` - Ride coordination
- `/api/money` - Expense tracking and splitting
- `/api/messages` - Event messaging with suggestion detection
- `/api/photos` - Ephemeral photo sharing
- `/api/notifications` - Push-style notifications
- `/api/conflicts` - Conflict reporting and voting
- `/api/location` - Location services and search

**Authentication & Authorization:**
- JWT-based token authentication with 30-day expiration
- bcryptjs for password hashing (10 salt rounds)
- Token stored in AsyncStorage on client
- Middleware function (`authenticateToken`) protects all non-auth routes
- User identity attached to requests via decoded JWT payload

**Rationale:** JWT chosen for stateless authentication, scalability, and mobile-friendly architecture. No session storage required on backend.

### Data Storage

**Database:**
- PostgreSQL (via `pg` library v8.16.3)
- Connection pool management for efficient resource usage
- Database initialization script in `server/db.js` creates schema on startup

**Schema Design:**
Key tables include:
- `users` - User accounts with profile data, location preferences, tutorial completion tracking
- `events` - Event details with host, datetime, location (lat/lng), styling (gradient colors), notes
- `event_attendees` - Many-to-many relationship with invitation status tracking
- `rides` - Ride offers with driver, capacity, pickup location, directional availability
- `ride_passengers` - Ride participation tracking
- `money_requests` - Expense tracking between users
- `messages` - Event chat with AI-detected time/location suggestions
- `event_photos` - Temporary photo storage with expiration timestamps
- `notifications` - User notifications with read status
- `conflicts` - User-reported scheduling/location conflicts
- `conflict_votes` - Democratic voting on conflict resolutions

**Design Decisions:**
- UUID primary keys for security and distributed system compatibility
- Timestamps (`created_at`, `updated_at`) on all major entities
- Soft deletes via boolean flags (`is_archived`, `is_cancelled`, `is_cleared`, `is_resolved`)
- JSON aggregation in queries to reduce API round-trips
- Referential integrity with foreign keys and CASCADE deletes

**Alternatives Considered:** 
Document databases (MongoDB) were considered but relational model chosen for complex queries involving joins (events with attendees, rides with passengers, etc.) and transaction support for money tracking.

### External Dependencies

**Location Services:**
- TomTom Maps API for location search and POI suggestions
- expo-location for device GPS access and real-time location updates
- react-native-maps for map visualization
- Location permissions: "Always and When in Use" for friend location sharing

**Image Handling:**
- expo-image-picker for photo selection from device library
- multer (v2.0.2) on backend for multipart form uploads
- Base64 encoding for image transmission
- Image storage strategy not explicitly defined (likely cloud storage integration point)

**Authentication & Storage:**
- jsonwebtoken (v9.0.2) for JWT generation and verification
- @react-native-async-storage/async-storage for client-side persistence
- No explicit OAuth providers integrated (future enhancement opportunity)

**UI Libraries:**
- @expo/vector-icons for iconography (Ionicons)
- expo-linear-gradient for visual design
- expo-blur for glassmorphism effects
- @react-navigation for navigation primitives
- react-native-gesture-handler and react-native-reanimated for animations

**Development Tools:**
- TypeScript for type safety
- ESLint with Expo configuration
- dotenv for environment variable management
- Environment variables: DATABASE_URL, JWT_SECRET, TOMTOM_API_KEY, EXPO_PUBLIC_API_URL, EXPO_PUBLIC_TERMS_URL, EXPO_PUBLIC_PRIVACY_URL

**Pros of Current Stack:**
- Expo provides unified development experience across platforms
- PostgreSQL offers reliability and complex query support
- JWT enables stateless, scalable authentication
- TomTom provides comprehensive location services

**Cons & Considerations:**
- No real-time WebSocket implementation (polling used for messages/locations at 5-10 second intervals)
- Image storage strategy undefined (scalability concern)
- No explicit error tracking service (Sentry, etc.)
- Manual SQL queries (no ORM) increases development time but provides query optimization control