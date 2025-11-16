import { z } from 'zod';
import {
  validateRequest,
  validatePartialRequest,
  safeValidateRequest,
  ValidationException,
  validateAndGetErrorResponse,
} from '../utils/validate-request.util';

// Test schemas
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().positive().optional(),
});

const userPartialSchema = userSchema.partial();

describe('validateRequest utility', () => {
  describe('validateRequest', () => {
    it('should validate and return data on success', async () => {
      const data = {
        email: 'test@example.com',
        name: 'John Doe',
        age: 30,
      };
      const result: any = await validateRequest(data, userSchema);
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('John Doe');
      expect(result.age).toBe(30);
    });

    it('should throw ValidationException on invalid data', async () => {
      const invalidData = {
        email: 'not-an-email',
        name: 'John Doe',
      };
      await expect(validateRequest(invalidData, userSchema)).rejects.toThrow(ValidationException);
    });

    it('should include field-level error details', async () => {
      const invalidData = {
        email: 'test@example.com',
        name: '',
      };
      try {
        await validateRequest(invalidData, userSchema);
      } catch (error) {
        if (error instanceof ValidationException) {
          expect(error.errors.length).toBeGreaterThan(0);
          expect(error.errors[0]).toHaveProperty('field');
          expect(error.errors[0]).toHaveProperty('message');
          expect(error.errors[0]).toHaveProperty('code');
        }
      }
    });

    it('should set correct status code', async () => {
      const invalidData = {
        email: 'invalid',
      };
      try {
        await validateRequest(invalidData, userSchema);
      } catch (error) {
        if (error instanceof ValidationException) {
          expect(error.statusCode).toBe(400);
        }
      }
    });
  });

  describe('validatePartialRequest', () => {
    it('should accept partial data', async () => {
      const partialData = {
        email: 'test@example.com',
      };
      const result: any = await validatePartialRequest(partialData, userPartialSchema);
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBeUndefined();
    });

    it('should reject empty object', async () => {
      const emptyData = {};
      await expect(validatePartialRequest(emptyData, userPartialSchema)).rejects.toThrow(
        ValidationException
      );
    });

    it('should reject non-object', async () => {
      const invalidData = 'string';
      await expect(validatePartialRequest(invalidData, userPartialSchema)).rejects.toThrow(
        ValidationException
      );
    });

    it('should still validate field values', async () => {
      const invalidPartialData = {
        email: 'not-an-email',
      };
      await expect(validatePartialRequest(invalidPartialData, userPartialSchema)).rejects.toThrow(
        ValidationException
      );
    });
  });

  describe('safeValidateRequest', () => {
    it('should return success with data on valid input', async () => {
      const data = {
        email: 'test@example.com',
        name: 'John Doe',
      };
      const result = await safeValidateRequest(data, userSchema);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).email).toBe('test@example.com');
      expect(result.errors).toBeUndefined();
    });

    it('should return failure with errors on invalid input', async () => {
      const invalidData = {
        email: 'not-an-email',
        name: 'John Doe',
      };
      const result = await safeValidateRequest(invalidData, userSchema);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    });

    it('should format errors correctly', async () => {
      const invalidData = {
        email: 'invalid',
        name: '',
      };
      const result = await safeValidateRequest(invalidData, userSchema);
      if (!result.success && result.errors) {
        result.errors.forEach((error) => {
          expect(error).toHaveProperty('field');
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('code');
        });
      }
    });

    it('should not throw errors', async () => {
      const invalidData = {
        email: 'not-an-email',
      };
      await expect(safeValidateRequest(invalidData, userSchema)).resolves.toBeDefined();
    });
  });

  describe('validateAndGetErrorResponse', () => {
    it('should return null on valid data', async () => {
      const data = {
        email: 'test@example.com',
        name: 'John Doe',
      };
      const result = await validateAndGetErrorResponse(data, userSchema);
      expect(result).toBeNull();
    });

    it('should return error response on invalid data', async () => {
      const invalidData = {
        email: 'not-an-email',
      };
      const result = await validateAndGetErrorResponse(invalidData, userSchema);
      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(400);
      expect(result?.response.success).toBe(false);
      expect(result?.response.errors).toBeDefined();
    });

    it('should be usable in HTTP responses', async () => {
      const invalidData = {
        email: 'not-an-email',
      };
      const errorResponse = await validateAndGetErrorResponse(invalidData, userSchema);
      if (errorResponse) {
        const statusCode = errorResponse.statusCode;
        const body = errorResponse.response;
        expect(statusCode).toBe(400);
        expect(body.errors).toBeDefined();
      }
    });
  });

  describe('ValidationException', () => {
    it('should create exception with errors and status code', () => {
      const errors = [
        { field: 'email', message: 'Invalid email', code: 'invalid_string' },
      ];
      const exception = new ValidationException(errors, 400);
      expect(exception.errors).toEqual(errors);
      expect(exception.statusCode).toBe(400);
      expect(exception.name).toBe('ValidationException');
    });

    it('should default status code to 400', () => {
      const errors = [
        { field: 'email', message: 'Invalid email', code: 'invalid_string' },
      ];
      const exception = new ValidationException(errors);
      expect(exception.statusCode).toBe(400);
    });

    it('should be an instance of Error', () => {
      const errors = [
        { field: 'email', message: 'Invalid email', code: 'invalid_string' },
      ];
      const exception = new ValidationException(errors);
      expect(exception).toBeInstanceOf(Error);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle email validation', async () => {
      const emailSchema = z.object({
        email: z.string().email('Please provide a valid email address'),
      });

      const validData = { email: 'user@example.com' };
      const result: any = await validateRequest(validData, emailSchema);
      expect(result.email).toBe('user@example.com');
    });

    it('should handle number validation', async () => {
      const numberSchema = z.object({
        count: z.number().positive('Count must be positive'),
      });

      const validData = { count: 42 };
      const result: any = await validateRequest(validData, numberSchema);
      expect(result.count).toBe(42);
    });

    it('should handle array validation', async () => {
      const arraySchema = z.object({
        items: z.array(z.string()).min(1),
      });

      const validData = { items: ['item1', 'item2'] };
      const result: any = await validateRequest(validData, arraySchema);
      expect(result.items).toEqual(['item1', 'item2']);
    });

    it('should provide helpful error messages', async () => {
      const schema = z.object({
        age: z.number().min(18, 'Must be at least 18 years old'),
      });

      try {
        await validateRequest({ age: 10 }, schema);
      } catch (error) {
        if (error instanceof ValidationException) {
          expect(error.errors[0].message).toContain('18');
        }
      }
    });
  });
});
