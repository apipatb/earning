# API Security Enhancements

This document describes the security enhancements implemented for the EarnTrack API, including rate limiting and security headers.

## Overview

The API now implements comprehensive security measures to protect against common attacks and abuse:

1. **Rate Limiting** - Prevents abuse and brute force attacks
2. **Security Headers** - Protects against various web vulnerabilities
3. **Enhanced Error Handling** - Provides rate limit information to clients

## Rate Limiting

Rate limiting is implemented at multiple levels to protect different parts of the API.

### Rate Limit Tiers

#### 1. Global Rate Limit
- **Limit**: 100 requests per 15 minutes per IP address
- **Applied to**: All `/api/v1/*` endpoints
- **Skipped**: Health check endpoints (`/health`)
- **Purpose**: Prevents general API abuse and excessive usage

#### 2. Authentication Rate Limit
- **Limit**: 5 attempts per 15 minutes per IP address
- **Applied to**: `/api/v1/auth/*` endpoints (login, register)
- **Stricter than**: Global rate limit
- **Purpose**: Prevents brute force attacks on authentication endpoints

#### 3. Upload Rate Limit
- **Limit**: 50 uploads per 1 hour per user/IP
- **Applied to**: `/api/v1/upload/*` endpoints
- **Key Generator**: Uses user ID if authenticated, otherwise IP address
- **Purpose**: Prevents abuse of file upload functionality

#### 4. Create Resource Rate Limit (Available for use)
- **Limit**: 50 requests per 1 hour per user/IP
- **Available for**: Resource creation endpoints
- **Not yet applied to**: Any endpoints (can be used where needed)

### Rate Limit Headers

The API includes standard rate limit headers in responses:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1700000000
Retry-After: 60
```

- `RateLimit-Limit`: Total number of requests allowed
- `RateLimit-Remaining`: Number of requests remaining
- `RateLimit-Reset`: Unix timestamp when the limit resets
- `Retry-After`: Number of seconds to wait before retrying

### Rate Limit Error Response

When a rate limit is exceeded, the API returns a 429 (Too Many Requests) status with:

```json
{
  "error": "Too Many Requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": 60,
  "remaining": 0,
  "resetTime": "2024-11-16T15:30:00Z"
}
```

## Security Headers

Security headers are applied to all responses to prevent common vulnerabilities:

### Header Descriptions

#### X-Content-Type-Options: nosniff
- **Purpose**: Prevents MIME type sniffing attacks
- **Effect**: Browsers must respect the declared Content-Type
- **Protection**: Prevents attackers from executing scripts through misidentified files

#### X-Frame-Options: DENY
- **Purpose**: Prevents clickjacking attacks
- **Effect**: Page cannot be displayed in iframes
- **Protection**: Prevents UI redressing attacks

#### X-XSS-Protection: 1; mode=block
- **Purpose**: Legacy XSS protection (for older browsers)
- **Effect**: Enables XSS filtering and blocks the page if attack is detected
- **Protection**: Adds defense against reflected XSS attacks in older browsers

#### Referrer-Policy: strict-origin-when-cross-origin
- **Purpose**: Controls referrer information leakage
- **Effect**:
  - Sends full URL for same-origin requests
  - Sends only origin for cross-origin requests
- **Protection**: Prevents leaking sensitive information through referrer headers

#### Strict-Transport-Security (HSTS)
- **Production**: `max-age=31536000; includeSubDomains; preload`
- **Development**: `max-age=3600`
- **Purpose**: Enforces HTTPS connections
- **Protection**:
  - Prevents man-in-the-middle attacks
  - Forces browsers to use HTTPS
  - 1-year validity in production (31536000 seconds)
  - 1-hour validity in development (3600 seconds)
  - Applies to all subdomains
  - Allows inclusion in HSTS preload list

#### Content-Security-Policy (CSP)

##### Production CSP:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self';
frame-ancestors none;
base-uri 'self';
form-action 'self';
```

##### Development CSP:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' http://localhost:* ws: wss:;
frame-ancestors none;
base-uri 'self';
form-action 'self';
```

- **Purpose**: Prevents injection attacks (XSS, CSRF)
- **Protection**: Controls which resources can be loaded and executed

#### Permissions-Policy
- **Disabled Features**: Accelerometer, Camera, Geolocation, Gyroscope, Magnetometer, Microphone, Payment, USB
- **Purpose**: Disables unnecessary browser features
- **Protection**: Reduces attack surface by denying access to sensitive APIs

#### X-Permitted-Cross-Domain-Policies: none
- **Purpose**: Prevents cross-domain policy exploitation
- **Protection**: Blocks Flash/PDF from loading cross-domain policies

## Middleware Order

The middleware is applied in a specific order for optimal security:

```
1. Security Headers Middleware (securityHeadersMiddleware)
   └─ Applied first to all requests
   └─ Sets security headers before any other processing

2. CORS Middleware
   └─ Handles cross-origin requests

3. Body Parsing Middlewares
   └─ Parses JSON and URL-encoded bodies

4. Logging Middleware
   └─ Logs all requests and responses

5. Global Rate Limiter (globalLimiter)
   └─ Applied to all /api/* routes
   └─ 100 requests per 15 minutes per IP

6. Auth-Specific Rate Limiter (authLimiter)
   └─ Applied to /api/v1/auth/* routes
   └─ 5 attempts per 15 minutes per IP
   └─ More restrictive than global limiter

7. Upload-Specific Rate Limiter (uploadLimiter)
   └─ Applied to /api/v1/upload/* routes
   └─ 50 uploads per 1 hour per user/IP
```

## Implementation Details

### Files Modified

1. **src/middleware/rate-limit.middleware.ts** (NEW)
   - Defines all rate limiting middleware
   - Includes type-safe request handling
   - Custom error responses with retry information

2. **src/middleware/security-headers.middleware.ts** (NEW)
   - Applies comprehensive security headers
   - Environment-aware configuration
   - Production-safe defaults

3. **src/server.ts** (UPDATED)
   - Imported new middleware
   - Reorganized middleware application order
   - Applied rate limiters to specific routes

4. **src/middleware/error.middleware.ts** (UPDATED)
   - Added rate limit error detection
   - Includes Retry-After header in responses
   - Provides remaining request count information

### Configuration

Rate limits are configured in the middleware files. To adjust them:

1. **Global limit**: Edit `globalLimiter` in `/src/middleware/rate-limit.middleware.ts`
   - Modify `max` for request count
   - Modify `windowMs` for time window

2. **Auth limit**: Edit `authLimiter` in `/src/middleware/rate-limit.middleware.ts`

3. **Upload limit**: Edit `uploadLimiter` in `/src/middleware/rate-limit.middleware.ts`

## Testing

### Manual Testing

1. **Test Global Rate Limit**:
   ```bash
   # Make 101 requests to verify blocking after 100
   for i in {1..101}; do
     curl -i http://localhost:3001/api/v1/user
     sleep 0.1
   done
   ```

2. **Test Auth Rate Limit**:
   ```bash
   # Make 6 requests to verify blocking after 5
   for i in {1..6}; do
     curl -X POST http://localhost:3001/api/v1/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"wrong"}'
     sleep 0.1
   done
   ```

3. **Test Upload Rate Limit**:
   ```bash
   # Test upload endpoint rate limiting
   for i in {1..51}; do
     curl -X POST http://localhost:3001/api/v1/upload \
       -F "file=@test.txt"
     sleep 0.1
   done
   ```

### Automated Testing

Run the provided test script:
```bash
cd /home/user/earning/app/backend
npx ts-node test-rate-limit.ts
```

### Testing Security Headers

1. **Check headers in response**:
   ```bash
   curl -i http://localhost:3001/api/v1/user
   ```

2. **Verify in browser**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Look for response headers like:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Content-Security-Policy: ...`

## Monitoring

### Logging

Rate limit events are logged with:
- IP address or User ID
- Endpoint path
- HTTP method
- Timestamp

Examples:
```
[WARN] Rate limit exceeded { ip: '127.0.0.1', path: '/api/v1/user', method: 'GET' }
[WARN] Auth rate limit exceeded { ip: '127.0.0.1', path: '/api/v1/auth/login', method: 'POST' }
[WARN] Upload rate limit exceeded { userId: 'user123', path: '/api/v1/upload', method: 'POST' }
```

### Metrics

Monitor these metrics to detect issues:
- Rate limit hits per endpoint
- Blocked requests per IP
- Blocked requests per user
- Response times with security headers

## Compliance

These security enhancements help meet requirements for:

- **OWASP Top 10**: Protection against A01:2021 - Broken Access Control, A07:2021 - Identification and Authentication Failures
- **PCI DSS**: Requirement 6.5.10 (Broken Authentication)
- **GDPR**: Security measures for data protection
- **HIPAA**: Security safeguards for protected health information

## Future Enhancements

Potential future security improvements:

1. **IP Whitelisting**: Allow certain IPs to bypass rate limits (e.g., healthchecks)
2. **Dynamic Rate Limiting**: Adjust limits based on server load or abuse patterns
3. **Geographic Restrictions**: Block requests from certain regions
4. **Bot Detection**: Detect and block automated requests
5. **API Key Rate Limiting**: Different limits for API key vs session-based auth
6. **WAF Integration**: Integrate with Web Application Firewall
7. **DDoS Protection**: Advanced protection against distributed attacks

## Troubleshooting

### Issue: Getting 429 errors too quickly

**Cause**: Rate limit is too strict
**Solution**: Increase the `max` value in the rate limit middleware

### Issue: Security headers not appearing

**Cause**: Middleware not applied or applied in wrong order
**Solution**: Check that `securityHeadersMiddleware` is applied before all other middleware

### Issue: Health check being rate limited

**Cause**: Health check endpoint not properly skipped
**Solution**: Verify that `/health` is in the skip list in `globalLimiter`

### Issue: File uploads blocked by upload rate limit

**Cause**: User has exceeded upload limit
**Solution**: Wait for the window to reset or increase `max` in `uploadLimiter`

## Summary

The API now has robust security measures in place:

- **Rate Limiting**: Protects against abuse and brute force attacks
- **Security Headers**: Prevents common web vulnerabilities
- **Enhanced Error Handling**: Provides useful information to legitimate clients
- **Environment-Aware Configuration**: Different settings for development and production

These enhancements significantly improve the security posture of the API while maintaining usability for legitimate clients.
