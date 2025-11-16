import { ZodSchema, ZodError } from 'zod';
import { ValidationError, ValidationResponse } from '../schemas/validation.schemas';

/**
 * Custom error class for validation failures
 */
export class ValidationException extends Error {
  constructor(
    public errors: ValidationError[],
    public statusCode: number = 400
  ) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
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
 * Validate request data against a Zod schema
 * Returns validated data on success, throws ValidationException on failure
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns The validated data
 * @throws ValidationException if validation fails
 *
 * @example
 * const registerData = validateRequest(req.body, RegisterInputSchema);
 */
export async function validateRequest<T>(
  data: unknown,
  schema: ZodSchema
): Promise<T> {
  try {
    return (await schema.parseAsync(data)) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatZodErrors(error);
      throw new ValidationException(validationErrors, 400);
    }
    throw error;
  }
}

/**
 * Validate request data with custom error message
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param errorMessage - Custom error message to use
 * @returns The validated data
 * @throws ValidationException if validation fails
 */
export async function validateRequestWithMessage<T>(
  data: unknown,
  schema: ZodSchema,
  errorMessage: string
): Promise<T> {
  try {
    return (await schema.parseAsync(data)) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatZodErrors(error);
      const customErrors = validationErrors.map((e) => ({
        ...e,
        message: errorMessage,
      }));
      throw new ValidationException(customErrors, 400);
    }
    throw error;
  }
}

/**
 * Validate multiple fields at once
 *
 * @param data - Object containing data to validate
 * @param schemas - Object with schema for each field
 * @returns Object with validated data for each field
 * @throws ValidationException if any field validation fails
 *
 * @example
 * const { body, query } = await validateRequestFields(
 *   { body: req.body, query: req.query },
 *   { body: CreateEarningSchema, query: EarningFilterSchema }
 * );
 */
export async function validateRequestFields<T extends Record<string, any>>(
  data: Record<string, unknown>,
  schemas: Record<string, ZodSchema>
): Promise<T> {
  const results: Record<string, any> = {};
  const allErrors: ValidationError[] = [];

  for (const [key, schema] of Object.entries(schemas)) {
    try {
      results[key] = await schema.parseAsync(data[key]);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        // Prefix field names with the source (e.g., body.email)
        const prefixedErrors = errors.map((e) => ({
          ...e,
          field: `${key}.${e.field}`,
        }));
        allErrors.push(...prefixedErrors);
      }
    }
  }

  if (allErrors.length > 0) {
    throw new ValidationException(allErrors, 400);
  }

  return results as T;
}

/**
 * Safe validation that returns a result object instead of throwing
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Object with success flag and either data or errors
 *
 * @example
 * const result = await safeValidateRequest(req.body, RegisterInputSchema);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.log(result.errors);
 * }
 */
export async function safeValidateRequest<T>(
  data: unknown,
  schema: ZodSchema
): Promise<ValidationResponse> {
  try {
    const validatedData = await schema.parseAsync(data);
    return {
      success: true,
      data: validatedData as T,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatZodErrors(error);
      return {
        success: false,
        errors: validationErrors,
      };
    }
    return {
      success: false,
      errors: [
        {
          field: 'root',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'internal_error',
        },
      ],
    };
  }
}

/**
 * Partial validation - allows subset of fields
 * Used for PATCH requests
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against (should be a partial schema)
 * @returns The validated data
 * @throws ValidationException if validation fails or data is empty
 */
export async function validatePartialRequest<T>(
  data: unknown,
  schema: ZodSchema
): Promise<T> {
  // Ensure data is an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ValidationException(
      [
        {
          field: 'body',
          message: 'Request body must be a non-empty object',
          code: 'invalid_type',
        },
      ],
      400
    );
  }

  // Ensure at least one field is provided
  if (Object.keys(data).length === 0) {
    throw new ValidationException(
      [
        {
          field: 'body',
          message: 'At least one field must be provided',
          code: 'custom',
        },
      ],
      400
    );
  }

  try {
    return (await schema.parseAsync(data)) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatZodErrors(error);
      throw new ValidationException(validationErrors, 400);
    }
    throw error;
  }
}

/**
 * Validate request and return formatted error response if validation fails
 * Returns validation error object that can be sent directly as response
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Object with error response or null if validation succeeds
 *
 * @example
 * const error = validateAndGetErrorResponse(req.body, RegisterInputSchema);
 * if (error) {
 *   return res.status(error.statusCode).json(error.response);
 * }
 */
export async function validateAndGetErrorResponse(
  data: unknown,
  schema: ZodSchema
): Promise<{ statusCode: number; response: ValidationResponse } | null> {
  try {
    await schema.parseAsync(data);
    return null;
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatZodErrors(error);
      return {
        statusCode: 400,
        response: {
          success: false,
          error: 'Validation Error',
          message: 'Request validation failed',
          errors: validationErrors,
        } as any,
      };
    }
    return null;
  }
}
