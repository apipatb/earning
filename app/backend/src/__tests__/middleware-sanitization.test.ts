import { Request, Response, NextFunction } from 'express';
import sanitizationMiddleware from '../middleware/sanitization.middleware';
import inputValidationMiddleware from '../middleware/input-validation.middleware';

describe('Sanitization Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
    res = {};
    req = {
      method: 'POST',
      path: '/api/test',
      body: {},
      query: {},
      params: {},
      is: jest.fn((type: string) => false),
      get: jest.fn(),
    };
  });

  describe('sanitizationMiddleware', () => {
    it('should skip GET requests', () => {
      req.method = 'GET';
      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({});
    });

    it('should skip file uploads', () => {
      req.is = jest.fn((type: string) => {
        return type === 'multipart/form-data' ? 'multipart/form-data' : false;
      }) as any;
      req.body = { file: 'binary data' };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ file: 'binary data' });
    });

    it('should sanitize XSS in request body', () => {
      req.body = {
        username: '<img src=x>admin</img>',
        email: 'user@example.com',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.username).not.toContain('<img');
      expect(req.body.username).toContain('admin');
      expect(req.body.email).toBe('user@example.com');
    });

    it('should trim whitespace from strings', () => {
      req.body = {
        username: '  john  ',
        email: '  user@example.com  \n',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('john');
      expect(req.body.email).toBe('user@example.com');
    });

    it('should sanitize event handlers', () => {
      req.body = {
        content: '<img src=x onerror="alert(1)" />Image',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.content).not.toContain('onerror');
    });

    it('should sanitize iframe tags', () => {
      req.body = {
        message: 'Check this out: <iframe src="malicious.com"></iframe>',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.message).not.toContain('<iframe>');
    });

    it('should sanitize nested objects', () => {
      req.body = {
        user: {
          name: '<script>John</script>',
          profile: {
            bio: '<iframe>test</iframe>',
          },
        },
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.user.name).toBe('John');
      expect(req.body.user.profile.bio).toBe('test');
    });

    it('should sanitize arrays', () => {
      req.body = {
        items: [
          '<script>item1</script>',
          '<iframe>item2</iframe>',
        ],
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.items[0]).toBe('item1');
      expect(req.body.items[1]).toBe('item2');
    });

    it('should sanitize query parameters', () => {
      req.query = {
        search: '<img src=x>test</img>',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.query.search).not.toContain('<img');
      expect(req.query.search).toContain('test');
    });

    it('should sanitize route parameters', () => {
      req.params = {
        id: '<img src=x>123</img>',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.params.id).toBe('123');
    });

    it('should apply to PUT requests', () => {
      req.method = 'PUT';
      req.body = {
        name: '<img src=x>test</img>',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.name).not.toContain('<img');
      expect(req.body.name).toContain('test');
    });

    it('should apply to PATCH requests', () => {
      req.method = 'PATCH';
      req.body = {
        email: '<iframe>test@example.com</iframe>',
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.email).toBe('test@example.com');
    });

    it('should preserve normal data types', () => {
      req.body = {
        age: 30,
        active: true,
        name: 'John',
        salary: 50000.50,
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.age).toBe(30);
      expect(req.body.active).toBe(true);
      expect(req.body.name).toBe('John');
      expect(req.body.salary).toBe(50000.50);
    });

    it('should handle null and undefined values', () => {
      req.body = {
        value1: null,
        value2: undefined,
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.value1).toBeNull();
      expect(req.body.value2).toBeUndefined();
    });

    it('should continue on error', () => {
      req.body = {};
      req.body = null; // Force an edge case

      sanitizationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('inputValidationMiddleware', () => {
    let jsonResponse: jest.Mock;

    beforeEach(() => {
      jsonResponse = jest.fn().mockReturnValue({});
      res.status = jest.fn().mockReturnValue({ json: jsonResponse });
    });

    it('should skip GET requests', () => {
      req.method = 'GET';
      req.query = { sql: "' OR '1'='1" };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should detect SQL injection in body', () => {
      req.body = {
        username: "admin' OR '1'='1' --",
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalled();
    });

    it('should detect XSS patterns in body', () => {
      req.body = {
        message: '<script>alert("XSS")</script>',
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalled();
    });

    it('should detect command injection in body', () => {
      req.body = {
        command: '$(whoami)',
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalled();
    });

    it('should detect SQL injection in query', () => {
      req.method = 'POST';
      req.query = {
        id: "1; DELETE FROM users; --",
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should detect XSS in params', () => {
      req.method = 'POST';
      req.params = {
        id: '<iframe src="malicious.com"></iframe>',
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should allow normal data through', () => {
      req.body = {
        username: 'john_doe',
        email: 'john@example.com',
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow numeric data through', () => {
      req.body = {
        age: 30,
        salary: 50000.50,
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should detect excessively long strings', () => {
      req.body = {
        message: 'A'.repeat(11000), // Exceeds default 10000
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should detect deeply nested objects', () => {
      let nested: any = { data: 'test' };
      for (let i = 0; i < 25; i++) {
        nested = { level: nested };
      }
      req.body = nested;

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should allow moderately nested objects', () => {
      let nested: any = { data: 'test' };
      for (let i = 0; i < 10; i++) {
        nested = { level: nested };
      }
      req.body = nested;

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return error response with detection details', () => {
      req.body = {
        username: "' UNION SELECT * FROM users --",
      };

      inputValidationMiddleware(req as Request, res as Response, next);

      const responseCall = jsonResponse.mock.calls[0][0];
      expect(responseCall).toHaveProperty('error');
      expect(responseCall).toHaveProperty('message');
      expect(responseCall).toHaveProperty('detections');
      expect(Array.isArray(responseCall.detections)).toBe(true);
    });

    it('should continue on middleware error', () => {
      req.body = { test: 'data' };

      // Mock next to test error handling doesn't break flow
      inputValidationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle large arrays', () => {
      req.body = {
        items: new Array(1001).fill('test'),
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should allow reasonable array sizes', () => {
      req.body = {
        items: new Array(100).fill('test'),
      };

      inputValidationMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Middleware Integration', () => {
    it('should apply sanitization before validation', () => {
      // Request with XSS that would be cleaned
      req.body = {
        name: '<img src=x>test</img>',
      };

      // Sanitization runs first
      sanitizationMiddleware(req as Request, res as Response, next);

      // After sanitization, tags should be removed
      expect(req.body.name).not.toContain('<img');
      expect(req.body.name).toContain('test');

      // Now validation should pass
      next.mockClear();
      const jsonResponse = jest.fn();
      const mockRes = {
        status: jest.fn().mockReturnValue({ json: jsonResponse }),
      };
      inputValidationMiddleware(req as Request, mockRes as unknown as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should detect injection even after sanitization attempt', () => {
      // SQL injection that might survive basic XSS sanitization
      req.body = {
        query: "' UNION SELECT * FROM users --",
      };

      sanitizationMiddleware(req as Request, res as Response, next);
      // Sanitization doesn't remove SQL syntax
      expect(req.body.query).toContain('UNION');

      // Validation catches it
      next.mockClear();
      const jsonResponse = jest.fn();
      const mockRes = {
        status: jest.fn().mockReturnValue({ json: jsonResponse }),
      };

      inputValidationMiddleware(req as Request, mockRes as unknown as Response, next);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
