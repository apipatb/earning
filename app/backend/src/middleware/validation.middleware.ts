import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logWarn } from '../lib/logger';
import { ValidationError, ValidationResponse } from '../schemas/validation.schemas';

/**
 * Express middleware to validate request body, params, or query
 * Attaches validated data to request.validated for use in controllers
 */
export interface ValidatedRequest extends Request {
  validated?: {
    body?: any;
    params?: any;
    query?: any;
  };
}

interface ValidationErrorResponse {
  error: string;
  message: string;
  errors: ValidationError[];
}

/**
 * Format Zod errors into structured validation errors
 */
function formatZodErrors(zodError: ZodError): ValidationError[] {
  return zodError.errors.map((error) => ({
    field: error.path.join('.') || 'root',
    message: error.message,
    code: error.code,
  }));
}

/**
 * Validates request body against a Zod schema
 * Attaches validated data to req.validated.body
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.validated = req.validated || {};
      req.validated.body = validated;
      next();
    } catch (error) {
      const requestId = (req as any).requestId || 'unknown';

      if (error instanceof ZodError) {
        logWarn('Request body validation failed', {
          requestId,
          errors: error.errors,
          path: req.path,
          method: req.method,
        });

        const validationErrors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          errors: validationErrors,
        } as ValidationErrorResponse);
      }

      next(error);
    }
  };
};

/**
 * Validates request params against a Zod schema
 * Attaches validated data to req.validated.params
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.validated = req.validated || {};
      req.validated.params = validated;
      next();
    } catch (error) {
      const requestId = (req as any).requestId || 'unknown';

      if (error instanceof ZodError) {
        logWarn('Request params validation failed', {
          requestId,
          errors: error.errors,
          path: req.path,
          method: req.method,
        });

        const validationErrors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Route parameter validation failed',
          errors: validationErrors,
        } as ValidationErrorResponse);
      }

      next(error);
    }
  };
};

/**
 * Validates query parameters against a Zod schema
 * Attaches validated data to req.validated.query
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.validated = req.validated || {};
      req.validated.query = validated;
      next();
    } catch (error) {
      const requestId = (req as any).requestId || 'unknown';

      if (error instanceof ZodError) {
        logWarn('Request query validation failed', {
          requestId,
          errors: error.errors,
          path: req.path,
          method: req.method,
        });

        const validationErrors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Query parameter validation failed',
          errors: validationErrors,
        } as ValidationErrorResponse);
      }

      next(error);
    }
  };
};

/**
 * Combines validation of multiple request sources
 */
export const validate = (schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      req.validated = req.validated || {};

      if (schemas.body) {
        req.validated.body = await schemas.body.parseAsync(req.body);
      }

      if (schemas.params) {
        req.validated.params = await schemas.params.parseAsync(req.params);
      }

      if (schemas.query) {
        req.validated.query = await schemas.query.parseAsync(req.query);
      }

      next();
    } catch (error) {
      const requestId = (req as any).requestId || 'unknown';

      if (error instanceof ZodError) {
        logWarn('Request validation failed', {
          requestId,
          errors: error.errors,
          path: req.path,
          method: req.method,
        });

        const validationErrors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          errors: validationErrors,
        } as ValidationErrorResponse);
      }

      next(error);
    }
  };
};

/**
 * Middleware for partial updates - allows subset of fields
 */
export const validatePartialBody = (schema: ZodSchema) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      // Ensure body is not empty
      if (!req.body || Object.keys(req.body).length === 0) {
        const requestId = (req as any).requestId || 'unknown';
        logWarn('Empty request body for partial update', {
          requestId,
          path: req.path,
          method: req.method,
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request body cannot be empty',
          errors: [
            {
              field: 'body',
              message: 'At least one field must be provided',
              code: 'custom',
            },
          ],
        } as ValidationErrorResponse);
      }

      const validated = await schema.parseAsync(req.body);
      req.validated = req.validated || {};
      req.validated.body = validated;
      next();
    } catch (error) {
      const requestId = (req as any).requestId || 'unknown';

      if (error instanceof ZodError) {
        logWarn('Request body validation failed', {
          requestId,
          errors: error.errors,
          path: req.path,
          method: req.method,
        });

        const validationErrors = formatZodErrors(error);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          errors: validationErrors,
        } as ValidationErrorResponse);
      }

      next(error);
    }
  };
};

/**
 * Express error handler for validation errors
 */
export const validationErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof ZodError) {
    const requestId = (req as any).requestId || 'unknown';
    logWarn('Unhandled validation error', {
      requestId,
      errors: error.errors,
      path: req.path,
    });

    const validationErrors = formatZodErrors(error);
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Request validation failed',
      errors: validationErrors,
    } as ValidationErrorResponse);
  }

  next(error);
};
