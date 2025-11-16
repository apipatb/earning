import { Request, Response, NextFunction } from 'express';
import logger, { logInfo, logDebug, logError } from '../lib/logger';

// Extend Express Request to include requestId and user info
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: { id: string; email: string };
    }
  }
}

// Simplified uuid generation without external dependency
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;

  // Log incoming request
  const startTime = Date.now();
  const { method, url, headers, ip } = req;

  logDebug('Incoming request', {
    requestId,
    method,
    url,
    ip: ip || headers['x-forwarded-for'] || 'unknown',
    userAgent: headers['user-agent'],
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const statusCode = res.statusCode;
    const duration = Date.now() - startTime;

    // Only log detailed response for non-2xx status codes
    if (statusCode >= 400) {
      logError('Request failed', undefined, {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
      });
    } else {
      logInfo('Request completed successfully', {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
      });
    }

    return originalJson(data);
  };

  // Override res.send to log response
  const originalSend = res.send.bind(res);
  res.send = function (data: any) {
    const statusCode = res.statusCode;
    const duration = Date.now() - startTime;

    if (statusCode >= 400) {
      logError('Request failed', undefined, {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
      });
    } else {
      logInfo('Request completed successfully', {
        requestId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
      });
    }

    return originalSend(data);
  };

  next();
};

export default loggingMiddleware;
