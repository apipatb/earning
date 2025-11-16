import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logWarn } from '../lib/logger';

// Type definition for express-rate-limit
interface RequestWithRateLimit extends Request {
  rateLimit?: {
    limit: number;
    current: number;
    remaining: number;
    resetTime?: Date;
  };
}

// Global rate limit: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip health check endpoints
    return req.path === '/health' || req.path === '/api/health';
  },
  keyGenerator: (req: Request) => {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logWarn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    const requestWithRateLimit = req as RequestWithRateLimit;
    const retryAfter = requestWithRateLimit.rateLimit?.resetTime
      ? Math.ceil((requestWithRateLimit.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : 60;

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter,
      resetTime: requestWithRateLimit.rateLimit?.resetTime?.toISOString(),
    });
  },
});

// Auth endpoints: stricter 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count both successful and failed requests
  skipFailedRequests: false, // Don't skip failed requests
  keyGenerator: (req: Request) => {
    // Use IP address for auth limiting
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logWarn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    const requestWithRateLimit = req as RequestWithRateLimit;
    const retryAfter = requestWithRateLimit.rateLimit?.resetTime
      ? Math.ceil((requestWithRateLimit.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : 60;

    res.status(429).json({
      error: 'Too Many Authentication Attempts',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter,
      resetTime: requestWithRateLimit.rateLimit?.resetTime?.toISOString(),
    });
  },
});

// Upload endpoints: 50 uploads per 1 hour per user
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each user to 50 uploads per hour
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).user?.id;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logWarn('Upload rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    const requestWithRateLimit = req as RequestWithRateLimit;
    const retryAfter = requestWithRateLimit.rateLimit?.resetTime
      ? Math.ceil((requestWithRateLimit.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : 60;

    res.status(429).json({
      error: 'Too Many Uploads',
      message: 'Upload limit exceeded. Please try again later.',
      retryAfter,
      resetTime: requestWithRateLimit.rateLimit?.resetTime?.toISOString(),
    });
  },
});

// Endpoint-specific limiter for creating resources (50 per 1 hour)
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logWarn('Create resource rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    const requestWithRateLimit = req as RequestWithRateLimit;
    const retryAfter = requestWithRateLimit.rateLimit?.resetTime
      ? Math.ceil((requestWithRateLimit.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : 60;

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit for creating resources.',
      retryAfter,
      resetTime: requestWithRateLimit.rateLimit?.resetTime?.toISOString(),
    });
  },
});
