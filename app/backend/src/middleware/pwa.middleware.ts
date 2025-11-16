/**
 * PWA Middleware - Service Worker and Manifest Headers
 * Provides proper caching headers and offline-friendly responses
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Service Worker cache headers
 * Prevents aggressive caching to allow for updates
 */
export const serviceWorkerHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only apply to service worker file
  if (req.url === '/service-worker.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Service-Worker-Allowed', '/');
  }

  next();
};

/**
 * Manifest headers
 * Ensures proper content type and caching for manifest.json
 */
export const manifestHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.url === '/manifest.json') {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  }

  next();
};

/**
 * PWA-friendly API headers
 * Adds headers to support offline functionality
 */
export const pwaApiHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add CORS headers for PWA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Add cache control for API responses
  if (req.method === 'GET') {
    // Allow caching for GET requests
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
  } else {
    // No caching for mutations
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  // Add ETag support for conditional requests
  res.setHeader('Vary', 'Accept-Encoding');

  next();
};

/**
 * Offline-friendly error responses
 * Returns consistent JSON errors even when offline
 */
export const offlineErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if request is from service worker
  const isServiceWorkerRequest = req.headers['service-worker'] === 'true';

  if (isServiceWorkerRequest) {
    // Return offline-friendly error
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'The service is temporarily unavailable. Please try again later.',
      offline: true,
      timestamp: new Date().toISOString()
    });
  } else {
    next(err);
  }
};

/**
 * Add Last-Modified header for static assets
 */
export const staticAssetHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];

  const isStaticAsset = staticExtensions.some(ext => req.url.endsWith(ext));

  if (isStaticAsset) {
    // Long cache for static assets (30 days)
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Last-Modified', new Date().toUTCString());
  }

  next();
};

/**
 * Add CSP headers for PWA security
 */
export const pwaSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.earntrack.com; " +
    "manifest-src 'self'; " +
    "worker-src 'self';"
  );

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature Policy (Permissions Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(self)'
  );

  next();
};

/**
 * Handle offline fallback
 * Serves offline page when main app is unavailable
 */
export const offlineFallback = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only handle HTML requests
  const acceptsHtml = req.accepts('html');

  if (acceptsHtml && !req.url.startsWith('/api/')) {
    // Check if this is a navigation request
    const isNavigation = req.method === 'GET' && acceptsHtml;

    if (isNavigation) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }

  next();
};

/**
 * Add response time header
 */
export const responseTimeHeader = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
};

/**
 * Combine all PWA middleware
 */
export const pwaMiddleware = [
  serviceWorkerHeaders,
  manifestHeaders,
  staticAssetHeaders,
  pwaSecurityHeaders,
  offlineFallback,
  responseTimeHeader
];

/**
 * API-specific PWA middleware
 */
export const apiPwaMiddleware = [
  pwaApiHeaders,
  responseTimeHeader
];

export default {
  serviceWorkerHeaders,
  manifestHeaders,
  pwaApiHeaders,
  offlineErrorHandler,
  staticAssetHeaders,
  pwaSecurityHeaders,
  offlineFallback,
  responseTimeHeader,
  pwaMiddleware,
  apiPwaMiddleware
};
