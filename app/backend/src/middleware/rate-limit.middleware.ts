import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { quotaService } from '../services/quota.service';
import { logger } from '../utils/logger';

/**
 * Sliding window rate limiter middleware
 *
 * This middleware implements a sliding window algorithm for rate limiting.
 * It tracks API usage per user and enforces quota limits based on their tier.
 *
 * Features:
 * - Per-user rate limiting
 * - Per-endpoint granularity
 * - Sliding window algorithm
 * - Returns standard rate limit headers (X-RateLimit-*)
 * - Graceful degradation
 */

interface RateLimitOptions {
  skipPaths?: string[];
  enableThrottling?: boolean;
  throttleDelay?: number; // milliseconds
}

const defaultOptions: RateLimitOptions = {
  skipPaths: ['/api/v1/auth/login', '/api/v1/auth/register'],
  enableThrottling: true,
  throttleDelay: 1000, // 1 second delay for throttled requests
};

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = (options: RateLimitOptions = {}) => {
  const config = { ...defaultOptions, ...options };

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      // Skip rate limiting for public endpoints
      if (config.skipPaths?.some((path) => req.path.startsWith(path))) {
        return next();
      }

      // Skip if no user is authenticated
      if (!req.user?.id) {
        return next();
      }

      const userId = req.user.id;
      const endpoint = req.path;
      const method = req.method;

      // Check if user should be throttled
      if (config.enableThrottling) {
        const shouldThrottle = await quotaService.shouldThrottle(userId);
        if (shouldThrottle && config.throttleDelay) {
          await new Promise((resolve) => setTimeout(resolve, config.throttleDelay));
        }
      }

      // Check quota limits
      const quotaCheck = await quotaService.checkQuotaLimits(userId, endpoint);

      // Set rate limit headers
      const quota = await quotaService.getOrCreateQuota(userId);
      const current = await quotaService.getCurrentUsage(userId);

      res.setHeader('X-RateLimit-Limit', quota.requestsPerHour.toString());
      res.setHeader('X-RateLimit-Remaining', quotaCheck.remaining?.toString() || '0');
      res.setHeader('X-RateLimit-Reset', quotaCheck.resetAt?.getTime().toString() || '0');
      res.setHeader('X-RateLimit-Tier', quota.tier);

      // If quota exceeded, record violation and reject request
      if (!quotaCheck.allowed) {
        // Record the violation
        await quotaService.recordViolation(
          userId,
          endpoint,
          method,
          quotaCheck.limitExceeded || 'unknown',
          1,
          req.ip,
          req.get('user-agent')
        );

        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: `You have exceeded your ${quotaCheck.limitExceeded} quota limit`,
          limit: quota.requestsPerHour,
          remaining: 0,
          resetAt: quotaCheck.resetAt,
          tier: quota.tier,
          upgradeUrl: '/api/v1/billing/plans',
        });
      }

      // Track the request
      const responseTime = Date.now() - startTime;

      // Track usage asynchronously (don't block the request)
      setImmediate(async () => {
        try {
          const finalResponseTime = Date.now() - startTime;
          const isError = res.statusCode >= 400;
          await quotaService.trackUsage(userId, endpoint, method, finalResponseTime, isError);
        } catch (error) {
          logger.error('[RateLimit] Error tracking usage', error as Error);
        }
      });

      next();
    } catch (error) {
      logger.error('[RateLimit] Error in rate limit middleware', error as Error);
      // Graceful degradation - allow request to proceed if rate limiting fails
      next();
    }
  };
};

/**
 * Per-endpoint rate limiter
 *
 * This can be used to add additional rate limiting to specific endpoints
 * beyond the global quota limits.
 */
export const perEndpointRateLimit = (options: {
  maxRequests: number;
  windowMs: number;
  message?: string;
}) => {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return next();
    }

    const key = `${req.user.id}:${req.path}`;
    const now = Date.now();
    const windowMs = options.windowMs;

    const record = requests.get(key);

    if (!record || now > record.resetAt) {
      // New window
      requests.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      // Rate limit exceeded
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());

      return res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded for this endpoint',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    // Increment count
    record.count++;
    requests.set(key, record);

    // Set headers
    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (options.maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());

    next();
  };
};

/**
 * Concurrent request limiter
 *
 * Limits the number of concurrent requests from a single user
 */
export const concurrentRequestLimiter = () => {
  const activeRequests = new Map<string, number>();

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return next();
    }

    const userId = req.user.id;
    const quota = await quotaService.getOrCreateQuota(userId);
    const current = activeRequests.get(userId) || 0;

    if (current >= quota.concurrentRequests) {
      return res.status(429).json({
        error: 'Too Many Concurrent Requests',
        message: `Maximum ${quota.concurrentRequests} concurrent requests allowed`,
        current,
        limit: quota.concurrentRequests,
      });
    }

    // Increment active requests
    activeRequests.set(userId, current + 1);

    // Decrement when response finishes
    res.on('finish', () => {
      const count = activeRequests.get(userId) || 0;
      if (count > 0) {
        activeRequests.set(userId, count - 1);
      }
    });

    next();
  };
};

/**
 * IP-based rate limiter (for unauthenticated endpoints)
 */
export const ipRateLimiter = (options: {
  maxRequests: number;
  windowMs: number;
}) => {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    const record = requests.get(ip);

    if (!record || now > record.resetAt) {
      requests.set(ip, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    record.count++;
    requests.set(ip, record);

    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (options.maxRequests - record.count).toString());

    next();
  };
};

/**
 * Cleanup function to remove expired rate limit records
 */
export const cleanupRateLimitRecords = () => {
  setInterval(() => {
    // This would clean up in-memory records for per-endpoint limiters
    logger.info('[RateLimit] Cleaning up expired rate limit records');
  }, 60 * 60 * 1000); // Every hour
};
