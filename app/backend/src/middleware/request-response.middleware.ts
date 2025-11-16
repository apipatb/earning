import { Request, Response, NextFunction } from 'express';
import { logDebug, logInfo, logError } from '../lib/logger';

/**
 * Interface for request metadata
 */
interface RequestMetadata {
  requestId: string;
  startTime: number;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  userId?: string;
}

/**
 * Extend Express Request type to include our custom properties
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      requestMetadata?: RequestMetadata;
    }
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Request/Response interceptor middleware
 * Handles:
 * - Request logging with unique ID
 * - Request/response timing
 * - Response normalization
 * - Request tracing
 */
export const requestResponseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate unique request ID
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  req.requestId = requestId;

  // Extract metadata
  const startTime = Date.now();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'];
  const userId = (req as any).user?.id;

  // Store metadata for use in response
  const requestMetadata: RequestMetadata = {
    requestId,
    startTime,
    method,
    url,
    ip: typeof ip === 'string' ? ip : ip[0],
    userAgent,
    userId,
  };

  req.requestMetadata = requestMetadata;

  // Log incoming request
  logDebug('Incoming request', {
    requestId,
    method,
    url,
    ip: requestMetadata.ip,
    userAgent,
    userId,
  });

  // Store original json method
  const originalJson = res.json.bind(res);

  /**
   * Override res.json to capture response and log it
   */
  res.json = function (data: any) {
    const statusCode = res.statusCode;
    const duration = Date.now() - startTime;

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Log response
    if (statusCode >= 400) {
      logError('Request failed', undefined, {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId,
        ip: requestMetadata.ip,
        responseSize: JSON.stringify(data).length,
      });
    } else {
      logInfo('Request completed successfully', {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId,
        ip: requestMetadata.ip,
        responseSize: JSON.stringify(data).length,
      });
    }

    // Call original json with enhanced response
    return originalJson(data);
  };

  // Store original send method
  const originalSend = res.send.bind(res);

  /**
   * Override res.send to capture response and log it
   */
  res.send = function (data: any) {
    const statusCode = res.statusCode;
    const duration = Date.now() - startTime;

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Log response
    if (statusCode >= 400) {
      logError('Request failed', undefined, {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId,
        ip: requestMetadata.ip,
      });
    } else {
      logInfo('Request completed successfully', {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId,
        ip: requestMetadata.ip,
      });
    }

    // Call original send
    return originalSend(data);
  };

  // Continue to next middleware
  next();
};

export default requestResponseMiddleware;
