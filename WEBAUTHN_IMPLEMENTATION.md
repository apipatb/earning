# WebAuthn (FIDO2) Passwordless Authentication Implementation

Complete implementation of WebAuthn/FIDO2 passwordless authentication for the EarnTrack platform.

## Overview

This implementation provides secure, passwordless authentication using WebAuthn/FIDO2 standards. Users can register and authenticate using:
- Platform authenticators (Touch ID, Face ID, Windows Hello)
- Security keys (YubiKey, etc.)
- Biometric authentication

## Files Created

### Backend

#### 1. Database Schema
**File:** `/home/user/earning/app/backend/prisma/schema.prisma`

**Changes:**
- Added `WebAuthnCredential` model for storing user credentials
- Added `WebAuthnChallenge` model for managing authentication challenges
- Added relations to the `User` model

**Models:**
```prisma
model WebAuthnCredential {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  credentialId String   @unique @map("credential_id") @db.Text
  publicKey    String   @map("public_key") @db.Text
  counter      BigInt   @default(0)
  transports   String[]
  nickname     String?  @db.VarChar(100)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  lastUsedAt   DateTime? @map("last_used_at")
}

model WebAuthnChallenge {
  id        String   @id @default(uuid())
  userId    String?  @map("user_id")
  challenge String   @unique @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  expiresAt DateTime @map("expires_at")
  used      Boolean  @default(false)
}
```

#### 2. WebAuthn Service
**File:** `/home/user/earning/app/backend/src/services/webauthn.service.ts`

**Functions:**
- `generateRegistrationOptionsService()` - Create registration challenge
- `verifyRegistrationResponseService()` - Verify credential registration
- `generateAuthenticationOptionsService()` - Create login challenge
- `verifyAuthenticationResponseService()` - Verify login credential
- `getCredentialsService()` - List user credentials
- `deleteCredentialService()` - Remove credential
- `cleanupExpiredChallenges()` - Clean up expired challenges

**Dependencies:** Uses `@simplewebauthn/server` library

#### 3. WebAuthn Controller
**File:** `/home/user/earning/app/backend/src/controllers/webauthn.controller.ts`

**Endpoints:**
- `POST /api/v1/auth/webauthn/register/options` - Get registration challenge
- `POST /api/v1/auth/webauthn/register/verify` - Verify registration
- `POST /api/v1/auth/webauthn/authenticate/options` - Get login challenge
- `POST /api/v1/auth/webauthn/authenticate/verify` - Verify login
- `GET /api/v1/auth/webauthn/credentials` - List credentials (authenticated)
- `DELETE /api/v1/auth/webauthn/credentials/:id` - Delete credential (authenticated)

#### 4. WebAuthn Routes
**File:** `/home/user/earning/app/backend/src/routes/webauthn.routes.ts`

Configures all WebAuthn endpoints with appropriate authentication middleware.

#### 5. Server Configuration
**File:** `/home/user/earning/app/backend/src/server.ts`

**Changes:**
- Added WebAuthn routes import
- Registered routes at `/api/v1/auth/webauthn`

#### 6. Environment Configuration
**File:** `/home/user/earning/app/backend/.env.example`

**New Variables:**
```bash
WEBAUTHN_RP_NAME="EarnTrack"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"
```

### Frontend

#### 1. WebAuthn Hook
**File:** `/home/user/earning/app/frontend/src/hooks/useWebAuthn.ts`

**Exports:**
- `useRegisterWebAuthn()` - Hook for registering new credentials
- `useAuthenticateWebAuthn()` - Hook for authentication
- `useWebAuthnCredentials()` - Hook for credential management
- `isWebAuthnSupported()` - Check browser support
- `isPlatformAuthenticatorAvailable()` - Check platform authenticator availability
- `getDeviceInfo()` - Get browser/OS information

**Dependencies:** Uses `@simplewebauthn/browser` library

#### 2. Updated Login Page
**File:** `/home/user/earning/app/frontend/src/pages/Login.tsx`

**Changes:**
- Added "Sign in with Passkey" button
- Shows WebAuthn option when browser supports it
- Fallback to traditional password login
- Integrated passkey authentication flow

#### 3. Security Settings Page
**File:** `/home/user/earning/app/frontend/src/pages/Security.tsx`

**Features:**
- List all registered passkeys
- Register new passkeys
- Delete passkeys
- Display device information (browser, OS)
- Show credential details (created date, last used, type)
- Visual indicators for credential types (platform vs security key)

#### 4. WebAuthn Registration Component
**File:** `/home/user/earning/app/frontend/src/components/WebAuthnRegister.tsx`

**Features:**
- Modal dialog for passkey registration
- Nickname input for credential identification
- Auto-generated default nickname based on device
- Multi-step registration flow (input → registering → success)
- Error handling and user feedback
- Device information display

## Setup Instructions

### 1. Install Dependencies

**Backend:**
```bash
cd app/backend
npm install @simplewebauthn/server
npm install --save-dev @types/simplewebauthn__server
```

**Frontend:**
```bash
cd app/frontend
npm install @simplewebauthn/browser @simplewebauthn/typescript-types
```

### 2. Database Migration

Run Prisma migration to create new tables:
```bash
cd app/backend
npx prisma migrate dev --name add_webauthn_models
npx prisma generate
```

### 3. Environment Configuration

Update your `.env` file with WebAuthn configuration:

**Development:**
```bash
WEBAUTHN_RP_NAME="EarnTrack"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"
```

**Production:**
```bash
WEBAUTHN_RP_NAME="EarnTrack"
WEBAUTHN_RP_ID="earntrack.app"  # Your actual domain
WEBAUTHN_ORIGIN="https://earntrack.app"  # Your frontend URL
```

### 4. Frontend Environment

Ensure your frontend has the API URL configured:
```bash
VITE_API_URL="http://localhost:3001/api/v1"
```

### 5. Add Security Page to Router

Add the Security page to your router configuration:

```typescript
import Security from './pages/Security';

// In your router:
{
  path: '/security',
  element: <Security />
}
```

## Usage

### For Users

#### Registering a Passkey:
1. Log in with password
2. Navigate to Security settings (`/security`)
3. Click "Add Passkey"
4. Enter a nickname (optional)
5. Follow device prompts (Touch ID, Face ID, etc.)
6. Passkey is registered and can be used for login

#### Signing in with Passkey:
1. Go to login page
2. Click "Sign in with Passkey"
3. Follow device prompts
4. You're logged in!

#### Managing Passkeys:
1. Navigate to Security settings
2. View all registered passkeys
3. Delete passkeys you no longer use

### For Developers

#### API Flow - Registration:

```typescript
// 1. Get registration options
POST /api/v1/auth/webauthn/register/options
{
  "userId": "user-uuid",
  "userName": "user@example.com",
  "userDisplayName": "User Name"
}

// 2. User creates credential on device

// 3. Verify registration
POST /api/v1/auth/webauthn/register/verify
{
  "userId": "user-uuid",
  "response": { /* credential response */ },
  "expectedChallenge": "challenge-from-step-1",
  "nickname": "My iPhone"
}
```

#### API Flow - Authentication:

```typescript
// 1. Get authentication options
POST /api/v1/auth/webauthn/authenticate/options
{
  "userId": "user-uuid" // Optional
}

// 2. User authenticates with device

// 3. Verify authentication
POST /api/v1/auth/webauthn/authenticate/verify
{
  "response": { /* authentication response */ },
  "expectedChallenge": "challenge-from-step-1"
}

// Returns: { user, token }
```

## Security Features

1. **Challenge-Based Authentication:** Each authentication requires a unique challenge
2. **Counter Validation:** Replay attacks prevented by signature counter
3. **Origin Verification:** Ensures requests come from authorized domain
4. **Relying Party ID Validation:** Prevents phishing attacks
5. **Soft Delete:** Credentials are deactivated, not deleted (audit trail)
6. **Challenge Expiration:** Challenges expire after 5 minutes
7. **Automatic Cleanup:** Expired challenges cleaned periodically

## Browser Support

WebAuthn is supported in:
- Chrome 67+
- Firefox 60+
- Safari 13+ (macOS 10.15+, iOS 14+)
- Edge 18+

Platform authenticators:
- Touch ID (macOS, iOS)
- Face ID (iOS, macOS)
- Windows Hello (Windows 10+)
- Android Biometrics (Android 7+)

## Testing

### Local Testing (HTTPS Required for Production)

WebAuthn requires HTTPS in production. For local development:
- Use `localhost` (allowed without HTTPS)
- Or use tools like `ngrok` for HTTPS tunnel

### Test Credentials

1. Register a passkey on your device
2. Try signing in with the passkey
3. Test credential deletion
4. Verify error handling (timeout, cancellation)

## Troubleshooting

### Common Issues:

**1. "WebAuthn not supported"**
- Update browser to latest version
- Check browser compatibility

**2. Registration/Authentication fails**
- Verify environment variables are correct
- Check WEBAUTHN_ORIGIN matches frontend URL
- Ensure WEBAUTHN_RP_ID matches domain

**3. CORS errors**
- Add frontend URL to ALLOWED_ORIGINS
- Verify CORS configuration in server.ts

**4. Challenge errors**
- Challenge may have expired (5 min timeout)
- Try again with fresh challenge

## Production Deployment Checklist

- [ ] Update `WEBAUTHN_RP_ID` to your domain
- [ ] Update `WEBAUTHN_ORIGIN` to your HTTPS frontend URL
- [ ] Update `WEBAUTHN_RP_NAME` to your app name
- [ ] Enable HTTPS (required for production)
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Set up periodic cleanup of expired challenges
- [ ] Monitor error logs for authentication failures
- [ ] Implement rate limiting on auth endpoints
- [ ] Add analytics for passkey adoption

## Additional Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [W3C WebAuthn Spec](https://www.w3.org/TR/webauthn/)
- [FIDO Alliance](https://fidoalliance.org/)

## File Summary

**Backend Files:**
1. `/home/user/earning/app/backend/prisma/schema.prisma` (updated)
2. `/home/user/earning/app/backend/src/services/webauthn.service.ts` (new)
3. `/home/user/earning/app/backend/src/controllers/webauthn.controller.ts` (new)
4. `/home/user/earning/app/backend/src/routes/webauthn.routes.ts` (new)
5. `/home/user/earning/app/backend/src/server.ts` (updated)
6. `/home/user/earning/app/backend/.env.example` (updated)

**Frontend Files:**
1. `/home/user/earning/app/frontend/src/hooks/useWebAuthn.ts` (new)
2. `/home/user/earning/app/frontend/src/pages/Login.tsx` (updated)
3. `/home/user/earning/app/frontend/src/pages/Security.tsx` (new)
4. `/home/user/earning/app/frontend/src/components/WebAuthnRegister.tsx` (new)

**Total:** 10 files (6 new, 4 updated)
