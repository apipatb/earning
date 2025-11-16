import { getRedisClient } from '../lib/redis';
import { logDebug, logError, logInfo } from '../lib/logger';

export interface CacheOptions {
  ttl?: number; // TTL in seconds
}

/**
 * Cache Service - Provides methods for caching with Redis
 * All methods gracefully handle Redis unavailability
 */
export class CacheService {
  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache (will be JSON serialized)
   * @param ttl Time to live in seconds (optional)
   */
  static async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const client = await getRedisClient();
      if (!client) {
        logDebug('Redis client not available, skipping cache set', { key });
        return false;
      }

      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await client.setEx(key, ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }

      logDebug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logError('Cache set error', error as Error, { key, ttl });
      return false;
    }
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      if (!client) {
        logDebug('Redis client not available, skipping cache get', { key });
        return null;
      }

      const value = await client.get(key);
      if (!value) {
        logDebug('Cache miss', { key });
        return null;
      }

      logDebug('Cache hit', { key });
      const parsed = JSON.parse(value as string) as T;
      return parsed;
    } catch (error) {
      logError('Cache get error', error as Error, { key });
      return null;
    }
  }

  /**
   * Delete a key from cache
   * @param key Cache key
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      if (!client) {
        logDebug('Redis client not available, skipping cache delete', { key });
        return false;
      }

      const result = await client.del(key);
      logDebug('Cache deleted', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logError('Cache delete error', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param pattern Redis glob pattern (e.g., 'user:*')
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = await getRedisClient();
      if (!client) {
        logDebug('Redis client not available, skipping cache invalidate pattern', { pattern });
        return 0;
      }

      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        logDebug('No keys found for pattern', { pattern });
        return 0;
      }

      const deleted = await client.del(keys);
      logDebug('Cache invalidated by pattern', { pattern, deleted });
      return deleted;
    } catch (error) {
      logError('Cache invalidate pattern error', error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Clear entire cache (use with caution)
   */
  static async clear(): Promise<boolean> {
    try {
      const client = await getRedisClient();
      if (!client) {
        logDebug('Redis client not available, skipping cache clear');
        return false;
      }

      await client.flushDb();
      logInfo('Cache cleared');
      return true;
    } catch (error) {
      logError('Cache clear error', error as Error);
      return false;
    }
  }

  /**
   * Automatic cache-or-fetch pattern
   * Gets from cache or fetches from source if not cached
   * @param key Cache key
   * @param fetcher Function that fetches the data
   * @param ttl Time to live in seconds
   */
  static async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        logDebug('Cache hit in withCache', { key });
        return cached;
      }

      // Cache miss - fetch from source
      logDebug('Cache miss in withCache, fetching from source', { key });
      const data = await fetcher();

      // Store in cache
      await this.set(key, data, ttl);

      return data;
    } catch (error) {
      logError('withCache error', error as Error, { key });
      // If caching fails, still try to fetch from source
      return await fetcher();
    }
  }

  /**
   * Get multiple values from cache
   * @param keys Array of cache keys
   */
  static async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    try {
      const client = await getRedisClient();
      const results = new Map<string, T | null>();

      if (!client) {
        logDebug('Redis client not available, returning empty map');
        keys.forEach((key) => results.set(key, null));
        return results;
      }

      const values = await client.mGet(keys);
      keys.forEach((key, index) => {
        const value = values[index];
        results.set(key, value ? (JSON.parse(value as string) as T) : null);
      });

      logDebug('Cache getMany', { keys: keys.length });
      return results;
    } catch (error) {
      logError('Cache getMany error', error as Error, { keysCount: keys.length });
      const results = new Map<string, T | null>();
      keys.forEach((key) => results.set(key, null));
      return results;
    }
  }

  /**
   * Set multiple values in cache
   * @param entries Array of [key, value] pairs
   * @param ttl Time to live in seconds (applied to all entries)
   */
  static async setMany<T>(entries: Array<[string, T]>, ttl?: number): Promise<boolean> {
    try {
      const client = await getRedisClient();
      if (!client) {
        logDebug('Redis client not available, skipping cache setMany');
        return false;
      }

      for (const [key, value] of entries) {
        await this.set(key, value, ttl);
      }

      logDebug('Cache setMany', { entriesCount: entries.length, ttl });
      return true;
    } catch (error) {
      logError('Cache setMany error', error as Error, { entriesCount: entries.length });
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      if (!client) {
        return false;
      }

      const exists = await client.exists(key);
      return exists > 0;
    } catch (error) {
      logError('Cache exists error', error as Error, { key });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key (in seconds)
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist, null on error
   */
  static async getTTL(key: string): Promise<number | null> {
    try {
      const client = await getRedisClient();
      if (!client) {
        return null;
      }

      const ttl = await client.ttl(key);
      return ttl as number;
    } catch (error) {
      logError('Cache getTTL error', error as Error, { key });
      return null;
    }
  }

  /**
   * Extend TTL for an existing key
   */
  static async extendTTL(key: string, ttl: number): Promise<boolean> {
    try {
      const client = await getRedisClient();
      if (!client) {
        return false;
      }

      const result = await client.expire(key, ttl);
      const success = result === 1;
      logDebug('Cache TTL extended', { key, ttl, success });
      return success;
    } catch (error) {
      logError('Cache extendTTL error', error as Error, { key, ttl });
      return false;
    }
  }

  /**
   * Increment a counter in cache
   */
  static async increment(key: string, increment: number = 1): Promise<number | null> {
    try {
      const client = await getRedisClient();
      if (!client) {
        return null;
      }

      const result = await client.incrBy(key, increment);
      logDebug('Cache incremented', { key, increment, newValue: result });
      return result;
    } catch (error) {
      logError('Cache increment error', error as Error, { key, increment });
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<Record<string, any> | null> {
    try {
      const client = await getRedisClient();
      if (!client) {
        return null;
      }

      const dbSize = await client.dbSize();
      const info = await client.info('memory');

      return {
        keysCount: dbSize,
        memoryInfo: info,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logError('Cache getStats error', error as Error);
      return null;
    }
  }
}

export default CacheService;
