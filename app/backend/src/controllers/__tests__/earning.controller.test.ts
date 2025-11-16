/**
 * Tests for Earning Controller
 */

import { getAllEarnings, createEarning, updateEarning, deleteEarning } from '../earning.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockEarning,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Earning Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllEarnings', () => {
    it('should return all earnings for a user', async () => {
      const mockEarnings = [
        {
          id: '1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-15'),
          hours: 8,
          amount: 200,
          notes: 'Test earning',
          platform: { id: 'platform-1', name: 'Platform A', color: '#FF0000' },
        },
        {
          id: '2',
          userId: 'user-123',
          platformId: 'platform-2',
          date: new Date('2024-01-16'),
          hours: 6,
          amount: 150,
          notes: null,
          platform: { id: 'platform-2', name: 'Platform B', color: '#00FF00' },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);
      (prisma.earning.count as jest.Mock).mockResolvedValue(2);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllEarnings(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: 100,
        skip: 0,
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.earnings).toHaveLength(2);
      expect(response.total).toBe(2);
      expect(response.has_more).toBe(false);
    });

    it('should filter earnings by date range', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.earning.count as jest.Mock).mockResolvedValue(0);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      });
      const res = createMockResponse();

      await getAllEarnings(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            date: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should filter earnings by platform', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.earning.count as jest.Mock).mockResolvedValue(0);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { platform_id: 'platform-1' },
      });
      const res = createMockResponse();

      await getAllEarnings(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            platformId: 'platform-1',
          }),
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should support pagination with limit and offset', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.earning.count as jest.Mock).mockResolvedValue(150);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { limit: '50', offset: '50' },
      });
      const res = createMockResponse();

      await getAllEarnings(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 50,
        })
      );
      const response = getResponseData(res);
      expect(response.has_more).toBe(true);
    });

    it('should calculate hourly rate correctly', async () => {
      const mockEarnings = [
        {
          id: '1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-15'),
          hours: 8,
          amount: 200,
          notes: null,
          platform: { id: 'platform-1', name: 'Platform A', color: '#FF0000' },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);
      (prisma.earning.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllEarnings(req as any, res);

      const response = getResponseData(res);
      expect(response.earnings[0].hourly_rate).toBe(25);
    });

    it('should handle earnings without hours', async () => {
      const mockEarnings = [
        {
          id: '1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-15'),
          hours: null,
          amount: 200,
          notes: null,
          platform: { id: 'platform-1', name: 'Platform A', color: '#FF0000' },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);
      (prisma.earning.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllEarnings(req as any, res);

      const response = getResponseData(res);
      expect(response.earnings[0].hourly_rate).toBeNull();
    });

    it('should handle server errors gracefully', async () => {
      (prisma.earning.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllEarnings(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to fetch earnings');
    });
  });

  describe('createEarning', () => {
    it('should create earning successfully', async () => {
      const mockPlatform = { id: 'platform-1', userId: 'user-123', name: 'Platform A' };
      const mockEarning = {
        id: 'earning-1',
        userId: 'user-123',
        platformId: 'platform-1',
        date: new Date('2024-01-15'),
        hours: 8,
        amount: 200,
        notes: 'Test earning',
        platform: { id: 'platform-1', name: 'Platform A', color: '#FF0000' },
      };

      (prisma.platform.findFirst as jest.Mock).mockResolvedValue(mockPlatform);
      (prisma.earning.create as jest.Mock).mockResolvedValue(mockEarning);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'platform-1',
          date: '2024-01-15',
          hours: 8,
          amount: 200,
          notes: 'Test earning',
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      expect(prisma.platform.findFirst).toHaveBeenCalledWith({
        where: { id: 'platform-1', userId: 'user-123' },
      });
      expect(prisma.earning.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-15'),
          hours: 8,
          amount: 200,
          notes: 'Test earning',
        },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
      verifySuccessResponse(res, 201);
    });

    it('should create earning without hours', async () => {
      const mockPlatform = { id: 'platform-1', userId: 'user-123' };
      const mockEarning = {
        id: 'earning-1',
        userId: 'user-123',
        platformId: 'platform-1',
        date: new Date('2024-01-15'),
        hours: undefined,
        amount: 200,
        notes: undefined,
        platform: { id: 'platform-1', name: 'Platform A', color: '#FF0000' },
      };

      (prisma.platform.findFirst as jest.Mock).mockResolvedValue(mockPlatform);
      (prisma.earning.create as jest.Mock).mockResolvedValue(mockEarning);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'platform-1',
          date: '2024-01-15',
          amount: 200,
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      verifySuccessResponse(res, 201);
    });

    it('should reject if platform not found', async () => {
      (prisma.platform.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'nonexistent',
          date: '2024-01-15',
          amount: 200,
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.message).toBe('Platform not found');
      expect(prisma.earning.create).not.toHaveBeenCalled();
    });

    it('should reject if platform belongs to different user', async () => {
      (prisma.platform.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'other-user-platform',
          date: '2024-01-15',
          amount: 200,
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.earning.create).not.toHaveBeenCalled();
    });

    it('should reject invalid date format', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'platform-1',
          date: 'invalid-date',
          amount: 200,
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should reject negative amount', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'platform-1',
          date: '2024-01-15',
          amount: -100,
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should reject invalid platform ID format', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'not-a-uuid',
          date: '2024-01-15',
          amount: 200,
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      verifyErrorResponse(res, 400);
    });

    it('should handle server errors gracefully', async () => {
      const mockPlatform = { id: 'platform-1', userId: 'user-123' };
      (prisma.platform.findFirst as jest.Mock).mockResolvedValue(mockPlatform);
      (prisma.earning.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          platformId: 'platform-1',
          date: '2024-01-15',
          amount: 200,
        },
      });
      const res = createMockResponse();

      await createEarning(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to create earning');
    });
  });

  describe('updateEarning', () => {
    it('should update earning successfully', async () => {
      const mockEarning = createMockEarning({ id: 'earning-1', userId: 'user-123' });
      const updatedEarning = {
        ...mockEarning,
        amount: 250,
        hours: 10,
        platform: { id: 'platform-1', name: 'Platform A', color: '#FF0000' },
      };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(mockEarning);
      (prisma.earning.update as jest.Mock).mockResolvedValue(updatedEarning);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'earning-1' },
        body: { amount: 250, hours: 10 },
      });
      const res = createMockResponse();

      await updateEarning(req as any, res);

      expect(prisma.earning.findFirst).toHaveBeenCalledWith({
        where: { id: 'earning-1', userId: 'user-123' },
      });
      expect(prisma.earning.update).toHaveBeenCalledWith({
        where: { id: 'earning-1' },
        data: { amount: 250, hours: 10 },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
      verifySuccessResponse(res, 200);
    });

    it('should reject if earning not found', async () => {
      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
        body: { amount: 250 },
      });
      const res = createMockResponse();

      await updateEarning(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.message).toBe('Earning not found');
      expect(prisma.earning.update).not.toHaveBeenCalled();
    });

    it('should reject if earning belongs to different user', async () => {
      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-user-earning' },
        body: { amount: 250 },
      });
      const res = createMockResponse();

      await updateEarning(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.earning.update).not.toHaveBeenCalled();
    });

    it('should update only specified fields', async () => {
      const mockEarning = createMockEarning({ id: 'earning-1', userId: 'user-123' });
      const updatedEarning = {
        ...mockEarning,
        notes: 'Updated notes',
        platform: { id: 'platform-1', name: 'Platform A', color: '#FF0000' },
      };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(mockEarning);
      (prisma.earning.update as jest.Mock).mockResolvedValue(updatedEarning);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'earning-1' },
        body: { notes: 'Updated notes' },
      });
      const res = createMockResponse();

      await updateEarning(req as any, res);

      expect(prisma.earning.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { notes: 'Updated notes' },
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should handle server errors gracefully', async () => {
      const mockEarning = createMockEarning({ id: 'earning-1', userId: 'user-123' });
      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(mockEarning);
      (prisma.earning.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'earning-1' },
        body: { amount: 250 },
      });
      const res = createMockResponse();

      await updateEarning(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to update earning');
    });
  });

  describe('deleteEarning', () => {
    it('should delete earning successfully', async () => {
      const mockEarning = createMockEarning({ id: 'earning-1', userId: 'user-123' });
      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(mockEarning);
      (prisma.earning.delete as jest.Mock).mockResolvedValue(mockEarning);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'earning-1' },
      });
      const res = createMockResponse();

      await deleteEarning(req as any, res);

      expect(prisma.earning.findFirst).toHaveBeenCalledWith({
        where: { id: 'earning-1', userId: 'user-123' },
      });
      expect(prisma.earning.delete).toHaveBeenCalledWith({
        where: { id: 'earning-1' },
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.message).toBe('Earning deleted successfully');
    });

    it('should reject if earning not found', async () => {
      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
      });
      const res = createMockResponse();

      await deleteEarning(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.message).toBe('Earning not found');
      expect(prisma.earning.delete).not.toHaveBeenCalled();
    });

    it('should reject if earning belongs to different user', async () => {
      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-user-earning' },
      });
      const res = createMockResponse();

      await deleteEarning(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.earning.delete).not.toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      const mockEarning = createMockEarning({ id: 'earning-1', userId: 'user-123' });
      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(mockEarning);
      (prisma.earning.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'earning-1' },
      });
      const res = createMockResponse();

      await deleteEarning(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to delete earning');
    });
  });
});
