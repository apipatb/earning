import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import {
  validateBody,
  validateQuery,
  validateParams,
  validate,
  ValidatedRequest,
} from '../middleware/validation.middleware';

// Mock schemas for testing
const userSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

const paramsSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});

// Helper function to create mock request/response
function createMockRequest(overrides: any = {}): ValidatedRequest {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as any;
}

function createMockResponse(): any {
  const res: any = {
    status: jest.fn(function() { return this; }).mockReturnThis(),
    json: jest.fn(function() { return this; }).mockReturnThis(),
  };
  return res;
}

function createMockNext(): any {
  return jest.fn();
}

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    it('should pass valid request body to next middleware', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validated).toBeDefined();
      expect(req.validated!.body).toBeDefined();
      expect(req.validated!.body.email).toBe('user@example.com');
    });

    it('should return 400 error for invalid body', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: {
          email: 'invalid-email',
          password: 'short',
        },
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should include validation errors in response', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: {
          email: 'invalid',
          password: 'short',
        },
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.error).toBe('Validation Error');
      expect(responseBody.errors).toBeDefined();
      expect(responseBody.errors.length).toBeGreaterThan(0);
    });

    it('should include field-level error details', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: {
          email: 'not-email',
          password: 'short',
        },
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      const responseBody = res.json.mock.calls[0][0];
      responseBody.errors.forEach((error: any) => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
      });
    });

    it('should attach validated data to request object', async () => {
      const middleware = validateBody(userSchema);
      const validData = {
        email: 'user@example.com',
        password: 'SecurePassword123',
      };
      const req = createMockRequest({ body: validData });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(req.validated!.body).toEqual(validData);
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', async () => {
      const middleware = validateQuery(querySchema);
      const req = createMockRequest({
        query: {
          page: '2',
          limit: '20',
        },
        path: '/api/users',
        method: 'GET',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validated!.query.page).toBe(2);
      expect(req.validated!.query.limit).toBe(20);
    });

    it('should use default values for missing query params', async () => {
      const middleware = validateQuery(querySchema);
      const req = createMockRequest({
        query: {},
        path: '/api/users',
        method: 'GET',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validated!.query.page).toBe(1);
      expect(req.validated!.query.limit).toBe(10);
    });

    it('should return error for invalid query parameters', async () => {
      const middleware = validateQuery(querySchema);
      const req = createMockRequest({
        query: {
          page: 'invalid',
        },
        path: '/api/users',
        method: 'GET',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('should validate route parameters', async () => {
      const middleware = validateParams(paramsSchema);
      const req = createMockRequest({
        params: {
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
        path: '/api/users/:id',
        method: 'GET',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validated!.params.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return error for invalid route parameters', async () => {
      const middleware = validateParams(paramsSchema);
      const req = createMockRequest({
        params: {
          id: 'not-a-uuid',
        },
        path: '/api/users/:id',
        method: 'DELETE',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject missing required params', async () => {
      const middleware = validateParams(paramsSchema);
      const req = createMockRequest({
        params: {},
        path: '/api/users/:id',
        method: 'GET',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validate - combined validation', () => {
    it('should validate body, params, and query', async () => {
      const middleware = validate({
        body: userSchema,
        params: paramsSchema,
        query: querySchema,
      });
      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123',
        },
        params: {
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
        query: {
          page: '2',
          limit: '20',
        },
        path: '/api/users/:id',
        method: 'PUT',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validated!.body).toBeDefined();
      expect(req.validated!.params).toBeDefined();
      expect(req.validated!.query).toBeDefined();
    });

    it('should fail if any validation fails', async () => {
      const middleware = validate({
        body: userSchema,
        params: paramsSchema,
      });
      const req = createMockRequest({
        body: {
          email: 'invalid-email',
          password: 'short',
        },
        params: {
          id: 'invalid-uuid',
        },
        path: '/api/users/:id',
        method: 'PUT',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate partial sources', async () => {
      const middleware = validate({
        body: userSchema,
      });
      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123',
        },
        params: {},
        query: {},
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validated!.body).toBeDefined();
      expect(req.validated!.params).toBeUndefined();
      expect(req.validated!.query).toBeUndefined();
    });
  });

  describe('Error Response Format', () => {
    it('should return proper error response structure', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: { email: 'invalid' },
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('errors');
      expect(Array.isArray(response.errors)).toBe(true);
    });

    it('should include meaningful error messages', async () => {
      const testSchema = z.object({
        email: z.string().email('Please provide a valid email address'),
      });
      const middleware = validateBody(testSchema);
      const req = createMockRequest({
        body: { email: 'not-email' },
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.errors[0].message).toBeTruthy();
    });
  });

  describe('RequestID logging', () => {
    it('should use request ID from request context', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: { email: 'invalid' },
        requestId: 'test-request-123',
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.json).toHaveBeenCalled();
      // RequestID is logged, but not returned in response
    });

    it('should use default request ID if not provided', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: { email: 'invalid' },
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple middleware chain', async () => {
      const bodyValidator = validateBody(userSchema);
      const paramsValidator = validateParams(paramsSchema);

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123',
        },
        params: {
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
        path: '/api/users/:id',
        method: 'PUT',
      });
      const res = createMockResponse();

      // First middleware
      await new Promise<void>((resolve) => {
        bodyValidator(req, res, () => {
          // Second middleware
          paramsValidator(req, res, () => {
            resolve();
          });
        });
      });

      expect(req.validated!.body).toBeDefined();
      expect(req.validated!.body.email).toBe('user@example.com');
      expect(req.validated!.params).toBeDefined();
      expect(req.validated!.params.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should preserve request state across validations', async () => {
      const middleware1 = validateBody(userSchema);
      const middleware2 = validateQuery(querySchema);

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123',
        },
        query: {
          page: '1',
        },
      });
      const res = createMockResponse();

      await middleware1(req, res, () => {
        const validated1 = req.validated!.body;
        middleware2(req, res, () => {
          expect(req.validated!.body).toEqual(validated1);
          expect(req.validated!.query).toBeDefined();
        });
      });
    });

    it('should work with Express error handling', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: { email: 'invalid' },
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      // Should not call next on validation error
      expect(next).not.toHaveBeenCalled();
      // Should send response directly
      expect(res.status).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request body', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: {},
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle null request body', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: null,
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle undefined request body', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: undefined,
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle array instead of object', async () => {
      const middleware = validateBody(userSchema);
      const req = createMockRequest({
        body: ['email@example.com', 'password'],
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
