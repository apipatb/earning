import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from './logger';
import { Prisma } from '@prisma/client';

/**
 * Error context for logging
 */
interface ErrorContext {
  userId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

/**
 * Error Handler Service
 * Centralized error handling and logging
 */
export class ErrorHandler {
  /**
   * Log error with context
   */
  static logError(error: Error, context?: ErrorContext): void {
    const isOperational = error instanceof AppError ? error.isOperational : false;
    const errorCode = error instanceof AppError ? error.errorCode : 'UNKNOWN_ERROR';
    const statusCode = error instanceof AppError ? error.statusCode : 500;

    const logContext = {
      errorName: error.name,
      errorCode,
      statusCode,
      message: error.message,
      stack: error.stack,
      isOperational,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Log based on error type
    if (isOperational) {
      // Operational errors are expected (validation, not found, etc.)
      if (statusCode >= 500) {
        logger.error('Operational error (5xx)', error, logContext);
      } else if (statusCode >= 400) {
        logger.warn('Client error (4xx)', logContext);
      }
    } else {
      // Programming errors are unexpected and critical
      logger.error('Programming error - requires investigation', error, logContext);
    }
  }

  /**
   * Handle error and send response
   */
  static handleError(error: Error, res: Response, context?: ErrorContext): void {
    // Log the error
    this.logError(error, context);

    // Send appropriate response
    if (error instanceof AppError) {
      res.status(error.statusCode).json(error.toJSON());
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      const prismaError = this.handlePrismaError(error);
      res.status(prismaError.statusCode).json(prismaError.toJSON());
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      const validationError = new AppError(
        'Database validation error',
        400,
        'DATABASE_VALIDATION_ERROR',
        true
      );
      res.status(400).json(validationError.toJSON());
    } else {
      // Unknown error - don't leak details to client
      const unknownError = new AppError(
        'An unexpected error occurred',
        500,
        'INTERNAL_ERROR',
        false
      );
      res.status(500).json(unknownError.toJSON());
    }
  }

  /**
   * Handle Prisma database errors
   */
  private static handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        const fields = target ? target.join(', ') : 'field';
        return new AppError(
          `A record with this ${fields} already exists`,
          409,
          'DUPLICATE_RECORD',
          true,
          { fields: target }
        );

      case 'P2025':
        // Record not found
        return new AppError(
          'Record not found',
          404,
          'RECORD_NOT_FOUND',
          true
        );

      case 'P2003':
        // Foreign key constraint violation
        return new AppError(
          'Related record not found',
          400,
          'FOREIGN_KEY_ERROR',
          true,
          { field: error.meta?.field_name }
        );

      case 'P2014':
        // Required relation violation
        return new AppError(
          'Invalid relation',
          400,
          'INVALID_RELATION',
          true
        );

      case 'P2021':
        // Table does not exist
        return new AppError(
          'Database schema error',
          500,
          'DATABASE_SCHEMA_ERROR',
          false
        );

      case 'P2024':
        // Connection timeout
        return new AppError(
          'Database connection timeout',
          504,
          'DATABASE_TIMEOUT',
          true
        );

      default:
        return new AppError(
          'Database operation failed',
          500,
          'DATABASE_ERROR',
          true,
          { code: error.code }
        );
    }
  }

  /**
   * Wrap async route handlers to catch errors
   */
  static asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        // Extract context from request
        const context: ErrorContext = {
          userId: req.user?.id,
          action: `${req.method} ${req.path}`,
          metadata: {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            body: this.sanitizeBody(req.body),
            query: req.query,
            params: req.params,
          },
        };

        this.handleError(error, res, context);
      });
    };
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  private static sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Express error handling middleware
   */
  static middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const context: ErrorContext = {
        userId: req.user?.id,
        action: `${req.method} ${req.path}`,
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      };

      ErrorHandler.handleError(error, res, context);
    };
  }

  /**
   * Process shutdown on fatal errors
   */
  static handleFatalError(error: Error): void {
    logger.error('Fatal error - shutting down', error, {
      fatal: true,
      timestamp: new Date().toISOString(),
    });

    // Graceful shutdown
    process.exit(1);
  }
}

/**
 * Format error for user display
 */
export function formatUserError(error: Error): string {
  if (error instanceof AppError) {
    return error.message;
  }

  // Generic user-friendly message for unknown errors
  return 'An unexpected error occurred. Please try again later.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof AppError) {
    // Retry on specific error codes
    const retryableCodes = [
      'EXTERNAL_SERVICE_ERROR',
      'TIMEOUT_ERROR',
      'DATABASE_TIMEOUT',
      'RATE_LIMIT_ERROR',
    ];
    return retryableCodes.includes(error.errorCode);
  }

  // Retry on network errors
  if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')) {
    return true;
  }

  return false;
}

/**
 * Convert unknown errors to AppError
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      500,
      'INTERNAL_ERROR',
      false
    );
  }

  if (typeof error === 'string') {
    return new AppError(error, 500, 'INTERNAL_ERROR', false);
  }

  return new AppError(
    'An unknown error occurred',
    500,
    'UNKNOWN_ERROR',
    false,
    { originalError: String(error) }
  );
}
