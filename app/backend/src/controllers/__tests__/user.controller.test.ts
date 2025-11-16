/**
 * Tests for User Controller
 */

import { getProfile, updateProfile, changePassword, deleteAccount } from '../user.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockUser,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';
import * as passwordUtils from '../../utils/password';

jest.mock('../../lib/prisma');
jest.mock('../../utils/password');

describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'America/New_York',
        currency: 'USD',
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getProfile(req as any, res);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'nonexistent', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getProfile(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.error).toBe('User not found');
    });

    it('should not expose sensitive fields like password', async () => {
      const mockUser = createMockUser();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getProfile(req as any, res);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({
            password: true,
            passwordHash: true,
          }),
        })
      );
    });

    it('should handle server errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getProfile(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.error).toBe('Failed to fetch profile');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = createMockUser({
        id: 'user-123',
        name: 'Updated Name',
        timezone: 'Europe/London',
        currency: 'EUR',
      });

      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          name: 'Updated Name',
          timezone: 'Europe/London',
          currency: 'EUR',
        },
      });
      const res = createMockResponse();

      await updateProfile(req as any, res);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: {
            name: 'Updated Name',
            timezone: 'Europe/London',
            currency: 'EUR',
          },
        })
      );
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response).toEqual(updatedUser);
    });

    it('should update only name field', async () => {
      const updatedUser = createMockUser({ name: 'New Name' });
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: { name: 'New Name' },
      });
      const res = createMockResponse();

      await updateProfile(req as any, res);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'New Name' },
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should reject invalid currency code', async () => {
      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: { currency: 'INVALID' },
      });
      const res = createMockResponse();

      await updateProfile(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Invalid profile data');
    });

    it('should reject name that is too long', async () => {
      const longName = 'a'.repeat(101);
      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: { name: longName },
      });
      const res = createMockResponse();

      await updateProfile(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Invalid profile data');
    });

    it('should handle empty update gracefully', async () => {
      const mockUser = createMockUser();
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: {},
      });
      const res = createMockResponse();

      await updateProfile(req as any, res);

      verifySuccessResponse(res, 200);
    });

    it('should handle server errors gracefully', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: { name: 'New Name' },
      });
      const res = createMockResponse();

      await updateProfile(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.error).toBe('Failed to update profile');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = createMockUser({ passwordHash: 'old_hashed_password' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        },
      });
      const res = createMockResponse();

      await changePassword(req as any, res);

      expect(passwordUtils.comparePassword).toHaveBeenCalledWith('OldPassword123!', 'old_hashed_password');
      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('NewPassword456!');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { passwordHash: 'new_hashed_password' },
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.message).toBe('Password changed successfully');
    });

    it('should reject if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'nonexistent', email: 'test@example.com' },
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        },
      });
      const res = createMockResponse();

      await changePassword(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.error).toBe('User not found');
    });

    it('should reject if current password is incorrect', async () => {
      const mockUser = createMockUser({ passwordHash: 'old_hashed_password' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        },
      });
      const res = createMockResponse();

      await changePassword(req as any, res);

      verifyErrorResponse(res, 401);
      const response = getResponseData(res);
      expect(response.error).toBe('Current password is incorrect');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject if new password is too short', async () => {
      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: '123',
        },
      });
      const res = createMockResponse();

      await changePassword(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Invalid password data');
    });

    it('should reject if current password is missing', async () => {
      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: {
          newPassword: 'NewPassword456!',
        },
      });
      const res = createMockResponse();

      await changePassword(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Invalid password data');
    });

    it('should handle server errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        },
      });
      const res = createMockResponse();

      await changePassword(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.error).toBe('Failed to change password');
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: '1' });

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await deleteAccount(req as any, res);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should cascade delete all related data', async () => {
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: '1' });

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await deleteAccount(req as any, res);

      // Verify that delete was called (cascade handled by Prisma schema)
      expect(prisma.user.delete).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should handle server errors gracefully', async () => {
      (prisma.user.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: '1', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await deleteAccount(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.error).toBe('Failed to delete account');
    });

    it('should handle non-existent user gracefully', async () => {
      (prisma.user.delete as jest.Mock).mockRejectedValue(
        new Error('Record to delete does not exist.')
      );

      const req = createMockRequest({
        user: { id: 'nonexistent', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await deleteAccount(req as any, res);

      verifyErrorResponse(res, 500);
    });
  });
});
