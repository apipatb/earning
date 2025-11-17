import { logger } from './logger';

/**
 * Cache Utility
 *
 * Provides in-memory caching with TTL support for frequently accessed data.
 * This helps reduce database queries and improve API response times.
 *
 * Features:
 * - TTL (Time To Live) support for automatic expiration
 * - Flexible key-based invalidation
 * - Type-safe get/set operations
 * - Cache statistics and monitoring
 * - Automatic cleanup of expired entries
 *
 * Note: This is an in-memory cache, suitable for single-instance deployments.
 * For production with multiple instances, consider using Redis.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  size: number;
}

class Cache {
  private storage = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
    size: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start automatic cleanup of expired entries every 5 minutes
    this.startCleanup();
  }

  /**
   * Set a value in the cache with optional TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    const expiresAt = Date.now() + ttlMs;

    this.storage.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      hits: 0,
    });

    this.stats.sets++;
    this.stats.size = this.storage.size;

    logger.debug(`[Cache] Set key: ${key}, TTL: ${ttlMs}ms`);
  }

  /**
   * Get a value from the cache
   *
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.storage.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.debug(`[Cache] Miss: ${key}`);
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.storage.delete(key);
      this.stats.misses++;
      this.stats.size = this.storage.size;
      logger.debug(`[Cache] Expired: ${key}`);
      return null;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;

    logger.debug(`[Cache] Hit: ${key} (hits: ${entry.hits})`);
    return entry.value as T;
  }

  /**
   * Check if a key exists in the cache and is not expired
   *
   * @param key - Cache key
   * @returns true if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.storage.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.storage.delete(key);
      this.stats.size = this.storage.size;
      return false;
    }

    return true;
  }

  /**
   * Invalidate one or more cache keys
   *
   * @param keys - Single key or array of keys to invalidate
   */
  invalidate(keys: string | string[]): void {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    let invalidatedCount = 0;
    for (const key of keyArray) {
      if (this.storage.delete(key)) {
        invalidatedCount++;
      }
    }

    this.stats.invalidations += invalidatedCount;
    this.stats.size = this.storage.size;

    logger.debug(`[Cache] Invalidated ${invalidatedCount} keys: ${keyArray.join(', ')}`);
  }

  /**
   * Invalidate all keys matching a pattern
   *
   * @param pattern - Regex pattern or string prefix to match
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string'
      ? new RegExp(`^${pattern}`)
      : pattern;

    const keysToDelete: string[] = [];
    const keys = Array.from(this.storage.keys());

    for (const key of keys) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    this.invalidate(keysToDelete);
    logger.debug(`[Cache] Invalidated pattern: ${pattern}, count: ${keysToDelete.length}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.storage.size;
    this.storage.clear();
    this.stats.invalidations += size;
    this.stats.size = 0;

    logger.info(`[Cache] Cleared all entries (${size} items)`);
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      size: this.storage.size,
    };

    logger.debug('[Cache] Statistics reset');
  }

  /**
   * Get all cache keys (for debugging)
   *
   * @returns Array of cache keys
   */
  getKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * Get cache entry metadata
   *
   * @param key - Cache key
   * @returns Entry metadata or null
   */
  getMetadata(key: string): {
    expiresAt: number;
    createdAt: number;
    hits: number;
    ttl: number;
  } | null {
    const entry = this.storage.get(key);

    if (!entry) {
      return null;
    }

    return {
      expiresAt: entry.expiresAt,
      createdAt: entry.createdAt,
      hits: entry.hits,
      ttl: Math.max(0, entry.expiresAt - Date.now()),
    };
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);

    logger.info('[Cache] Started automatic cleanup (interval: 5 minutes)');
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('[Cache] Stopped automatic cleanup');
    }
  }

  /**
   * Manually cleanup expired entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;
    const entries = Array.from(this.storage.entries());

    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.storage.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.size = this.storage.size;
      logger.debug(`[Cache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get or set a value (lazy loading pattern)
   *
   * @param key - Cache key
   * @param factory - Function to generate value if not cached
   * @param ttlMs - Time to live in milliseconds
   * @returns Cached or newly generated value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }
}

// Export singleton instance
export const cache = new Cache();

/**
 * Common cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Cache key generators for common entities
 */
export const CacheKeys = {
  // User-related
  userSettings: (userId: string) => `user:${userId}:settings`,
  userQuota: (userId: string) => `user:${userId}:quota`,
  userSubscription: (userId: string) => `user:${userId}:subscription`,

  // Product-related
  products: (userId: string) => `products:${userId}`,
  product: (userId: string, productId: string) => `product:${userId}:${productId}`,

  // Platform-related
  platforms: (userId: string) => `platforms:${userId}`,
  platform: (userId: string, platformId: string) => `platform:${userId}:${platformId}`,

  // Invoice-related
  invoices: (userId: string) => `invoices:${userId}`,
  invoice: (userId: string, invoiceId: string) => `invoice:${userId}:${invoiceId}`,
  invoiceStatuses: () => `invoice:statuses`,

  // Analytics-related
  analytics: (userId: string, period: string) => `analytics:${userId}:${period}`,

  // Customer-related
  customers: (userId: string) => `customers:${userId}`,
  customer: (userId: string, customerId: string) => `customer:${userId}:${customerId}`,

  // Report-related
  report: (userId: string, reportType: string, params: string) =>
    `report:${userId}:${reportType}:${params}`,
} as const;

/**
 * Helper function to create cache middleware for Express routes
 *
 * @param keyGenerator - Function to generate cache key from request
 * @param ttlMs - Time to live in milliseconds
 * @returns Express middleware
 */
export const cacheMiddleware = (
  keyGenerator: (req: any) => string,
  ttlMs: number = CacheTTL.FIVE_MINUTES
) => {
  return (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    const cached = cache.get(key);

    if (cached !== null) {
      // Set cache headers
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = (data: any) => {
      cache.set(key, data, ttlMs);
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      return originalJson(data);
    };

    next();
  };
};
