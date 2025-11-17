/**
 * Base Application Error
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);

    // Maintains proper stack trace for where error was thrown (V8 only)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        timestamp: this.timestamp.toISOString(),
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Validation Error - 400
 * Used for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Not Found Error - 404
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', true, { resource, identifier });
  }
}

/**
 * Unauthorized Error - 401
 * Used for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 401, 'UNAUTHORIZED', true, details);
  }
}

/**
 * Forbidden Error - 403
 * Used for authorization/permission failures
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', true, details);
  }
}

/**
 * Conflict Error - 409
 * Used when a resource already exists or there's a conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

/**
 * Database Error
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, details?: any) {
    super(
      message,
      500,
      'DATABASE_ERROR',
      true,
      { operation, ...details }
    );
  }
}

/**
 * External Service Error
 * Used when external API/service calls fail
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly isRetryable: boolean;

  constructor(
    service: string,
    message: string,
    isRetryable: boolean = true,
    details?: any
  ) {
    super(
      message,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
      { service, isRetryable, ...details }
    );
    this.service = service;
    this.isRetryable = isRetryable;
  }
}

/**
 * File Operation Error
 * Used for file upload, download, or storage failures
 */
export class FileOperationError extends AppError {
  constructor(
    operation: 'upload' | 'download' | 'delete' | 'scan' | 'generate',
    message: string,
    details?: any
  ) {
    super(
      message,
      500,
      'FILE_OPERATION_ERROR',
      true,
      { operation, ...details }
    );
  }
}

/**
 * Payment Error
 * Used for payment processing failures
 */
export class PaymentError extends AppError {
  public readonly isRetryable: boolean;

  constructor(message: string, isRetryable: boolean = false, details?: any) {
    super(message, 402, 'PAYMENT_ERROR', true, details);
    this.isRetryable = isRetryable;
  }
}

/**
 * Rate Limit Error - 429
 * Used when rate limits are exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(
      message,
      429,
      'RATE_LIMIT_ERROR',
      true,
      retryAfter ? { retryAfter } : undefined
    );
  }
}

/**
 * Timeout Error - 504
 * Used when operations timeout
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      504,
      'TIMEOUT_ERROR',
      true,
      { operation, timeoutMs }
    );
  }
}

/**
 * Quota Exceeded Error - 429
 * Used when user quotas are exceeded
 */
export class QuotaExceededError extends AppError {
  constructor(quotaType: string, current: number, limit: number) {
    super(
      `${quotaType} quota exceeded. Current: ${current}, Limit: ${limit}`,
      429,
      'QUOTA_EXCEEDED',
      true,
      { quotaType, current, limit }
    );
  }
}

/**
 * Configuration Error
 * Used when application configuration is invalid or missing
 */
export class ConfigurationError extends AppError {
  constructor(message: string, configKey?: string) {
    super(
      message,
      500,
      'CONFIGURATION_ERROR',
      false, // Not operational - indicates system issue
      configKey ? { configKey } : undefined
    );
  }
}
