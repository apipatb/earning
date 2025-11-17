import { logger } from './logger';

/**
 * Measures the execution time of an async function and logs if it exceeds threshold
 * @param name - Descriptive name for the operation
 * @param fn - Async function to measure
 * @param threshold - Milliseconds threshold for logging (default: 1000ms)
 * @returns Promise with the result of the function
 */
export async function measureQueryTime<T>(
  name: string,
  fn: () => Promise<T>,
  threshold: number = 1000
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    if (duration > threshold) {
      logger.warn(`[SLOW QUERY] ${name}: ${duration}ms`);
    } else if (process.env.LOG_ALL_QUERIES === 'true') {
      logger.debug(`[QUERY] ${name}: ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`[FAILED QUERY] ${name}: ${duration}ms`, { error });
    throw error;
  }
}

/**
 * Decorator for measuring method execution time
 * @param threshold - Milliseconds threshold for logging (default: 1000ms)
 */
export function MeasurePerformance(threshold: number = 1000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const methodName = `${target.constructor.name}.${propertyKey}`;

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        if (duration > threshold) {
          logger.warn(`[SLOW METHOD] ${methodName}: ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(`[FAILED METHOD] ${methodName}: ${duration}ms`, { error });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Simple performance metrics collector
 */
export class PerformanceMetrics {
  private metrics: Map<string, { count: number; totalTime: number; minTime: number; maxTime: number }> = new Map();

  record(name: string, duration: number): void {
    const existing = this.metrics.get(name);

    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
    } else {
      this.metrics.set(name, {
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
      });
    }
  }

  getMetrics(name: string) {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    return {
      count: metric.count,
      avgTime: metric.totalTime / metric.count,
      minTime: metric.minTime,
      maxTime: metric.maxTime,
      totalTime: metric.totalTime,
    };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};

    for (const [name, metric] of this.metrics.entries()) {
      result[name] = {
        count: metric.count,
        avgTime: metric.totalTime / metric.count,
        minTime: metric.minTime,
        maxTime: metric.maxTime,
        totalTime: metric.totalTime,
      };
    }

    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Global instance for application-wide metrics
export const globalMetrics = new PerformanceMetrics();

/**
 * Measure and record metrics for an async operation
 */
export async function measureAndRecord<T>(
  name: string,
  fn: () => Promise<T>,
  threshold: number = 1000
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    globalMetrics.record(name, duration);

    if (duration > threshold) {
      logger.warn(`[SLOW OPERATION] ${name}: ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    globalMetrics.record(name, duration);
    logger.error(`[FAILED OPERATION] ${name}: ${duration}ms`, { error });
    throw error;
  }
}

/**
 * Memory usage monitoring
 */
export function logMemoryUsage(label: string): void {
  const usage = process.memoryUsage();
  logger.info(`[MEMORY] ${label}`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
  });
}

/**
 * Get formatted memory usage stats
 */
export function getMemoryStats() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  };
}
