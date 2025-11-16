import { Response } from 'express';
import { ResponseUtil, ApiResponse, PaginatedResponse } from '../utils/response.util';

/**
 * Mock Response object for testing
 */
class MockResponse {
  statusCode = 200;
  headers: Record<string, string> = {};
  jsonData: any = null;
  sendData: any = null;

  status(code: number): MockResponse {
    this.statusCode = code;
    return this;
  }

  json(data: any): MockResponse {
    this.jsonData = data;
    return this;
  }

  send(data: any): MockResponse {
    this.sendData = data;
    return this;
  }

  setHeader(name: string, value: string): MockResponse {
    this.headers[name] = value;
    return this;
  }

  req = {
    requestId: 'test-request-id-123',
  };
}

describe('ResponseUtil', () => {
  let mockRes: any;

  beforeEach(() => {
    mockRes = new MockResponse() as any;
  });

  describe('success', () => {
    it('should return success response with data', () => {
      const testData = { id: 1, name: 'Test' };
      ResponseUtil.success(mockRes, testData);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonData.success).toBe(true);
      expect(mockRes.jsonData.data).toEqual(testData);
      expect(mockRes.jsonData.timestamp).toBeDefined();
      expect(mockRes.jsonData.requestId).toBe('test-request-id-123');
    });

    it('should use custom status code', () => {
      const testData = { id: 1, name: 'Test' };
      ResponseUtil.success(mockRes, testData, 'Created', 201);

      expect(mockRes.statusCode).toBe(201);
      expect(mockRes.jsonData.success).toBe(true);
    });

    it('should format timestamp correctly', () => {
      const testData = { id: 1 };
      ResponseUtil.success(mockRes, testData);

      const timestamp = mockRes.jsonData.timestamp;
      expect(new Date(timestamp)).toBeInstanceOf(Date);
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle null data', () => {
      ResponseUtil.success(mockRes, null);

      expect(mockRes.jsonData.success).toBe(true);
      expect(mockRes.jsonData.data).toBeNull();
    });

    it('should handle array data', () => {
      const testData = [{ id: 1 }, { id: 2 }];
      ResponseUtil.success(mockRes, testData);

      expect(mockRes.jsonData.success).toBe(true);
      expect(Array.isArray(mockRes.jsonData.data)).toBe(true);
      expect(mockRes.jsonData.data.length).toBe(2);
    });
  });

  describe('error', () => {
    it('should return error response with string error', () => {
      ResponseUtil.error(mockRes, 'Test error', 'TEST_ERROR', 400);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('TEST_ERROR');
      expect(mockRes.jsonData.error.message).toBe('Test error');
      expect(mockRes.jsonData.timestamp).toBeDefined();
    });

    it('should return error response with Error object', () => {
      const error = new Error('Test error message');
      ResponseUtil.error(mockRes, error, 'ERROR_CODE', 500);

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.message).toBe('Test error message');
      expect(mockRes.jsonData.error.code).toBe('ERROR_CODE');
    });

    it('should include error details', () => {
      const details = { field: 'email', issue: 'Invalid format' };
      ResponseUtil.error(mockRes, 'Validation failed', 'VALIDATION_ERROR', 400, details);

      expect(mockRes.jsonData.error.details).toEqual(details);
    });

    it('should use default code and status', () => {
      ResponseUtil.error(mockRes, 'Generic error');

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonData.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('paginated', () => {
    it('should return paginated response with correct structure', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      ResponseUtil.paginated(mockRes, data, 100, 10, 0);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonData.success).toBe(true);
      expect(mockRes.jsonData.data).toEqual(data);
      expect(mockRes.jsonData.pagination).toBeDefined();
    });

    it('should calculate pages correctly', () => {
      const data: any[] = [];
      ResponseUtil.paginated(mockRes, data, 100, 10, 0);

      expect(mockRes.jsonData.pagination.pages).toBe(10);
    });

    it('should include pagination metadata', () => {
      const data: any[] = [];
      ResponseUtil.paginated(mockRes, data, 250, 20, 40);

      const pagination = mockRes.jsonData.pagination;
      expect(pagination.total).toBe(250);
      expect(pagination.limit).toBe(20);
      expect(pagination.offset).toBe(40);
      expect(pagination.pages).toBe(Math.ceil(250 / 20));
    });

    it('should handle odd page calculations', () => {
      const data: any[] = [];
      ResponseUtil.paginated(mockRes, data, 99, 10, 0);

      expect(mockRes.jsonData.pagination.pages).toBe(10);
    });

    it('should include request ID', () => {
      const data: any[] = [];
      ResponseUtil.paginated(mockRes, data, 100, 10, 0);

      expect(mockRes.jsonData.requestId).toBe('test-request-id-123');
    });
  });

  describe('created', () => {
    it('should return 201 created status', () => {
      const data = { id: 1, name: 'New Item' };
      ResponseUtil.created(mockRes, data);

      expect(mockRes.statusCode).toBe(201);
      expect(mockRes.jsonData.success).toBe(true);
      expect(mockRes.jsonData.data).toEqual(data);
    });
  });

  describe('notFound', () => {
    it('should return 404 not found response', () => {
      ResponseUtil.notFound(mockRes, 'User not found');

      expect(mockRes.statusCode).toBe(404);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('NOT_FOUND');
      expect(mockRes.jsonData.error.message).toBe('User not found');
    });

    it('should use default message', () => {
      ResponseUtil.notFound(mockRes);

      expect(mockRes.jsonData.error.message).toBe('Resource not found');
    });
  });

  describe('unauthorized', () => {
    it('should return 401 unauthorized response', () => {
      ResponseUtil.unauthorized(mockRes, 'Invalid token');

      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('UNAUTHORIZED');
      expect(mockRes.jsonData.error.message).toBe('Invalid token');
    });

    it('should use default message', () => {
      ResponseUtil.unauthorized(mockRes);

      expect(mockRes.jsonData.error.message).toBe('Unauthorized');
    });
  });

  describe('forbidden', () => {
    it('should return 403 forbidden response', () => {
      ResponseUtil.forbidden(mockRes, 'Insufficient permissions');

      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('FORBIDDEN');
      expect(mockRes.jsonData.error.message).toBe('Insufficient permissions');
    });

    it('should use default message', () => {
      ResponseUtil.forbidden(mockRes);

      expect(mockRes.jsonData.error.message).toBe('Forbidden');
    });
  });

  describe('validationError', () => {
    it('should return 400 validation error response', () => {
      const details = {
        errors: [{ field: 'email', message: 'Invalid email' }],
      };

      ResponseUtil.validationError(mockRes, 'Validation failed', details);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('VALIDATION_ERROR');
      expect(mockRes.jsonData.error.details).toEqual(details);
    });
  });

  describe('badRequest', () => {
    it('should return 400 bad request response', () => {
      ResponseUtil.badRequest(mockRes, 'Missing required fields');

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('conflict', () => {
    it('should return 409 conflict response', () => {
      ResponseUtil.conflict(mockRes, 'Email already exists');

      expect(mockRes.statusCode).toBe(409);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('CONFLICT');
      expect(mockRes.jsonData.error.message).toBe('Email already exists');
    });
  });

  describe('rateLimitExceeded', () => {
    it('should return 429 rate limit response', () => {
      ResponseUtil.rateLimitExceeded(mockRes, 60);

      expect(mockRes.statusCode).toBe(429);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should set Retry-After header', () => {
      ResponseUtil.rateLimitExceeded(mockRes, 120);

      expect(mockRes.headers['Retry-After']).toBe('120');
    });

    it('should include rate limit details', () => {
      const details = { remaining: 0, resetTime: '2024-01-01T00:00:00Z' };
      ResponseUtil.rateLimitExceeded(mockRes, 60, details);

      expect(mockRes.jsonData.error.details).toEqual(details);
    });
  });

  describe('internalError', () => {
    it('should return 500 internal error response', () => {
      ResponseUtil.internalError(mockRes);

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('INTERNAL_ERROR');
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection failed');
      ResponseUtil.internalError(mockRes, error);

      expect(mockRes.jsonData.error.message).toBe('Internal server error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error message');
      ResponseUtil.internalError(mockRes, error);

      expect(mockRes.jsonData.error.message).toBe('Test error message');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('response format consistency', () => {
    it('should always include timestamp in response', () => {
      const responses = [
        () => ResponseUtil.success(mockRes, { data: 'test' }),
        () => ResponseUtil.error(mockRes, 'Error'),
        () => ResponseUtil.notFound(mockRes),
        () => ResponseUtil.unauthorized(mockRes),
      ];

      responses.forEach((fn) => {
        mockRes = new MockResponse() as any;
        fn();
        expect(mockRes.jsonData.timestamp).toBeDefined();
        expect(typeof mockRes.jsonData.timestamp).toBe('string');
      });
    });

    it('should always include requestId when available', () => {
      const responses = [
        () => ResponseUtil.success(mockRes, { data: 'test' }),
        () => ResponseUtil.error(mockRes, 'Error'),
        () => ResponseUtil.created(mockRes, {}),
      ];

      responses.forEach((fn) => {
        mockRes = new MockResponse() as any;
        fn();
        expect(mockRes.jsonData.requestId).toBe('test-request-id-123');
      });
    });

    it('should always return Response object for chaining', () => {
      const result = ResponseUtil.success(mockRes, { test: 'data' });
      expect(result).toBe(mockRes);
    });
  });
});
