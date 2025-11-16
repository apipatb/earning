import { Response } from 'express';
import { getSummary } from '../controllers/analytics.controller';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import * as logger from '../lib/logger';

jest.mock('../lib/prisma', () => ({
  earning: {
    findMany: jest.fn(),
  },
}));

jest.mock('../lib/logger');

describe('Analytics Controller', () => {
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
    };
  });

  describe('getSummary', () => {
    it('should fetch analytics summary for default period (month)', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: 5,
          amount: 100,
          notes: null,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
        {
          id: 'earning-2',
          userId: 'user-123',
          platformId: 'platform-2',
          date: new Date('2024-01-02'),
          hours: 8,
          amount: 150,
          notes: null,
          platform: {
            id: 'platform-2',
            name: 'Fiverr',
            color: '#00A699',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.total_earnings).toBe(250);
      expect(responseData.total_hours).toBe(13);
    });

    it('should calculate average hourly rate correctly', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: 10,
          amount: 200,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.avg_hourly_rate).toBe(20);
    });

    it('should fetch summary for today period', async () => {
      mockRequest.query = { period: 'today' };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.earning.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.date).toBeDefined();
      expect(responseData.period).toBe('today');
    });

    it('should fetch summary for week period', async () => {
      mockRequest.query = { period: 'week' };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.earning.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.date).toBeDefined();
      expect(responseData.period).toBe('week');
    });

    it('should fetch summary for year period', async () => {
      mockRequest.query = { period: 'year' };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.earning.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.date).toBeDefined();
      expect(responseData.period).toBe('year');
    });

    it('should fetch summary for all time period', async () => {
      mockRequest.query = { period: 'alltime' };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.period).toBe('alltime');
    });

    it('should support custom date range with start_date and end_date', async () => {
      mockRequest.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.earning.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.date.gte).toBeDefined();
      expect(callArgs.where.date.lte).toBeDefined();
    });

    it('should group earnings by platform', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: 5,
          amount: 100,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
        {
          id: 'earning-2',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-02'),
          hours: 5,
          amount: 100,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
        {
          id: 'earning-3',
          userId: 'user-123',
          platformId: 'platform-2',
          date: new Date('2024-01-03'),
          hours: 10,
          amount: 200,
          platform: {
            id: 'platform-2',
            name: 'Fiverr',
            color: '#00A699',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.by_platform).toBeDefined();
      expect(responseData.by_platform.length).toBe(2);
      expect(responseData.by_platform[0].earnings).toBe(200); // Upwork total
      expect(responseData.by_platform[1].earnings).toBe(200); // Fiverr total
    });

    it('should calculate platform percentages correctly', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: 5,
          amount: 100,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
        {
          id: 'earning-2',
          userId: 'user-123',
          platformId: 'platform-2',
          date: new Date('2024-01-02'),
          hours: 5,
          amount: 300,
          platform: {
            id: 'platform-2',
            name: 'Fiverr',
            color: '#00A699',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.by_platform[0].percentage).toBe(25);
      expect(responseData.by_platform[1].percentage).toBe(75);
    });

    it('should provide daily breakdown of earnings', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: 5,
          amount: 100,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
        {
          id: 'earning-2',
          userId: 'user-123',
          platformId: 'platform-2',
          date: new Date('2024-01-02'),
          hours: 10,
          amount: 200,
          platform: {
            id: 'platform-2',
            name: 'Fiverr',
            color: '#00A699',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.daily_breakdown).toBeDefined();
      expect(responseData.daily_breakdown.length).toBe(2);
      expect(responseData.daily_breakdown[0].earnings).toBe(100);
      expect(responseData.daily_breakdown[0].hours).toBe(5);
    });

    it('should handle zero hours edge case', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: 0,
          amount: 50,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.total_hours).toBe(0);
      expect(responseData.avg_hourly_rate).toBe(0);
    });

    it('should handle null hours correctly', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-01'),
          hours: null,
          amount: 100,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.total_hours).toBe(0);
    });

    it('should handle empty earnings list', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.total_earnings).toBe(0);
      expect(responseData.total_hours).toBe(0);
      expect(responseData.avg_hourly_rate).toBe(0);
      expect(responseData.by_platform.length).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.earning.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseData.error).toBe('Internal Server Error');
    });

    it('should log analytics summary generation', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(logger.logInfo).toHaveBeenCalled();
    });

    it('should log debug information when fetching analytics', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(logger.logDebug).toHaveBeenCalled();
    });

    it('should handle custom date range with multiple earnings', async () => {
      mockRequest.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      const mockEarnings = [
        {
          id: 'earning-1',
          userId: 'user-123',
          platformId: 'platform-1',
          date: new Date('2024-01-15'),
          hours: 8,
          amount: 160,
          platform: {
            id: 'platform-1',
            name: 'Upwork',
            color: '#0066CC',
          },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      await getSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.start_date).toBe('2024-01-01');
      expect(responseData.end_date).toBe('2024-01-31');
    });
  });
});
