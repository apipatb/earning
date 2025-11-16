import { Response } from 'express';

/**
 * Standard API Response Format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Paginated Response Format
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Response utility class for consistent API responses
 */
export class ResponseUtil {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    const requestId = (res.req as any).requestId;

    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    error: string | Error,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: any
  ): Response {
    const requestId = (res.req as any).requestId;
    const message = typeof error === 'string' ? error : error.message;

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    limit: number,
    offset: number,
    statusCode: number = 200
  ): Response {
    const requestId = (res.req as any).requestId;
    const pages = Math.ceil(total / limit);

    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        pages,
      },
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(res: Response, data: T): Response {
    return this.success(res, data, 'Created successfully', 201);
  }

  /**
   * Send not found response (404)
   */
  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(
      res,
      message,
      'NOT_FOUND',
      404
    );
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(
      res,
      message,
      'UNAUTHORIZED',
      401
    );
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(
      res,
      message,
      'FORBIDDEN',
      403
    );
  }

  /**
   * Send validation error response (400)
   */
  static validationError(
    res: Response,
    message: string = 'Validation failed',
    details?: any
  ): Response {
    return this.error(
      res,
      message,
      'VALIDATION_ERROR',
      400,
      details
    );
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(res: Response, message: string = 'Bad request'): Response {
    return this.error(
      res,
      message,
      'BAD_REQUEST',
      400
    );
  }

  /**
   * Send conflict response (409)
   */
  static conflict(res: Response, message: string = 'Resource conflict'): Response {
    return this.error(
      res,
      message,
      'CONFLICT',
      409
    );
  }

  /**
   * Send rate limit response (429)
   */
  static rateLimitExceeded(
    res: Response,
    retryAfter?: number,
    details?: any
  ): Response {
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter.toString());
    }

    return this.error(
      res,
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      429,
      details
    );
  }

  /**
   * Send internal server error (500)
   */
  static internalError(res: Response, error?: Error): Response {
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? 'Internal server error' : error?.message || 'Internal server error';

    return this.error(
      res,
      message,
      'INTERNAL_ERROR',
      500
    );
  }
}

export default ResponseUtil;
