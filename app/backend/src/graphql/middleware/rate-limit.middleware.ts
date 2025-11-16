import { GraphQLError } from 'graphql';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

export const rateLimitMiddleware = (userId: string, operationName?: string) => {
  const key = `${userId}-${operationName || 'unknown'}`;
  const now = Date.now();

  // Clean up old entries
  if (store[key] && store[key].resetTime < now) {
    delete store[key];
  }

  // Initialize or get existing rate limit data
  if (!store[key]) {
    store[key] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }

  // Increment request count
  store[key].count++;

  // Check if limit exceeded
  if (store[key].count > RATE_LIMIT_MAX_REQUESTS) {
    const resetIn = Math.ceil((store[key].resetTime - now) / 1000);
    throw new GraphQLError(
      `Rate limit exceeded. Try again in ${resetIn} seconds.`,
      {
        extensions: {
          code: 'RATE_LIMIT_EXCEEDED',
          resetIn,
        },
      }
    );
  }

  return {
    remaining: RATE_LIMIT_MAX_REQUESTS - store[key].count,
    resetIn: Math.ceil((store[key].resetTime - now) / 1000),
  };
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);
