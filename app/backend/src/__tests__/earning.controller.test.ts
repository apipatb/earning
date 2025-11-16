import { Response } from 'express';
import {
  getAllEarnings,
  createEarning,
  updateEarning,
  deleteEarning,
} from '../controllers/earning.controller';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import * as logger from '../lib/logger';
import * as earningsEvents from '../websocket/events/earnings.events';
import * as notificationsEvents from '../websocket/events/notifications.events';

jest.mock('../lib/prisma', () => ({
  earning: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
  platform: {
    findFirst: jest.fn(),
  },
}));

jest.mock('../lib/logger');
jest.mock('../websocket/events/earnings.events');
jest.mock('../websocket/events/notifications.events');

describe('Earning Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let responseData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    responseData = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => {
        responseData = data;
        return mockResponse;
      }),
    } as any;

    mockRequest = {
      user: { id: 'user-123', email: 'test@example.com' },
      query: {},
      body: {},
      params: {},
    };
  });

  describe('getAllEarnings', () => {
    it('should fetch all earnings for a user', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: 5,
          amount: 100,
          notes: 'Test earning',
          platform: { id: 'platform-1', name: 'Upwork', color: '#blue' },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);
      (prisma.earning.count as jest.Mock).mockResolvedValue(1);

      await getAllEarnings(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.earnings).toBeDefined();
      expect(responseData.total).toBe(1);
    });

    it('should apply date range filters', async () => {
      mockRequest.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.earning.count as jest.Mock).mockResolvedValue(0);

      await getAllEarnings(mockRequest as AuthRequest, mockResponse as Response);

      expect(prisma.earning.findMany).toHaveBeenCalled();
      const callArgs = (prisma.earning.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.date).toBeDefined();
    });

    it('should apply platform filter', async () => {
      mockRequest.query = {
        platform_id: 'platform-1',
      };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.earning.count as jest.Mock).mockResolvedValue(0);

      await getAllEarnings(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.earning.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.platformId).toBe('platform-1');
    });

    it('should handle pagination with limit and offset', async () => {
      mockRequest.query = { limit: '50', offset: '100' };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.earning.count as jest.Mock).mockResolvedValue(250);

      await getAllEarnings(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.has_more).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.earning.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getAllEarnings(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseData.error).toBe('Internal Server Error');
    });
  });

  describe('createEarning', () => {
    it('should create a new earning successfully', async () => {
      mockRequest.body = {
        platformId: '550e8400-e29b-41d4-a716-446655440000',
        date: '2024-01-01',
        hours: 5,
        amount: 100,
        notes: 'Completed project',
      };

      (prisma.platform.findFirst as jest.Mock).mockResolvedValue({
        id: 'platform-1',
        userId: 'user-123',
      });

      (prisma.earning.create as jest.Mock).mockResolvedValue({
        id: 'earning-1',
        userId: 'user-123',
        platformId: 'platform-1',
        date: new Date('2024-01-01'),
        hours: 5,
        amount: 100,
        notes: 'Completed project',
        platform: { id: 'platform-1', name: 'Upwork', color: '#blue' },
      });

      await createEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseData.earning).toBeDefined();
      expect(earningsEvents.emitEarningCreated).toHaveBeenCalled();
    });

    it('should reject earning if platform not found', async () => {
      mockRequest.body = {
        platformId: '550e8400-e29b-41d4-a716-446655440001',
        date: '2024-01-01',
        amount: 100,
      };

      (prisma.platform.findFirst as jest.Mock).mockResolvedValue(null);

      await createEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseData.error).toBe('Not Found');
    });

    it('should validate required fields', async () => {
      mockRequest.body = {
        platformId: 'platform-1',
        // missing date and amount
      };

      await createEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseData.error).toBe('Validation Error');
    });

    it('should reject invalid date format', async () => {
      mockRequest.body = {
        platformId: 'platform-1',
        date: 'invalid-date',
        amount: 100,
      };

      await createEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors during creation', async () => {
      mockRequest.body = {
        platformId: '550e8400-e29b-41d4-a716-446655440000',
        date: '2024-01-01',
        amount: 100,
      };

      (prisma.platform.findFirst as jest.Mock).mockResolvedValue({
        id: 'platform-1',
      });
      (prisma.earning.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await createEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateEarning', () => {
    it('should update an earning successfully', async () => {
      mockRequest.params = { id: 'earning-1' };
      mockRequest.body = {
        amount: 150,
        notes: 'Updated notes',
      };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue({
        id: 'earning-1',
        userId: 'user-123',
      });

      (prisma.earning.update as jest.Mock).mockResolvedValue({
        id: 'earning-1',
        amount: 150,
        notes: 'Updated notes',
        platform: { id: 'platform-1', name: 'Upwork', color: '#blue' },
      });

      await updateEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.earning).toBeDefined();
      expect(earningsEvents.emitEarningUpdated).toHaveBeenCalled();
    });

    it('should reject update if earning not found', async () => {
      mockRequest.params = { id: 'nonexistent-earning' };
      mockRequest.body = { amount: 150 };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(null);

      await updateEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseData.error).toBe('Not Found');
    });

    it('should handle partial updates', async () => {
      mockRequest.params = { id: 'earning-1' };
      mockRequest.body = { amount: 150 };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue({
        id: 'earning-1',
        userId: 'user-123',
      });

      (prisma.earning.update as jest.Mock).mockResolvedValue({
        id: 'earning-1',
        amount: 150,
        platform: { id: 'platform-1', name: 'Upwork', color: '#blue' },
      });

      await updateEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle database errors during update', async () => {
      mockRequest.params = { id: 'earning-1' };
      mockRequest.body = { amount: 150 };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue({
        id: 'earning-1',
      });
      (prisma.earning.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await updateEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteEarning', () => {
    it('should delete an earning successfully', async () => {
      mockRequest.params = { id: 'earning-1' };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue({
        id: 'earning-1',
        userId: 'user-123',
        amount: 100,
      });

      (prisma.earning.delete as jest.Mock).mockResolvedValue({
        id: 'earning-1',
      });

      await deleteEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.message).toBe('Earning deleted successfully');
      expect(earningsEvents.emitEarningDeleted).toHaveBeenCalled();
    });

    it('should reject deletion if earning not found', async () => {
      mockRequest.params = { id: 'nonexistent-earning' };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue(null);

      await deleteEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseData.error).toBe('Not Found');
    });

    it('should handle database errors during deletion', async () => {
      mockRequest.params = { id: 'earning-1' };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue({
        id: 'earning-1',
      });
      (prisma.earning.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await deleteEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should send delete notification', async () => {
      mockRequest.params = { id: 'earning-1' };

      (prisma.earning.findFirst as jest.Mock).mockResolvedValue({
        id: 'earning-1',
        userId: 'user-123',
      });
      (prisma.earning.delete as jest.Mock).mockResolvedValue({});

      await deleteEarning(mockRequest as AuthRequest, mockResponse as Response);

      expect(notificationsEvents.sendSuccessNotification).toHaveBeenCalled();
    });
  });
});
