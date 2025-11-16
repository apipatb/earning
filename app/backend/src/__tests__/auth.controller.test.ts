import { Request, Response } from 'express';
import { register, login } from '../controllers/auth.controller';
import prisma from '../lib/prisma';
import * as passwordUtils from '../utils/password';
import * as jwtUtils from '../utils/jwt';
import * as logger from '../lib/logger';

// Mock external dependencies
jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../utils/password');
jest.mock('../utils/jwt');
jest.mock('../lib/logger');

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseData: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock response
    responseData = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => {
        responseData = data;
        return mockResponse;
      }),
    } as any;

    // Setup mock request
    mockRequest = {
      body: {},
      user: undefined,
    };
  });

  describe('register', () => {
    it('should successfully register a new user with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      mockRequest.body = userData;
      mockRequest.requestId = 'req-123';

      (passwordUtils.validatePassword as jest.Mock).mockReturnValue({ valid: true });
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: userData.email,
        name: userData.name,
        createdAt: new Date(),
      });
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('jwt-token-123');

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.user).toBeDefined();
      expect(responseData.token).toBe('jwt-token-123');
      expect(responseData.user.email).toBe(userData.email);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
      };

      mockRequest.body = userData;

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseData.error).toBe('Validation Error');
    });

    it('should reject registration if email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
      };

      mockRequest.body = userData;

      (passwordUtils.validatePassword as jest.Mock).mockReturnValue({ valid: true });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: userData.email,
      });

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseData.error).toBe('User Exists');
    });

    it('should handle validation errors for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'Password123',
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseData.error).toBe('Validation Error');
    });

    it('should handle database errors gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockRequest.body = userData;

      (passwordUtils.validatePassword as jest.Mock).mockReturnValue({ valid: true });
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseData.error).toBe('Internal Server Error');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockRequest.body = loginData;
      mockRequest.requestId = 'req-456';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: loginData.email,
        name: 'Test User',
        passwordHash: 'hashedPassword123',
      });
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('jwt-token-456');

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).not.toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.user).toBeDefined();
      expect(responseData.user.email).toBe(loginData.email);
      expect(responseData.token).toBe('jwt-token-456');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      mockRequest.body = loginData;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(responseData.error).toBe('Invalid Credentials');
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      mockRequest.body = loginData;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: loginData.email,
        passwordHash: 'hashedPassword123',
      });
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(responseData.error).toBe('Invalid Credentials');
    });

    it('should handle validation errors for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'Password123',
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseData.error).toBe('Validation Error');
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
      };

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseData.error).toBe('Internal Server Error');
    });
  });
});
