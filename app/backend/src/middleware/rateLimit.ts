import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuthRequest } from '../types';

/**
 * Rate Limiting Middleware
 *
 * This module provides various rate limiters using express-rate-limit library
 * to protect different API endpoints from abuse and improve performance.
 */

/**
 * Rate limiter for authentication endpoints (login, register, password reset)
 *
 * Config: 5 requests per 15 minutes per IP
 * Use Case: Prevent brute force attacks on authentication
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too Many Authentication Attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests - only count failed attempts
  skipSuccessfulRequests: false,
  // Store in memory (for production, consider Redis store)
  handler: (req: Request, res: Response) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Too Many Authentication Attempts',
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      retryAfter: Math.ceil((rateLimit?.resetTime || Date.now()) - Date.now() / 1000),
    });
  },
});

/**
 * Rate limiter for authenticated API endpoints
 *
 * Config: 100 requests per 15 minutes per user
 * Use Case: General API protection for authenticated users
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many API requests, please slow down',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key for authenticated requests, IP for others
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
  // Skip rate limiting for admin users
  skip: (req: Request) => {
    const authReq = req as AuthRequest;
    // Check if user has admin role (if role property exists in user type)
    return false; // Disable admin skip for now since role doesn't exist in base user type
  },
  handler: (req: Request, res: Response) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many API requests, please slow down',
      retryAfter: Math.ceil((rateLimit?.resetTime || Date.now()) - Date.now() / 1000),
      limit: rateLimit?.limit,
      remaining: rateLimit?.remaining,
    });
  },
});

/**
 * Rate limiter for file upload endpoints
 *
 * Config: 10 requests per 1 hour per user
 * Use Case: Prevent excessive file uploads and storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    error: 'Upload Limit Exceeded',
    message: 'Too many file uploads, please try again later',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
  skip: (req: Request) => {
    const authReq = req as AuthRequest;
    // Check if user has admin role (if role property exists in user type)
    return false; // Disable admin skip for now since role doesn't exist in base user type
  },
  handler: (req: Request, res: Response) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Upload Limit Exceeded',
      message: 'You have exceeded the file upload limit. Please try again in 1 hour.',
      retryAfter: Math.ceil((rateLimit?.resetTime || Date.now()) - Date.now() / 1000),
      limit: rateLimit?.limit,
      remaining: rateLimit?.remaining,
      upgradeInfo: 'Upgrade your plan for higher upload limits',
    });
  },
});

/**
 * Rate limiter for payment and billing endpoints
 *
 * Config: 20 requests per 1 hour per user
 * Use Case: Prevent payment spam and fraudulent transactions
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 payment requests per hour
  message: {
    error: 'Payment Request Limit Exceeded',
    message: 'Too many payment requests, please try again later',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Payment Request Limit Exceeded',
      message: 'Too many payment requests. Please contact support if you believe this is an error.',
      retryAfter: Math.ceil((rateLimit?.resetTime || Date.now()) - Date.now() / 1000),
      limit: rateLimit?.limit,
      remaining: rateLimit?.remaining,
    });
  },
});

/**
 * Strict rate limiter for password reset requests
 *
 * Config: 3 requests per 1 hour per IP
 * Use Case: Prevent abuse of password reset functionality
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    error: 'Too Many Password Reset Requests',
    message: 'Too many password reset attempts. Please try again in 1 hour.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  handler: (req: Request, res: Response) => {
    const rateLimit = (req as any).rateLimit;
    res.status(429).json({
      error: 'Too Many Password Reset Requests',
      message: 'Too many password reset attempts from this IP. Please try again in 1 hour.',
      retryAfter: Math.ceil((rateLimit?.resetTime || Date.now()) - Date.now() / 1000),
    });
  },
});

/**
 * Rate limiter for webhook endpoints
 *
 * Config: 200 requests per 15 minutes per source
 * Use Case: Allow higher limits for legitimate webhook calls
 */
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 webhook calls per window
  message: {
    error: 'Webhook Rate Limit Exceeded',
    message: 'Too many webhook requests',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use webhook source or IP as key
    return req.headers['x-webhook-source'] as string || req.ip || 'anonymous';
  },
});

/**
 * Rate limiter for search and analytics endpoints
 *
 * Config: 50 requests per 15 minutes per user
 * Use Case: Prevent excessive resource-intensive queries
 */
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 search requests per window
  message: {
    error: 'Search Rate Limit Exceeded',
    message: 'Too many search requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
  skip: (req: Request) => {
    const authReq = req as AuthRequest;
    // Check if user has admin role (if role property exists in user type)
    return false; // Disable admin skip for now since role doesn't exist in base user type
  },
});

/**
 * Very strict limiter for sensitive operations
 *
 * Config: 10 requests per 1 hour
 * Use Case: Account deletion, security settings changes
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many requests for this sensitive operation',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
});

/**
 * Create a custom rate limiter with specific options
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests per window
 * @param message - Custom error message
 * @returns Rate limiter middleware
 */
export const createCustomLimiter = (
  windowMs: number,
  max: number,
  message: string = 'Too many requests'
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Rate Limit Exceeded',
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const authReq = req as AuthRequest;
      return authReq.user?.id || req.ip || 'anonymous';
    },
  });
};
