/**
 * Tests for Analytics Controller
 */

import { getSummary } from '../analytics.controller';
import {
  createMockRequest,
  createMockResponse,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Analytics Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    const mockEarnings = [
      {
        id: '1',
        userId: 'user-123',
        amount: 500,
        hours: 10,
        date: new Date('2023-01-15'),
        platform: {
          id: 'platform-1',
          name: 'Platform A',
          color: '#FF0000',
        },
      },
      {
        id: '2',
        userId: 'user-123',
        amount: 300,
        hours: 6,
        date: new Date('2023-01-16'),
        platform: {
          id: 'platform-1',
          name: 'Platform A',
          color: '#FF0000',
        },
      },
      {
        id: '3',
        userId: 'user-123',
        amount: 400,
        hours: 8,
        date: new Date('2023-01-17'),
        platform: {
          id: 'platform-2',
          name: 'Platform B',
          color: '#00FF00',
        },
      },
    ];

    it('should return analytics summary successfully', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalled();
      verifySuccessResponse(res, 200);

      const response = getResponseData(res);
      expect(response.total_earnings).toBe(1200);
      expect(response.total_hours).toBe(24);
      expect(response.avg_hourly_rate).toBe(50);
    });

    it('should calculate platform breakdown correctly', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      const response = getResponseData(res);
      expect(response.by_platform).toHaveLength(2);

      const platformA = response.by_platform.find(
        (p: any) => p.platform.id === 'platform-1'
      );
      expect(platformA.earnings).toBe(800);
      expect(platformA.hours).toBe(16);
      expect(platformA.hourly_rate).toBe(50);
      expect(platformA.percentage).toBe(66.66666666666666);

      const platformB = response.by_platform.find(
        (p: any) => p.platform.id === 'platform-2'
      );
      expect(platformB.earnings).toBe(400);
      expect(platformB.hours).toBe(8);
      expect(platformB.hourly_rate).toBe(50);
      expect(platformB.percentage).toBe(33.33333333333333);
    });

    it('should calculate daily breakdown correctly', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      const response = getResponseData(res);
      expect(response.daily_breakdown).toHaveLength(3);
      expect(response.daily_breakdown[0].date).toBe('2023-01-15');
      expect(response.daily_breakdown[0].earnings).toBe(500);
      expect(response.daily_breakdown[0].hours).toBe(10);
    });

    it('should handle today period correctly', async () => {
      const todayEarnings = [
        {
          ...mockEarnings[0],
          date: new Date(),
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(todayEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'today' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should handle week period correctly', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'week' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalled();
      verifySuccessResponse(res, 200);
    });

    it('should handle year period correctly', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'year' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalled();
      verifySuccessResponse(res, 200);
    });

    it('should handle custom date range', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mockEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {
          start_date: '2023-01-01',
          end_date: '2023-01-31',
        },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      expect(prisma.earning.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            date: {
              gte: new Date('2023-01-01'),
              lte: new Date('2023-01-31'),
            },
          }),
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should handle empty earnings list', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.total_earnings).toBe(0);
      expect(response.total_hours).toBe(0);
      expect(response.avg_hourly_rate).toBe(0);
      expect(response.by_platform).toHaveLength(0);
      expect(response.daily_breakdown).toHaveLength(0);
    });

    it('should handle earnings without hours', async () => {
      const earningsWithoutHours = [
        {
          ...mockEarnings[0],
          hours: null,
        },
        {
          ...mockEarnings[1],
          hours: 0,
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(earningsWithoutHours);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.total_hours).toBe(0);
      expect(response.avg_hourly_rate).toBe(0);
    });

    it('should calculate average hourly rate correctly with mixed hours', async () => {
      const mixedEarnings = [
        {
          id: '1',
          amount: 500,
          hours: 10,
          date: new Date('2023-01-15'),
          platform: { id: 'p1', name: 'Platform 1', color: '#FF0000' },
        },
        {
          id: '2',
          amount: 200,
          hours: null,
          date: new Date('2023-01-16'),
          platform: { id: 'p1', name: 'Platform 1', color: '#FF0000' },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(mixedEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      const response = getResponseData(res);
      expect(response.total_earnings).toBe(700);
      expect(response.total_hours).toBe(10);
      expect(response.avg_hourly_rate).toBe(70);
    });

    it('should group multiple earnings on same date', async () => {
      const sameDateEarnings = [
        {
          id: '1',
          amount: 300,
          hours: 6,
          date: new Date('2023-01-15'),
          platform: { id: 'p1', name: 'Platform 1', color: '#FF0000' },
        },
        {
          id: '2',
          amount: 200,
          hours: 4,
          date: new Date('2023-01-15'),
          platform: { id: 'p2', name: 'Platform 2', color: '#00FF00' },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(sameDateEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      const response = getResponseData(res);
      expect(response.daily_breakdown).toHaveLength(1);
      expect(response.daily_breakdown[0].earnings).toBe(500);
      expect(response.daily_breakdown[0].hours).toBe(10);
    });

    it('should sort daily breakdown by date', async () => {
      const unsortedEarnings = [
        {
          id: '1',
          amount: 100,
          hours: 2,
          date: new Date('2023-01-20'),
          platform: { id: 'p1', name: 'Platform 1', color: '#FF0000' },
        },
        {
          id: '2',
          amount: 200,
          hours: 4,
          date: new Date('2023-01-10'),
          platform: { id: 'p1', name: 'Platform 1', color: '#FF0000' },
        },
        {
          id: '3',
          amount: 150,
          hours: 3,
          date: new Date('2023-01-15'),
          platform: { id: 'p1', name: 'Platform 1', color: '#FF0000' },
        },
      ];

      (prisma.earning.findMany as jest.Mock).mockResolvedValue(unsortedEarnings);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      const response = getResponseData(res);
      expect(response.daily_breakdown[0].date).toBe('2023-01-10');
      expect(response.daily_breakdown[1].date).toBe('2023-01-15');
      expect(response.daily_breakdown[2].date).toBe('2023-01-20');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.earning.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to fetch analytics');
    });

    it('should include period and date range in response', async () => {
      (prisma.earning.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'month' },
      });
      const res = createMockResponse();

      await getSummary(req as any, res);

      const response = getResponseData(res);
      expect(response.period).toBe('month');
      expect(response.start_date).toBeDefined();
      expect(response.end_date).toBeDefined();
    });
  });
});
