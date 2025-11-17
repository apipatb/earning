import { logger } from './logger';
import { isRetryableError } from './errorHandler';
import { TimeoutError } from '../errors/AppError';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  timeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  timeout: 0, // No timeout by default
  onRetry: () => {},
  shouldRetry: isRetryableError,
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    maxDelayMs,
    backoffMultiplier,
    timeout,
    onRetry,
    shouldRetry,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Apply timeout if configured
      if (timeout > 0) {
        return await withTimeout(fn(), timeout, 'retry operation');
      }
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is the last attempt
      const isLastAttempt = attempt === maxAttempts;

      // Check if error is retryable
      if (!shouldRetry(lastError) || isLastAttempt) {
        throw lastError;
      }

      // Log retry attempt
      logger.warn(`Retrying operation (attempt ${attempt}/${maxAttempts})`, {
        error: lastError.message,
        attempt,
        nextRetryIn: currentDelay,
      });

      // Call retry callback
      onRetry(lastError, attempt);

      // Wait before retrying
      await sleep(currentDelay);

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  // This should never be reached due to throw in loop, but TypeScript needs it
  throw lastError!;
}

/**
 * Retry with linear backoff (constant delay)
 */
export async function retryLinear<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return retry(fn, {
    maxAttempts,
    delayMs,
    backoffMultiplier: 1, // No exponential increase
  });
}

/**
 * Retry with jitter to prevent thundering herd
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const baseConfig = { ...config };
  const originalDelayMs = config.delayMs || DEFAULT_RETRY_CONFIG.delayMs;

  return retry(fn, {
    ...baseConfig,
    delayMs: originalDelayMs + Math.random() * originalDelayMs * 0.5, // Add up to 50% jitter
  });
}

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(operation, timeoutMs));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Graceful degradation - try primary function, fallback on error
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  options?: {
    logError?: boolean;
    errorMessage?: string;
  }
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (options?.logError !== false) {
      logger.warn(
        options?.errorMessage || 'Primary operation failed, using fallback',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
    return await fallback();
  }
}

/**
 * Execute optional operation without failing
 */
export async function tryOptional<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  logErrors: boolean = true
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (logErrors) {
      logger.debug('Optional operation failed, using default', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return defaultValue;
  }
}

/**
 * Circuit breaker pattern for external services
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'half-open';
        logger.info('Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    try {
      const result = await fn();

      // Success - reset if we were half-open
      if (this.state === 'half-open') {
        this.reset();
        logger.info('Circuit breaker closed - service recovered');
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      logger.error('Circuit breaker opened - too many failures', {
        failureCount: this.failureCount,
        threshold: this.threshold,
      });
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Batch retry - retry multiple operations with shared config
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  config: RetryConfig = {}
): Promise<Array<T | Error>> {
  const results = await Promise.allSettled(
    operations.map((op) => retry(op, config))
  );

  return results.map((result) =>
    result.status === 'fulfilled' ? result.value : result.reason
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry decorator for class methods
 */
export function Retry(config: RetryConfig = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}
