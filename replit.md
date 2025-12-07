# Hangouts - Event Planning & Coordination App

## Overview

Hangouts is a mobile-first social event planning application built with React Native and Expo. The app enables users to create, coordinate, and manage social gatherings with friends. Key features include event creation with location services, real-time messaging, ride coordination, expense splitting, live location sharing, conflict resolution through voting, and ephemeral photo sharing.

The application targets iOS, Android, and web platforms using Expo's universal app capabilities, with a focus on real-time collaboration and location-based features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (December 2024)

### UI/UX Improvements
- **Event Details Page**: Redesigned with horizontal scrolling sticky notes (square, angled with random rotation), enlarged host section with name beside avatar, and large attending profile photos with names underneath
- **Rides/Money Cards**: Updated to use provided image assets (80x80) for visual appeal
- **ShareModal**: Two-tab design (Share by URL / Share by Username) with debounced username search
- **LoadingDots**: Updated with brand colors (orange #E67E5A, yellow #E6B85A, blue #5AACE6)
- **Messages Page**: All messages now display sender avatars with sender names for non-user messages
- **GlassModal Animations**: Snappy spring transitions with tension: 120, friction: 10
- **Tab Navigation**: Haptic feedback (vibration) when switching between pill tabs
- **Three Dots Menu**: Haptic feedback on iOS when opening the options menu
- **Change Hangout Title**: New option in three dots menu to edit event title with slide-up modal
- **Event Card Date Colors**: Homepage event cards now show random date box background colors (orange, yellow, blue) using brand colors
- **Conflicts Time Picker**: Native iOS spinner wheel picker for selecting suggested times (matches create event experience)

### Messages & Conflicts Integration
- **Add to Conflicts**: Clicking "Add to Conflicts" on a message now opens the full ConflictsModal instead of auto-creating a conflict
- Messages screen imports and renders ConflictsModal with proper event refresh callbacks
- **Time Suggestion Detection Removed**: Messages no longer auto-detect time change suggestions, only location suggestions are flagged
- **Instant Conflict Resolution Updates**: When a conflict is resolved, event details update instantly via onEventUpdated callback

### Location Search
- **OpenStreetMap Nominatim API**: Location search uses only OpenStreetMap for faster results (no TomTom dependency)
- **Scrollable Results**: Location suggestions display 3 at a time with vertical scrolling
- Results sorted by distance to user's current location

### Smart Location Suggestions
- **LocationSuggestModal**: Glassmorphism modal with mile radius slider (1-25 miles), AI-based location suggestions, and "Suggest Again"/"Use This Location" buttons
- **Light Glass Design**: Uses light-tinted BlurView with semi-transparent white background matching NotificationsModal styling
- **Expanded Category Support**: Backend now suggests diverse venue types including cafes, restaurants, parks, shopping, entertainment, bars, museums, beaches, sports venues, and more (12 total categories)
- **Multi-Layer Search Strategy**: Uses TomTom nearbySearch API with category-based search, POI search, and broad mixed-category fallback for maximum coverage
- **Improved Accuracy**: Increased API limit to 50 results with proper deduplication and radius filtering
- **Intelligent Category Mapping**: Backend maps event titles to relevant TomTom categories (e.g., "Movie Night" → cinema, "Dinner" → restaurant, "Coffee" → café, "Beach Day" → beach)
- **Location Permission Guard**: Button grays out when location services disabled, shows helpful alert when tapped
- **Haptic Feedback**: Slider changes and button presses trigger haptic feedback on iOS

### Map Features
- **Native Maps with Lazy Loading**: Uses `react-native-maps` for iOS/Android with lazy require() inside render function to prevent Expo Go crashes
- Static TomTom image fallback for web and when native maps unavailable
- Current location marker uses user's profile photo with green pulsing border
- Location sharing toggle state persists across app sessions using AsyncStorage
- Attendee markers with profile photos and "On My Way" status indicators
- Route polylines displayed for attendees marked "On My Way"
- Distance and ETA shown in marker callouts via TomTom Routing API
- Real-time location tracking with `expo-location` watchPositionAsync
- **Share Location at Top**: Share my location toggle moved to top of map page
- **Event Day Only "On My Way"**: Mark as On My Way button only appears on the day of the event
- **Removed Event Info Card**: Event name and location name removed from map overlay

### Photo Upload
- Fixed parameter name from 'image' to 'photoUrl' matching backend API
- Photo display now uses correct database field names (photo_url, first_name)
- Photo quality reduced to 0.5 to prevent payload size issues

### Event Management
- Delete event button properly gated to hosts only (isHost check)

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
  event/[id]/           # Event detail with tab-based navigation
    _layout.tsx         # Tab bar layout with pill navigation
    details.tsx         # Event details tab (info, attendees, action buttons)
    messages.tsx        # Chat/messaging tab
    map.tsx             # TomTom map with live location sharing
    photos.tsx          # Ephemeral photo album tab
src/                    # Application code
  screens/              # All screen components
  components/           # Reusable UI components (GlassCard, GlassModal, etc.)
context/                # React Context providers (AuthContext, EventContext)
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
- TomTom Maps API for location search, POI suggestions, and map visualization
- TomTom Maps SDK embedded via iframe (web) and WebView (native) for cross-platform compatibility
- expo-location for device GPS access and real-time location updates with watchPositionAsync
- Location permissions: "Always and When in Use" for friend location sharing
- Live location sharing with continuous background updates

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
- Environment variables: DATABASE_URL, JWT_SECRET, EXPO_PUBLIC_API_URL, EXPO_PUBLIC_TERMS_URL, EXPO_PUBLIC_PRIVACY_URL
- Secrets (server-side only): TOMTOM_API_KEY - stored securely, never exposed to frontend

**Security Notes:**
- TomTom API key is stored as a secret and only accessed server-side
- All location/routing features proxy through backend endpoints (/location/route, /location/static-map, /location/suggest, /location/search)
- No API keys are exposed in client-side JavaScript bundles
- Rate limiting implemented via express-rate-limit:
  - Global: 500 requests per 15 minutes per IP
  - Auth endpoints (/login, /signup): 20 requests per 15 minutes (brute force protection)
  - Messages: 60 requests per minute
  - Location: 100 requests per minute
- JWT authentication uses SESSION_SECRET from secure secrets
- Shared environment only contains non-sensitive public URLs

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