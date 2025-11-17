import { Request, Response, NextFunction } from 'express';
import { ErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

/**
 * Global Error Handling Middleware
 *
 * This middleware catches all errors thrown in the application
 * and formats them into consistent API responses.
 *
 * Usage:
 * Add this middleware LAST in your Express app, after all routes:
 * app.use(errorMiddleware);
 */
export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use ErrorHandler to log and format the error
  const context = {
    userId: req.user?.id,
    action: `${req.method} ${req.path}`,
    metadata: {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      query: req.query,
      params: req.params,
    },
  };

  ErrorHandler.handleError(error, res, context);
};

/**
 * 404 Not Found Middleware
 *
 * Catches requests to undefined routes
 *
 * Usage:
 * Add this middleware BEFORE the error middleware but AFTER all routes:
 * app.use(notFoundMiddleware);
 * app.use(errorMiddleware);
 */
export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    error: {
      name: 'NotFoundError',
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Async Error Handler Wrapper
 *
 * Wraps async route handlers to catch errors and pass them to next()
 *
 * Usage:
 * app.get('/users', asyncErrorHandler(async (req, res) => {
 *   const users = await userService.getUsers();
 *   res.json(users);
 * }));
 */
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request Timeout Middleware
 *
 * Automatically times out requests that take too long
 *
 * Usage:
 * app.use(requestTimeoutMiddleware(30000)); // 30 seconds
 */
export const requestTimeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          path: req.path,
          method: req.method,
          timeout: timeoutMs,
        });

        res.status(504).json({
          error: {
            name: 'TimeoutError',
            message: 'Request timed out',
            code: 'REQUEST_TIMEOUT',
            statusCode: 504,
            timestamp: new Date().toISOString(),
            details: {
              timeout: timeoutMs,
            },
          },
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Validation Error Formatter
 *
 * Formats validation errors from express-validator or other validation libraries
 *
 * Usage:
 * const errors = validationResult(req);
 * if (!errors.isEmpty()) {
 *   return formatValidationErrors(errors.array(), res);
 * }
 */
export const formatValidationErrors = (
  errors: any[],
  res: Response
): void => {
  const formattedErrors = errors.map((err) => ({
    field: err.param || err.path,
    message: err.msg || err.message,
    value: err.value,
  }));

  res.status(400).json({
    error: {
      name: 'ValidationError',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      details: {
        errors: formattedErrors,
      },
    },
  });
};

/**
 * Unhandled Rejection Handler
 *
 * Catches unhandled promise rejections
 *
 * Usage:
 * Add this in your main app file:
 * process.on('unhandledRejection', unhandledRejectionHandler);
 */
export const unhandledRejectionHandler = (
  reason: Error | any,
  promise: Promise<any>
): void => {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    promise: promise.toString(),
  });

  // In production, you might want to trigger alerts here
  if (process.env.NODE_ENV === 'production') {
    // Send alert to monitoring service
  }
};

/**
 * Uncaught Exception Handler
 *
 * Catches uncaught exceptions and gracefully shuts down
 *
 * Usage:
 * Add this in your main app file:
 * process.on('uncaughtException', uncaughtExceptionHandler);
 */
export const uncaughtExceptionHandler = (error: Error): void => {
  logger.error('Uncaught Exception - shutting down gracefully', error, {
    fatal: true,
  });

  // Perform cleanup and graceful shutdown
  process.exit(1);
};

/**
 * Request Logger Middleware
 *
 * Logs all incoming requests
 *
 * Usage:
 * app.use(requestLoggerMiddleware);
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });
  });

  next();
};

/**
 * CORS Error Handler
 *
 * Provides user-friendly error messages for CORS issues
 *
 * Usage:
 * app.use(corsErrorHandler);
 */
export const corsErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error && error.message && error.message.includes('CORS')) {
    res.status(403).json({
      error: {
        name: 'CORSError',
        message: 'Cross-Origin Request Blocked',
        code: 'CORS_ERROR',
        statusCode: 403,
        timestamp: new Date().toISOString(),
        details: {
          origin: req.get('origin'),
          method: req.method,
        },
      },
    });
  } else {
    next(error);
  }
};

export default {
  errorMiddleware,
  notFoundMiddleware,
  asyncErrorHandler,
  requestTimeoutMiddleware,
  formatValidationErrors,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
  requestLoggerMiddleware,
  corsErrorHandler,
};
