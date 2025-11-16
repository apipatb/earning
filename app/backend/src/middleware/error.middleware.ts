import { Request, Response, NextFunction } from 'express';
import { logError, logDebug } from '../lib/logger';
import { ResponseUtil } from '../utils/response.util';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId || 'unknown';
  const userId = (req as any).user?.id || 'unknown';
  const rateLimit = (req as any).rateLimit;

  logError('Request error', err, {
    requestId,
    userId,
    method: req.method,
    url: req.url,
    errorName: err.name,
  });

  // Handle rate limit errors with additional context
  if (err.message && err.message.includes('rate limit')) {
    logDebug('Rate limit error occurred', {
      requestId,
      userId,
      ip: req.ip,
      rateLimit,
    });

    const retryAfter = rateLimit?.resetTime
      ? Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : 60;

    return ResponseUtil.rateLimitExceeded(
      res,
      retryAfter,
      {
        remaining: rateLimit?.remaining || 0,
        resetTime: rateLimit?.resetTime?.toISOString(),
      }
    );
  }

  if (err.name === 'ZodError') {
    logDebug('Validation error occurred', {
      requestId,
      userId,
      errorDetails: (err as any).errors,
    });

    return ResponseUtil.validationError(
      res,
      'Invalid request data',
      (err as any).errors
    );
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    logError('Database operation failed', err, {
      requestId,
      userId,
      code: (err as any).code,
      meta: (err as any).meta,
    });

    return ResponseUtil.error(
      res,
      'Database operation failed',
      'DATABASE_ERROR',
      400
    );
  }

  return ResponseUtil.internalError(res, err);
};
