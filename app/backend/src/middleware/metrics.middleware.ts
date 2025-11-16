import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest, recordError } from '../lib/metrics';

/**
 * Metrics middleware for tracking HTTP requests
 * Records request duration, method, status, and endpoint
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Record start time
  const startTime = Date.now();

  // Extract endpoint path (normalize to handle variables)
  const endpoint = normalizeEndpoint(req.path);

  // Track when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    // Record metrics
    recordHttpRequest(req.method, status, endpoint, duration);

    // Log slow requests (>1000ms)
    if (duration > 1000) {
      console.warn(`Slow request detected: ${req.method} ${endpoint} took ${duration}ms`);
    }
  });

  // Handle errors that might not emit 'finish' event
  res.on('close', () => {
    if (!res.writableEnded) {
      const duration = Date.now() - startTime;
      recordError('request_aborted', endpoint);
    }
  });

  next();
};

/**
 * Normalize endpoint path to avoid high cardinality metrics
 * Converts /api/v1/users/123 to /api/v1/users/:id
 */
function normalizeEndpoint(path: string): string {
  // Remove query parameters
  const pathWithoutQuery = path.split('?')[0];

  // Replace numeric IDs with placeholders
  let normalized = pathWithoutQuery.replace(/\/\d+/g, '/:id');

  // Replace UUIDs with placeholders
  normalized = normalized.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:uuid'
  );

  // Limit length to avoid memory issues
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100) + '...';
  }

  return normalized;
}

/**
 * Metrics filter middleware
 * Only records metrics for /api/* routes
 */
export const metricsFilterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.path.startsWith('/api/')) {
    metricsMiddleware(req, res, next);
  } else {
    next();
  }
};

export default metricsFilterMiddleware;
