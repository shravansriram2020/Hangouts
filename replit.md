# Hangouts - Event Planning & Coordination App

## Overview
Hangouts is a mobile-first social event planning application built with React Native and Expo. Its core purpose is to enable users to create, coordinate, and manage social gatherings efficiently. The app offers features such as event creation with location services, real-time messaging, ride coordination, expense splitting, live location sharing, conflict resolution through voting, and ephemeral photo sharing. It targets iOS, Android, and web platforms, emphasizing real-time collaboration and location-based functionalities to enhance social interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Routing**: React Native 0.81.4 and Expo SDK 54, utilizing Expo Router 6.0 for file-based navigation.
- **Project Structure**: `app/` for Expo Router routes, `src/` for core application code (screens, components, context, services), and `server/` for the Express.js backend.
- **State Management**: React Context API for global authentication state and AsyncStorage for persistent token and user data.
- **UI Components**: Custom reusable components, a modal-based architecture for secondary flows, and tab-based navigation within event details.
- **Design Decisions**: Employs linear gradients, blur effects for glassmorphism, custom Google Fonts (Prompt), and haptic feedback for enhanced user experience, with responsive design principles.

### Backend Architecture
- **Server Framework**: Express.js 5.1.0 with a RESTful API design.
- **API Structure**: Routes organized by domain, including `/api/auth`, `/api/users`, `/api/events`, `/api/rides`, `/api/money`, `/api/messages`, `/api/photos`, `/api/notifications`, `/api/conflicts`, and `/api/location`.
- **Authentication & Authorization**: JWT-based token authentication with bcryptjs for password hashing. Middleware protects non-auth routes, and user identity is managed via JWT payloads.

### Data Storage
- **Database**: PostgreSQL, managed with the `pg` library, employing connection pooling.
- **Schema Design**: Key tables include `users`, `events`, `event_attendees`, `rides`, `money_requests`, `messages`, `event_photos`, `notifications`, `conflicts`, and `conflict_votes`. UUID primary keys, timestamps, and soft deletes are used.

## External Dependencies

- **Location Services**: TomTom Maps API for search, POI suggestions, and map visualization. `expo-location` for device GPS access and real-time location updates.
- **Image Handling**: `expo-image-picker` for photo selection and `multer` for backend multipart form uploads.
- **Authentication & Storage**: `jsonwebtoken` for JWTs and `@react-native-async-storage/async-storage` for client-side persistence.
- **UI Libraries**: `@expo/vector-icons`, `expo-linear-gradient`, `expo-blur`, `@react-navigation`, `react-native-gesture-handler`, and `react-native-reanimated` for UI and animations.
- **Development Tools**: TypeScript, ESLint, `dotenv` for environment variables (DATABASE_URL, JWT_SECRET, EXPO_PUBLIC_API_URL, EXPO_PUBLIC_TERMS_URL, EXPO_PUBLIC_PRIVACY_URL). TomTom API key is stored securely server-side.
- **Security**: Rate limiting via `express-rate-limit`, JWT authentication with a strong secret, Helmet.js for security headers, password strength requirements, and CORS configured for trusted origins. Email verification utilizes Resend API for branded HTML emails.