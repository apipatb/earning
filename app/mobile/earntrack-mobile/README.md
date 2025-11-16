# EarnTrack Mobile App

React Native mobile application for iOS and Android, built with Expo.

## Features

- **Authentication**
  - Email/Password login
  - Biometric authentication (Face ID/Touch ID/Fingerprint)
  - Deep link support for magic link authentication

- **Dashboard**
  - Real-time metrics overview
  - Ticket statistics
  - Customer satisfaction ratings
  - Quick actions

- **Tickets Management**
  - View all tickets with filtering (All, Open, In Progress, Resolved)
  - Create new tickets
  - Update ticket status
  - Priority-based color coding

- **Live Chat**
  - Real-time messaging
  - File attachments
  - Message history
  - Typing indicators

- **Profile**
  - User information
  - Settings management
  - Biometric toggle
  - Push notification preferences

- **Offline Support**
  - Queue actions when offline
  - Auto-sync when connection restored
  - Local data persistence

- **Push Notifications**
  - Real-time alerts
  - Badge counts
  - Custom notification handling

## Tech Stack

- **Framework**: Expo / React Native
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **State Management**: React Hooks
- **Storage**: AsyncStorage
- **Networking**: Axios
- **Authentication**: JWT + Biometric (expo-local-authentication)
- **Notifications**: expo-notifications
- **Camera**: expo-camera
- **Offline**: @react-native-community/netinfo

## Project Structure

```
src/
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
├── screens/            # App screens
│   ├── Login/
│   ├── Dashboard/
│   ├── Tickets/
│   ├── Chat/
│   └── Profile/
├── services/           # API and business logic
│   ├── api.service.ts
│   ├── auth.service.ts
│   ├── storage.service.ts
│   ├── notification.service.ts
│   └── offline.service.ts
├── components/         # Reusable components
├── types/             # TypeScript types
├── constants/         # App constants
│   ├── colors.ts
│   └── config.ts
└── utils/             # Utility functions
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac only) or Android Emulator

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd /home/user/earning/app/mobile/earntrack-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   - Update `app.json` with your API URLs
   - Set `apiUrl` and `wsUrl` in the `extra` section

### Running the App

#### Development Mode

```bash
# Start Expo development server
npm start

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

#### Using Expo Go

1. Install Expo Go on your iOS/Android device
2. Run `npm start`
3. Scan the QR code with your device

## Configuration

### API Endpoints

The app connects to the following backend endpoints:

- `POST /api/v1/auth/mobile-login` - Mobile authentication
- `GET /api/v1/auth/deep-link/:token` - Deep link authentication
- `GET /api/v1/mobile/config` - App configuration
- `POST /api/v1/mobile/device` - Device registration
- `GET /api/v1/tickets` - Ticket list
- `GET /api/v1/chat/messages` - Chat messages
- `GET /api/v1/analytics/dashboard` - Dashboard metrics

### Environment Variables

Update `app.json` > `extra`:

```json
{
  "extra": {
    "apiUrl": "https://your-api-url.com/api/v1",
    "wsUrl": "wss://your-api-url.com"
  }
}
```

## Building for Production

### iOS (Requires Mac)

```bash
# Build for iOS
npm run build:ios

# Submit to App Store
npm run submit:ios
```

### Android

```bash
# Build for Android
npm run build:android

# Submit to Play Store
npm run submit:android
```

## Features Implementation

### Biometric Authentication

The app uses `expo-local-authentication` for biometric support:

```typescript
import { AuthService } from './src/services/auth.service';

// Check if biometric is supported
const supported = await AuthService.checkBiometricSupport();

// Authenticate with biometric
const authenticated = await AuthService.authenticateWithBiometric();

// Enable/Disable biometric login
await AuthService.enableBiometric();
await AuthService.disableBiometric();
```

### Push Notifications

```typescript
import { NotificationService } from './src/services/notification.service';

// Register for push notifications
const token = await NotificationService.registerForPushNotifications();

// Schedule local notification
await NotificationService.scheduleLocalNotification(
  'Title',
  'Body',
  { data: 'any' },
  10 // delay in seconds
);
```

### Offline Support

```typescript
import { OfflineService } from './src/services/offline.service';

// Initialize offline support
await OfflineService.initialize();

// Queue action for offline sync
await OfflineService.queueAction({
  type: 'create',
  endpoint: '/tickets',
  data: { title: 'New Ticket' }
});

// Manual sync
await OfflineService.syncOfflineData();
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npm start -- --clear
   ```

2. **iOS pod install**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Android build errors**
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

### Deep Linking

To test deep links in development:

```bash
# iOS
npx uri-scheme open earntrack://auth/deep-link/YOUR_TOKEN --ios

# Android
npx uri-scheme open earntrack://auth/deep-link/YOUR_TOKEN --android
```

## Security

- All API calls use JWT authentication
- Tokens stored securely in AsyncStorage
- Biometric data never leaves the device
- SSL pinning recommended for production

## Performance

- Image optimization with Expo Image
- Lazy loading for screens
- Memoization for expensive calculations
- Virtualized lists for large datasets

## License

Proprietary - EarnTrack

## Support

For issues or questions, contact: support@earntrack.com
