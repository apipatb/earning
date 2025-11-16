import { createClient, RedisClientType } from 'redis';
import { logInfo, logError, logDebug, logWarn } from './logger';

// Global Redis client instance
let redisClient: RedisClientType | null = null;
let isConnecting = false;

export interface RedisConfig {
  url: string;
  enabled: boolean;
}

/**
 * Initialize Redis client with connection pooling and error handling
 */
export const initializeRedisClient = async (): Promise<RedisClientType | null> => {
  // Return existing client if already initialized
  if (redisClient) {
    return redisClient;
  }

  // Prevent concurrent connection attempts
  if (isConnecting) {
    logDebug('Redis connection in progress, waiting...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (redisClient) {
          clearInterval(checkInterval);
          resolve(redisClient);
        }
      }, 100);
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, 5000);
    });
  }

  try {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';
    if (!redisEnabled) {
      logInfo('Redis caching is disabled');
      return null;
    }

    isConnecting = true;

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    logDebug('Initializing Redis client', { url: redisUrl.replace(/:[^@]*@/, ':***@') });

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          // Exponential backoff: 100ms, 200ms, 400ms, up to 3 seconds
          const delay = Math.min(Math.exp(retries) * 100, 3000);
          logDebug('Redis reconnecting', { attempt: retries, delayMs: delay });
          return delay;
        },
        connectTimeout: 10000,
        keepAlive: 30000,
      },
    });

    // Handle connection events
    redisClient.on('connect', () => {
      logInfo('Redis client connected');
    });

    redisClient.on('ready', () => {
      logInfo('Redis client ready for commands');
    });

    redisClient.on('error', (error: Error) => {
      logError('Redis client error', error);
    });

    redisClient.on('reconnecting', () => {
      logWarn('Redis client reconnecting');
    });

    // Connect to Redis
    await redisClient.connect();
    isConnecting = false;

    logInfo('Redis client successfully initialized and connected');
    return redisClient;
  } catch (error) {
    isConnecting = false;
    logError('Failed to initialize Redis client', error as Error, {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    redisClient = null;
    return null;
  }
};

/**
 * Get the current Redis client instance
 */
export const getRedisClient = async (): Promise<RedisClientType | null> => {
  if (!redisClient && !isConnecting) {
    return await initializeRedisClient();
  }
  return redisClient;
};

/**
 * Disconnect Redis client gracefully
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      logInfo('Disconnecting Redis client');
      await redisClient.quit();
      redisClient = null;
      logInfo('Redis client disconnected');
    } catch (error) {
      logError('Error disconnecting Redis client', error as Error);
      // Force disconnect if quit fails
      try {
        await redisClient?.disconnect();
      } catch (err) {
        logError('Error during Redis forced disconnect', err as Error);
      }
    }
  }
};

/**
 * Check if Redis is available and healthy
 */
export const isRedisHealthy = async (): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    if (!client) {
      return false;
    }

    // Test connection with a simple ping
    const response = await client.ping();
    return response === 'PONG';
  } catch (error) {
    logDebug('Redis health check failed', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
};

/**
 * Flush all data from Redis (use with caution!)
 */
export const flushRedis = async (): Promise<void> => {
  try {
    const client = await getRedisClient();
    if (!client) {
      logWarn('Cannot flush Redis - client not available');
      return;
    }

    await client.flushAll();
    logInfo('Redis database flushed');
  } catch (error) {
    logError('Error flushing Redis', error as Error);
  }
};

/**
 * Get Redis info/stats
 */
export const getRedisStats = async (): Promise<Record<string, any> | null> => {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null;
    }

    const info = await client.info();
    const dbSizeBytes = await client.dbSize();

    return {
      info,
      dbSizeBytes,
      connected: client.isOpen,
      ready: client.isReady,
    };
  } catch (error) {
    logError('Error getting Redis stats', error as Error);
    return null;
  }
};

export default {
  initializeRedisClient,
  getRedisClient,
  disconnectRedis,
  isRedisHealthy,
  flushRedis,
  getRedisStats,
};
