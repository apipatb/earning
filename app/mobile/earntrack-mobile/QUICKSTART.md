# EarnTrack Mobile - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Expo CLI (will be installed via npx)
- iOS Simulator (Mac only) or Android Emulator
- Backend server running at http://localhost:3001

## Getting Started

### 1. Install Dependencies

```bash
cd /home/user/earning/app/mobile/earntrack-mobile
npm install
```

### 2. Configure Backend URL

Edit `app.json` and update the API URL if needed:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://localhost:3001/api/v1",
      "wsUrl": "ws://localhost:3001"
    }
  }
}
```

For physical device testing, replace `localhost` with your computer's IP address:
```json
"apiUrl": "http://192.168.1.100:3001/api/v1"
```

### 3. Start the Development Server

```bash
npm start
```

This will open the Expo DevTools in your browser.

### 4. Run on Device/Simulator

#### Option A: iOS Simulator (Mac only)
```bash
npm run ios
```

#### Option B: Android Emulator
```bash
npm run android
```

#### Option C: Physical Device (Expo Go)
1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Scan the QR code from the terminal with your device
3. App will load on your device

#### Option D: Web Browser
```bash
npm run web
```

## Test the App

### Create a Test Account

1. Start the backend server
2. Use the registration endpoint or create a user directly:

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "Test User"
  }'
```

### Login to the App

1. Open the app on your device/simulator
2. Enter credentials:
   - Email: test@example.com
   - Password: Test1234!
3. Tap "Sign In"

### Test Features

1. **Dashboard**
   - View metrics
   - Pull down to refresh

2. **Tickets**
   - View ticket list
   - Filter by status
   - Pull to refresh

3. **Chat**
   - Send messages
   - View message history

4. **Profile**
   - View user info
   - Toggle settings
   - Logout

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear cache and restart
npm start -- --clear
```

### iOS Build Issues

```bash
# Clean iOS build
cd ios
pod install
cd ..
```

### Android Build Issues

```bash
# Clean Android build
cd android
./gradlew clean
cd ..
```

### Network Issues

If the app can't connect to the backend:
1. Check backend server is running
2. Verify API URL in app.json
3. For physical devices, use your computer's IP instead of localhost
4. Check firewall settings

### Biometric Authentication Not Working

- iOS Simulator: Use Cmd+Shift+H twice to access Face ID simulation
- Android Emulator: Set up fingerprint in emulator settings
- Physical Device: Ensure biometric is enrolled in device settings

## Development Tips

### Hot Reload

- Changes to code automatically reload the app
- Shake device or press Cmd+D (iOS) / Cmd+M (Android) for dev menu
- Press "r" in terminal to manually reload

### Debugging

1. **Console Logs**
   - View in terminal where `npm start` is running
   - Or use React Native Debugger

2. **React DevTools**
   - Press "d" in terminal to open developer menu
   - Enable "Debug Remote JS"

3. **Network Debugging**
   - Enable "Debug Remote JS"
   - Open Chrome DevTools > Network tab

### Useful Commands

```bash
# Start with clear cache
npm start -- --clear

# Start in production mode
npm start -- --no-dev --minify

# List available devices
npx expo run:ios --help
npx expo run:android --help
```

## Next Steps

1. Explore the codebase in `/src`
2. Read the main [README.md](./README.md) for detailed documentation
3. Check [MOBILE_APP_IMPLEMENTATION.md](/home/user/earning/MOBILE_APP_IMPLEMENTATION.md) for architecture details
4. Start customizing screens and features

## Common Workflows

### Adding a New Screen

1. Create screen component in `/src/screens/YourScreen/`
2. Add to navigation in `/src/navigation/AppNavigator.tsx`
3. Update types in `/src/types/index.ts`

### Adding an API Endpoint

1. Add method to `/src/services/api.service.ts`
2. Create/update types in `/src/types/index.ts`
3. Use in screen components

### Styling Changes

- Colors: Edit `/src/constants/colors.ts`
- Shared styles: Create in `/src/styles/` (recommended)
- Component-specific: Use StyleSheet.create() in component file

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [React Native Documentation](https://reactnative.dev)
- [Expo Vector Icons](https://icons.expo.fyi)

## Support

For issues or questions:
- Check [README.md](./README.md)
- Review [Troubleshooting](#troubleshooting) section
- Contact development team
