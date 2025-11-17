/**
 * Error Handling Utilities
 * Provides standardized error handling for controllers and API endpoints
 */

import { Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

/**
 * Custom application error class with status code support
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  /**
   * Create a new AppError
   *
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param details - Additional error details
   *
   * @example
   * throw new AppError('User not found', 404);
   *
   * @example
   * throw new AppError('Validation failed', 400, { field: 'email', message: 'Invalid format' });
   */
  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

/**
 * Format Zod validation errors into a user-friendly structure
 *
 * @param error - ZodError instance
 * @returns Formatted validation error details
 */
function formatZodError(error: ZodError): any {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Format Prisma errors into user-friendly messages
 *
 * @param error - Prisma error instance
 * @returns User-friendly error message
 */
function formatPrismaError(error: any): { message: string; statusCode: number } {
  // P2002: Unique constraint failed
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return {
      message: `A record with this ${field} already exists`,
      statusCode: 409,
    };
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return {
      message: 'Record not found',
      statusCode: 404,
    };
  }

  // P2003: Foreign key constraint failed
  if (error.code === 'P2003') {
    return {
      message: 'Invalid reference to related record',
      statusCode: 400,
    };
  }

  // P2014: Invalid relation
  if (error.code === 'P2014') {
    return {
      message: 'Invalid relation in the operation',
      statusCode: 400,
    };
  }

  // Default Prisma error
  return {
    message: 'Database operation failed',
    statusCode: 500,
  };
}

/**
 * Handle errors in controller methods and send appropriate response
 * Automatically detects error type and formats response accordingly
 *
 * @param error - Error object (can be any type)
 * @param res - Express Response object
 *
 * @example
 * try {
 *   // ... controller logic
 * } catch (error) {
 *   return handleControllerError(error, res);
 * }
 */
export function handleControllerError(error: any, res: Response): Response {
  // Log the error for debugging
  logger.error('Controller error:', error);

  // Handle AppError (custom application errors)
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      details: error.details,
    };
    return res.status(error.statusCode).json(response);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: 'Invalid request data',
      details: formatZodError(error),
    };
    return res.status(400).json(response);
  }

  // Handle Prisma errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    const { message, statusCode } = formatPrismaError(error);
    const response: ErrorResponse = {
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    };
    return res.status(statusCode).json(response);
  }

  // Handle authentication/authorization errors
  if (error.name === 'UnauthorizedError' || error.message?.includes('Unauthorized')) {
    const response: ErrorResponse = {
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    };
    return res.status(401).json(response);
  }

  if (error.name === 'ForbiddenError' || error.message?.includes('Forbidden')) {
    const response: ErrorResponse = {
      success: false,
      error: 'Forbidden',
      message: 'You do not have permission to perform this action',
    };
    return res.status(403).json(response);
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const response: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    return res.status(500).json(response);
  }

  // Handle unknown error types
  const response: ErrorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
  };
  return res.status(500).json(response);
}

/**
 * Create a validation error
 *
 * @param message - Error message
 * @param details - Validation error details
 * @returns AppError with 400 status code
 *
 * @example
 * throw createValidationError('Invalid email format', { field: 'email' });
 */
export function createValidationError(message: string, details?: any): AppError {
  return new AppError(message, 400, details);
}

/**
 * Create an authentication error
 *
 * @param message - Error message (default: 'Authentication required')
 * @returns AppError with 401 status code
 *
 * @example
 * throw createAuthError('Invalid token');
 */
export function createAuthError(message: string = 'Authentication required'): AppError {
  return new AppError(message, 401);
}

/**
 * Create a forbidden error
 *
 * @param message - Error message (default: 'Access denied')
 * @returns AppError with 403 status code
 *
 * @example
 * throw createForbiddenError('You cannot access this resource');
 */
export function createForbiddenError(message: string = 'Access denied'): AppError {
  return new AppError(message, 403);
}

/**
 * Create a not found error
 *
 * @param resource - Resource name (e.g., 'User', 'Invoice')
 * @returns AppError with 404 status code
 *
 * @example
 * throw createNotFoundError('Invoice');
 */
export function createNotFoundError(resource: string = 'Resource'): AppError {
  return new AppError(`${resource} not found`, 404);
}

/**
 * Create a conflict error (e.g., duplicate resource)
 *
 * @param message - Error message
 * @returns AppError with 409 status code
 *
 * @example
 * throw createConflictError('Email already exists');
 */
export function createConflictError(message: string): AppError {
  return new AppError(message, 409);
}
