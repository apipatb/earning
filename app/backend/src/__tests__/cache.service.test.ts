import CacheService from '../services/cache.service';
import { getRedisClient, initializeRedisClient, flushRedis, disconnectRedis } from '../lib/redis';

describe('CacheService', () => {
  // This test suite assumes Redis is available for testing
  // Set REDIS_ENABLED=false to skip Redis tests
  const isRedisEnabled = process.env.REDIS_ENABLED !== 'false';

  beforeAll(async () => {
    if (isRedisEnabled) {
      await initializeRedisClient();
    }
  });

  afterEach(async () => {
    if (isRedisEnabled) {
      // Clear cache between tests
      await flushRedis();
    }
  });

  afterAll(async () => {
    if (isRedisEnabled) {
      await disconnectRedis();
    }
  });

  describe('set and get', () => {
    test('should set and retrieve a string value', async () => {
      const key = 'test-key-1';
      const value = 'test-value';

      await CacheService.set(key, value);
      const retrieved = await CacheService.get(key);

      expect(retrieved).toBe(value);
    });

    test('should set and retrieve an object value', async () => {
      const key = 'test-key-2';
      const value = { name: 'John', age: 30, email: 'john@example.com' };

      await CacheService.set(key, value);
      const retrieved = await CacheService.get<typeof value>(key);

      expect(retrieved).toEqual(value);
    });

    test('should set and retrieve an array value', async () => {
      const key = 'test-key-3';
      const value = [1, 2, 3, 4, 5];

      await CacheService.set(key, value);
      const retrieved = await CacheService.get<typeof value>(key);

      expect(retrieved).toEqual(value);
    });

    test('should return null for non-existent key', async () => {
      const retrieved = await CacheService.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    test('should overwrite existing value', async () => {
      const key = 'test-key-4';

      await CacheService.set(key, 'value1');
      let retrieved = await CacheService.get(key);
      expect(retrieved).toBe('value1');

      await CacheService.set(key, 'value2');
      retrieved = await CacheService.get(key);
      expect(retrieved).toBe('value2');
    });
  });

  describe('set with TTL', () => {
    test('should set value with TTL and verify expiration time', async () => {
      const key = 'test-ttl-key';
      const value = 'test-value';
      const ttl = 3600; // 1 hour

      await CacheService.set(key, value, ttl);
      const retrieved = await CacheService.get(key);
      expect(retrieved).toBe(value);

      const remainingTTL = await CacheService.getTTL(key);
      expect(remainingTTL).toBeLessThanOrEqual(ttl);
      expect(remainingTTL).toBeGreaterThan(ttl - 10); // Account for test execution time
    });

    test('should set value with short TTL and verify it expires', async () => {
      const key = 'test-ttl-short';
      const value = 'test-value';
      const ttl = 1; // 1 second

      await CacheService.set(key, value, ttl);
      let retrieved = await CacheService.get(key);
      expect(retrieved).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      retrieved = await CacheService.get(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete an existing key', async () => {
      const key = 'test-delete-key';
      const value = 'test-value';

      await CacheService.set(key, value);
      let exists = await CacheService.exists(key);
      expect(exists).toBe(true);

      await CacheService.delete(key);
      exists = await CacheService.exists(key);
      expect(exists).toBe(false);
    });

    test('should return false when deleting non-existent key', async () => {
      const result = await CacheService.delete('non-existent-key');
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    test('should return true for existing key', async () => {
      const key = 'test-exists-key';
      await CacheService.set(key, 'value');

      const exists = await CacheService.exists(key);
      expect(exists).toBe(true);
    });

    test('should return false for non-existent key', async () => {
      const exists = await CacheService.exists('non-existent-key');
      expect(exists).toBe(false);
    });
  });

  describe('invalidatePattern', () => {
    test('should delete keys matching pattern', async () => {
      await CacheService.set('user:1:profile', { id: 1, name: 'User 1' });
      await CacheService.set('user:1:settings', { theme: 'dark' });
      await CacheService.set('user:2:profile', { id: 2, name: 'User 2' });

      const deleted = await CacheService.invalidatePattern('user:1:*');
      expect(deleted).toBe(2);

      expect(await CacheService.exists('user:1:profile')).toBe(false);
      expect(await CacheService.exists('user:1:settings')).toBe(false);
      expect(await CacheService.exists('user:2:profile')).toBe(true);
    });

    test('should return 0 when no keys match pattern', async () => {
      const deleted = await CacheService.invalidatePattern('non-existent:*');
      expect(deleted).toBe(0);
    });

    test('should handle complex patterns', async () => {
      await CacheService.set('app:cache:users:1', 'user1');
      await CacheService.set('app:cache:users:2', 'user2');
      await CacheService.set('app:cache:products:1', 'product1');

      const deleted = await CacheService.invalidatePattern('app:cache:users:*');
      expect(deleted).toBe(2);

      expect(await CacheService.exists('app:cache:products:1')).toBe(true);
    });
  });

  describe('clear', () => {
    test('should clear all cache', async () => {
      await CacheService.set('key1', 'value1');
      await CacheService.set('key2', 'value2');
      await CacheService.set('key3', 'value3');

      await CacheService.clear();

      expect(await CacheService.exists('key1')).toBe(false);
      expect(await CacheService.exists('key2')).toBe(false);
      expect(await CacheService.exists('key3')).toBe(false);
    });
  });

  describe('withCache', () => {
    test('should fetch from fetcher on cache miss', async () => {
      const key = 'test-withcache-1';
      const fetchedValue = { id: 1, data: 'test' };
      let fetcherCalled = false;

      const result = await CacheService.withCache(key, async () => {
        fetcherCalled = true;
        return fetchedValue;
      });

      expect(fetcherCalled).toBe(true);
      expect(result).toEqual(fetchedValue);
    });

    test('should return cached value on cache hit', async () => {
      const key = 'test-withcache-2';
      const cachedValue = { id: 2, data: 'cached' };
      let fetcherCallCount = 0;

      // First call - cache miss
      let result = await CacheService.withCache(key, async () => {
        fetcherCallCount++;
        return cachedValue;
      });
      expect(fetcherCallCount).toBe(1);
      expect(result).toEqual(cachedValue);

      // Second call - cache hit
      result = await CacheService.withCache(key, async () => {
        fetcherCallCount++;
        return cachedValue;
      });
      expect(fetcherCallCount).toBe(1); // Should not increment
      expect(result).toEqual(cachedValue);
    });

    test('should cache with TTL', async () => {
      const key = 'test-withcache-ttl';
      const value = 'test-value';
      let fetcherCallCount = 0;

      // First call
      const result1 = await CacheService.withCache(
        key,
        async () => {
          fetcherCallCount++;
          return value;
        },
        1 // 1 second TTL
      );
      expect(result1).toBe(value);
      expect(fetcherCallCount).toBe(1);

      // Second call immediately after (should be cached)
      const result2 = await CacheService.withCache(
        key,
        async () => {
          fetcherCallCount++;
          return value;
        },
        1
      );
      expect(result2).toBe(value);
      expect(fetcherCallCount).toBe(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Third call after expiration (should call fetcher again)
      const result3 = await CacheService.withCache(
        key,
        async () => {
          fetcherCallCount++;
          return value;
        },
        1
      );
      expect(result3).toBe(value);
      expect(fetcherCallCount).toBe(2);
    });
  });

  describe('getMany and setMany', () => {
    test('should set and get multiple values', async () => {
      const entries = [
        ['key1', { id: 1 }],
        ['key2', { id: 2 }],
        ['key3', { id: 3 }],
      ] as Array<[string, any]>;

      await CacheService.setMany(entries);

      const results = await CacheService.getMany(['key1', 'key2', 'key3']);

      expect(results.get('key1')).toEqual({ id: 1 });
      expect(results.get('key2')).toEqual({ id: 2 });
      expect(results.get('key3')).toEqual({ id: 3 });
    });

    test('should return null for missing keys in getMany', async () => {
      await CacheService.set('key1', 'value1');

      const results = await CacheService.getMany(['key1', 'missing-key']);

      expect(results.get('key1')).toBe('value1');
      expect(results.get('missing-key')).toBeNull();
    });

    test('should set multiple values with TTL', async () => {
      const entries = [
        ['ttl-key1', 'value1'],
        ['ttl-key2', 'value2'],
      ] as Array<[string, any]>;

      await CacheService.setMany(entries, 1);

      let results = await CacheService.getMany(['ttl-key1', 'ttl-key2']);
      expect(results.get('ttl-key1')).toBe('value1');
      expect(results.get('ttl-key2')).toBe('value2');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      results = await CacheService.getMany(['ttl-key1', 'ttl-key2']);
      expect(results.get('ttl-key1')).toBeNull();
      expect(results.get('ttl-key2')).toBeNull();
    });
  });

  describe('getTTL', () => {
    test('should return remaining TTL', async () => {
      const key = 'test-ttl';
      const ttl = 60;

      await CacheService.set(key, 'value', ttl);
      const remainingTTL = await CacheService.getTTL(key);

      expect(remainingTTL).toBeLessThanOrEqual(ttl);
      expect(remainingTTL).toBeGreaterThan(ttl - 5);
    });

    test('should return -1 for key without expiry', async () => {
      const key = 'test-no-ttl';
      await CacheService.set(key, 'value'); // No TTL

      const ttl = await CacheService.getTTL(key);
      expect(ttl).toBe(-1);
    });

    test('should return -2 for non-existent key', async () => {
      const ttl = await CacheService.getTTL('non-existent');
      expect(ttl).toBe(-2);
    });
  });

  describe('extendTTL', () => {
    test('should extend TTL of existing key', async () => {
      const key = 'test-extend-ttl';
      await CacheService.set(key, 'value', 10);

      let ttl = await CacheService.getTTL(key);
      expect(ttl).toBeLessThanOrEqual(10);

      await CacheService.extendTTL(key, 60);
      ttl = await CacheService.getTTL(key);
      expect(ttl).toBeLessThanOrEqual(60);
      expect(ttl).toBeGreaterThan(50);
    });

    test('should return false for non-existent key', async () => {
      const result = await CacheService.extendTTL('non-existent', 60);
      expect(result).toBe(false);
    });
  });

  describe('increment', () => {
    test('should increment counter', async () => {
      const key = 'test-counter';

      let value = await CacheService.increment(key);
      expect(value).toBe(1);

      value = await CacheService.increment(key);
      expect(value).toBe(2);

      value = await CacheService.increment(key);
      expect(value).toBe(3);
    });

    test('should increment by custom amount', async () => {
      const key = 'test-counter-custom';

      let value = await CacheService.increment(key, 10);
      expect(value).toBe(10);

      value = await CacheService.increment(key, 5);
      expect(value).toBe(15);
    });
  });

  describe('getStats', () => {
    test('should return cache statistics', async () => {
      await CacheService.set('stat-key-1', 'value1');
      await CacheService.set('stat-key-2', 'value2');

      const stats = await CacheService.getStats();
      expect(stats).not.toBeNull();
      expect(stats?.keysCount).toBeGreaterThanOrEqual(2);
      expect(stats?.memoryInfo).toBeDefined();
      expect(stats?.timestamp).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    test('should handle user profile caching pattern', async () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'John Doe', email: 'john@example.com' };

      const cacheKey = `profile:${userId}`;
      const CACHE_TTL = 300; // 5 minutes

      // First call - fetch from source
      let cachedProfile = await CacheService.withCache(
        cacheKey,
        async () => profile,
        CACHE_TTL
      );
      expect(cachedProfile).toEqual(profile);

      // Second call - should be cached
      const cachedProfile2 = await CacheService.withCache(
        cacheKey,
        async () => {
          throw new Error('Should not be called');
        },
        CACHE_TTL
      );
      expect(cachedProfile2).toEqual(profile);
    });

    test('should handle cache invalidation on updates', async () => {
      const userId = 'user-456';
      const cacheKey = `profile:${userId}`;

      // Cache initial value
      await CacheService.set(cacheKey, { name: 'Original' });
      expect(await CacheService.get(cacheKey)).toEqual({ name: 'Original' });

      // Invalidate cache
      await CacheService.invalidatePattern(`profile:${userId}`);
      expect(await CacheService.exists(cacheKey)).toBe(false);

      // Cache new value
      await CacheService.set(cacheKey, { name: 'Updated' });
      expect(await CacheService.get(cacheKey)).toEqual({ name: 'Updated' });
    });

    test('should handle multi-level caching (nested data)', async () => {
      const complexData = {
        user: { id: 1, name: 'User 1' },
        posts: [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' },
        ],
        metadata: {
          created: new Date().toISOString(),
          version: 1,
        },
      };

      const cacheKey = 'complex-data:user-1';
      await CacheService.set(cacheKey, complexData);

      const retrieved = await CacheService.get(cacheKey);
      expect(retrieved).toEqual(complexData);
      expect(retrieved?.posts.length).toBe(2);
      expect(retrieved?.metadata.version).toBe(1);
    });
  });
});
