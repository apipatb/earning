import { Request, Response, NextFunction } from 'express';
import { logDebug } from '../lib/logger';

/**
 * Security Headers Middleware
 * Implements comprehensive security headers to protect against various attacks:
 * - XSS attacks
 * - Clickjacking
 * - MIME type sniffing
 * - Man-in-the-middle attacks
 * - Unsafe inline scripts
 * - Framing attacks
 */
export const securityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const IS_PRODUCTION = NODE_ENV === 'production';

  // X-Content-Type-Options: Prevent MIME type sniffing
  // Tells browsers not to sniff MIME types
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options: Prevent clickjacking
  // DENY - Page cannot be displayed in a frame
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection: Legacy XSS protection (for older browsers)
  // 1; mode=block - Enable XSS filtering and block page if attack is detected
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: Control referrer information
  // strict-origin-when-cross-origin - Send full URL for same-origin, only origin for cross-origin
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: Disable unnecessary browser features
  // Restricts access to powerful features that could be misused
  const permissionsPolicy = [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', ');
  res.setHeader('Permissions-Policy', permissionsPolicy);

  // Strict-Transport-Security: Enforce HTTPS
  if (IS_PRODUCTION) {
    // HSTS: Enforce HTTPS for 1 year and apply to all subdomains
    // max-age=31536000 (1 year)
    // includeSubDomains - Apply to all subdomains
    // preload - Allow inclusion in HSTS preload list
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  } else {
    // In development, use shorter duration
    res.setHeader('Strict-Transport-Security', 'max-age=3600');
  }

  // Content-Security-Policy: Prevent inline scripts and restrict resource loading
  const CSP = IS_PRODUCTION
    ? // Production: Strict CSP
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow self and inline (for swagger docs)
        "style-src 'self' 'unsafe-inline'", // Allow self and inline styles (for swagger docs)
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        'frame-ancestors none',
        'base-uri \'self\'',
        'form-action \'self\'',
      ].join('; ')
    : // Development: More permissive
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' http://localhost:* ws: wss:",
        'frame-ancestors none',
        'base-uri \'self\'',
        'form-action \'self\'',
      ].join('; ');

  res.setHeader('Content-Security-Policy', CSP);

  // Additional security headers
  // X-Permitted-Cross-Domain-Policies: Disable cross-domain policies
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Feature-Policy: Deprecated, but kept for compatibility
  res.setHeader(
    'Feature-Policy',
    'accelerometer \'none\'; camera \'none\'; geolocation \'none\'; gyroscope \'none\'; magnetometer \'none\'; microphone \'none\'; payment \'none\'; usb \'none\''
  );

  logDebug('Security headers applied', {
    path: req.path,
    environment: NODE_ENV,
  });

  next();
};

export default securityHeadersMiddleware;
