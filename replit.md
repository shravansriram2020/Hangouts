# Hangouts - Event Planning & Coordination App

## Overview
Hangouts is a mobile-first social event planning application built with React Native and Expo, targeting iOS, Android, and web platforms. Its core purpose is to enable users to create, coordinate, and manage social gatherings efficiently. Key capabilities include event creation with location services, real-time messaging, ride coordination, expense splitting, live location sharing, conflict resolution through voting, ephemeral photo sharing, and an "Explore" tab for discovering nearby activities and events. The app emphasizes real-time collaboration and location-based functionalities to enhance social interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses React Native and Expo SDK, with Expo Router for file-based navigation. State management is handled via React Context API for global authentication and AsyncStorage for persistent user data. UI components are custom and reusable, featuring a modal-based architecture and tab-based navigation. Design emphasizes linear gradients, blur effects for glassmorphism, custom Google Fonts (Prompt), haptic feedback, and responsive design. Font scaling is globally disabled to ensure consistent text size across devices.

### Backend Architecture
The backend is built with Express.js, providing a RESTful API. API routes are organized by domain (e.g., `/api/auth`, `/api/events`). Authentication uses JWT-based tokens with bcryptjs for password hashing, and middleware protects authenticated routes. An admin portal provides user moderation, broadcast push notifications, email campaigns, and analytics.

### Data Storage
PostgreSQL is used as the primary database, managed with the `pg` library and connection pooling. The schema includes tables for `users`, `events`, `event_attendees`, `rides`, `money_requests`, `messages`, `event_photos`, `notifications`, `conflicts`, `conflict_votes`, `admin_audit_log`, `news_items`, and `news_dismissals`. UUID primary keys, timestamps, and soft deletes are implemented.

### Core Features
- **Event Management**: Create, coordinate, and manage social gatherings with location services.
- **Communication**: Real-time messaging, push notifications, and email verification.
- **Coordination**: Ride sharing, expense splitting, and live location sharing.
- **Conflict Resolution**: Voting system for resolving event-related conflicts.
- **Photo Sharing**: Ephemeral and moderatable photo sharing with an option to share to the "Explore" feed.
- **Explore Tab**: Displays nearby location suggestions, trending categories, user-shared photos, and active user events based on TomTom API and internal data, with a curated fallback system.
- **Friend System**: Users can search and invite friends, with a clear distinction between friends and non-friends for interactions.
- **Admin Portal**: Web-based dashboard for user moderation (ban/unban), broadcasting news/emails, and analytics.
- **Deep Linking**: Supports Universal Links and custom URL schemes for seamless app navigation.

## External Dependencies

- **Mapping & Location**: TomTom Maps API (search, POI, map visualization), `expo-location` (device GPS).
- **Image Handling**: `expo-image-picker` (client-side), `multer` (server-side uploads).
- **Authentication**: `jsonwebtoken`, `@react-native-async-storage/async-storage`.
- **UI/Animation**: `@expo/vector-icons`, `expo-linear-gradient`, `expo-blur`, `@react-navigation`, `react-native-gesture-handler`, `react-native-reanimated`.
- **Development & Security**: TypeScript, ESLint, `dotenv`, `express-rate-limit`, Helmet.js, CORS.
- **Email Service**: Resend API (for verification, admin emails, ban notifications) with `hangouts-app.com` domain.
- **Push Notifications**: Apple Push Notification service (APNs) via JWT-based authentication.
- **Advertising**: Google AdMob (for sponsored location ads) using `react-native-google-mobile-ads`.