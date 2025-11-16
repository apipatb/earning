import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import CacheService from '../services/cache.service';
import { logDebug } from '../lib/logger';

export interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request): string => {
  const userId = (req as any).user?.id || 'anonymous';
  const path = req.path;
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  const cacheKeyString = `${userId}:${path}${query ? '?' + query : ''}`;
  const hash = createHash('sha256').update(cacheKeyString).digest('hex');
  return `http:${hash}`;
};

/**
 * Generate ETag for response body
 */
const generateETag = (data: any): string => {
  const stringified = typeof data === 'string' ? data : JSON.stringify(data);
  return `"${createHash('md5').update(stringified).digest('hex')}"`;
};

/**
 * HTTP Response caching middleware
 * Caches GET requests by URL and handles cache headers
 *
 * Usage: app.use(cacheMiddleware)
 */
export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip caching for non-GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Skip caching if nocache parameter is present
  if (req.query.nocache === 'true') {
    logDebug('Cache skipped by nocache parameter', { path: req.path });
    return next();
  }

  // Skip caching for certain endpoints
  const skipCachePaths = ['/health', '/docs', '/openapi.json'];
  if (skipCachePaths.some((path) => req.path.includes(path))) {
    return next();
  }

  const cacheKey = generateCacheKey(req);
  const requestId = (req as any).requestId || 'unknown';

  // Override res.json to intercept responses
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    // Store response for caching
    const statusCode = res.statusCode;
    const eTag = generateETag(data);

    // Set cache headers
    const cacheControl = process.env.NODE_ENV === 'production' ? 'public, max-age=300' : 'private, max-age=60';
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('ETag', eTag);
    res.setHeader('X-Cache-Key', cacheKey);

    // Check If-None-Match header for 304 response
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === eTag) {
      logDebug('Returning 304 Not Modified', { path: req.path, eTag });
      return res.status(304).end();
    }

    // Cache successful GET responses (status 200)
    if (statusCode === 200) {
      const ttl = parseInt(process.env.CACHE_TTL_PROFILE || '300', 10);
      CacheService.set(cacheKey, {
        status: statusCode,
        headers: {
          'ETag': eTag,
          'Content-Type': res.getHeader('content-type') as string || 'application/json',
        },
        body: data,
        timestamp: Date.now(),
      } as CachedResponse, ttl).catch(() => {
        // Silently handle cache errors
      });

      logDebug('Response cached', {
        path: req.path,
        requestId,
        ttl,
        eTag,
      });
    }

    // Call original json method
    return originalJson(data);
  };

  // Try to get from cache
  CacheService.get<CachedResponse>(cacheKey)
    .then((cachedData) => {
      if (cachedData) {
        logDebug('Serving from cache', {
          path: req.path,
          requestId,
          eTag: cachedData.headers.ETag,
        });

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('ETag', cachedData.headers.ETag);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        // Check If-None-Match header
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === cachedData.headers.ETag) {
          logDebug('Returning 304 Not Modified from cache', { path: req.path });
          return res.status(304).end();
        }

        // Return cached response
        return res.status(cachedData.status).json(cachedData.body);
      }

      // No cache hit
      res.setHeader('X-Cache', 'MISS');
      next();
    })
    .catch(() => {
      // Cache error, continue with normal flow
      res.setHeader('X-Cache', 'ERROR');
      next();
    });
};

/**
 * Cache invalidation helper for middleware
 * Invalidates cache for specific patterns
 */
export const invalidateCache = async (patterns: string | string[]): Promise<void> => {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of patternArray) {
    await CacheService.invalidatePattern(pattern);
  }
};

/**
 * Middleware to invalidate user-specific cache on mutations
 * Apply to POST, PUT, DELETE endpoints to clear user's cache
 */
export const invalidateUserCache = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const userId = (req as any).user?.id;
    if (userId) {
      // Invalidate all cache for this user
      const userCachePattern = `${userId}:*`;
      CacheService.invalidatePattern(userCachePattern)
        .then((deleted) => {
          logDebug('User cache invalidated', {
            userId,
            pattern: userCachePattern,
            deleted,
          });
        })
        .catch(() => {
          // Silently handle errors
        });
    }
  }

  next();
};

/**
 * Conditional caching middleware for specific routes
 * Only caches responses matching certain criteria
 */
export const conditionalCacheMiddleware = (options?: {
  ttl?: number;
  skipPaths?: string[];
  cachePattern?: (req: Request) => boolean;
}) => {
  const {
    ttl = 300,
    skipPaths = [],
    cachePattern = () => true,
  } = options || {};

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || !cachePattern(req) || skipPaths.some((p) => req.path.includes(p))) {
      return next();
    }

    const cacheKey = `conditional:${generateCacheKey(req)}`;

    // Try to get from cache
    CacheService.get(cacheKey)
      .then((cachedData) => {
        if (cachedData) {
          logDebug('Conditional cache hit', { path: req.path });
          return res.json(cachedData);
        }

        // Cache miss
        const originalJson = res.json.bind(res);
        res.json = function (data: any) {
          if (res.statusCode === 200) {
            CacheService.set(cacheKey, data, ttl).catch(() => {
              // Silently handle cache errors
            });
          }
          return originalJson(data);
        };

        next();
      })
      .catch(() => {
        next();
      });
  };
};

export default cacheMiddleware;
