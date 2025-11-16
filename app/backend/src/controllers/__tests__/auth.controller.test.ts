/**
 * Tests for Auth Controller
 */

import { register } from '../auth.controller';
import { createMockRequest, createMockResponse, verifySuccessResponse, verifyErrorResponse, getResponseData } from '../../test/utils';
import prisma from '../../lib/prisma';
import * as passwordUtils from '../../utils/password';
import * as jwtUtils from '../../utils/jwt';

jest.mock('../../lib/prisma');
jest.mock('../../utils/password');
jest.mock('../../utils/jwt');

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (passwordUtils.validatePassword as jest.Mock).mockReturnValue({ valid: true });
    (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
    (jwtUtils.generateToken as jest.Mock).mockReturnValue('test_token');
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        name: 'New User',
        createdAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        body: {
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      verifySuccessResponse(res, 201);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            email: 'newuser@example.com',
          }),
          token: 'test_token',
        })
      );
    });

    it('should reject registration with invalid email', async () => {
      const req = createMockRequest({
        body: {
          email: 'invalid-email',
          password: 'SecurePassword123!',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should reject registration with weak password', async () => {
      (passwordUtils.validatePassword as jest.Mock).mockReturnValue({
        valid: false,
        message: 'Password must contain uppercase, lowercase, and numbers',
      });

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'weak',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Invalid Password');
    });

    it('should reject registration if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'existing@example.com',
      });

      const req = createMockRequest({
        body: {
          email: 'existing@example.com',
          password: 'SecurePassword123!',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('User Exists');
    });

    it('should hash password before storing', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: null,
        createdAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123!',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('SecurePassword123!');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: 'hashed_password',
          }),
        })
      );
    });

    it('should generate JWT token for new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      expect(jwtUtils.generateToken).toHaveBeenCalledWith('user-123', 'user@example.com');
    });

    it('should handle server errors gracefully', async () => {
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123!',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.error).toBe('Internal Server Error');
    });

    it('should make name field optional', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: null,
        createdAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123!',
          // name is omitted
        },
      });

      const res = createMockResponse();

      await register(req, res);

      verifySuccessResponse(res, 201);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should not expose password hash in response', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        },
      });

      const res = createMockResponse();

      await register(req, res);

      const response = getResponseData(res);
      expect(response.user).not.toHaveProperty('passwordHash');
      expect(response.user).not.toHaveProperty('password');
    });
  });
});
