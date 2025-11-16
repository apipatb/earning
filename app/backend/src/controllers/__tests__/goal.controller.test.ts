/**
 * Tests for Goal Controller
 */

import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
} from '../goal.controller';
import {
  createMockRequest,
  createMockResponse,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Goal Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoals', () => {
    it('should return all goals successfully', async () => {
      const mockGoals = [
        {
          id: '1',
          userId: 'user-123',
          title: 'Save $10,000',
          targetAmount: 10000,
          currentAmount: 5000,
          deadline: new Date('2024-12-31'),
          description: 'Emergency fund',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: 'user-123',
          title: 'Earn $5,000',
          targetAmount: 5000,
          currentAmount: 5000,
          deadline: null,
          description: null,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.goal.findMany as jest.Mock).mockResolvedValue(mockGoals);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getGoals(req as any, res);

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response).toHaveLength(2);
    });

    it('should filter goals by status', async () => {
      (prisma.goal.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { status: 'active' },
      });
      const res = createMockResponse();

      await getGoals(req as any, res);

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'active' },
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.goal.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getGoals(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.error).toBe('Failed to fetch goals');
    });
  });

  describe('getGoal', () => {
    it('should return a specific goal', async () => {
      const mockGoal = {
        id: '1',
        userId: 'user-123',
        title: 'Save $10,000',
        targetAmount: 10000,
        currentAmount: 5000,
        deadline: new Date('2024-12-31'),
        description: 'Emergency fund',
        status: 'active',
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(mockGoal);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await getGoal(req as any, res);

      expect(prisma.goal.findFirst).toHaveBeenCalledWith({
        where: { id: '1', userId: 'user-123' },
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.id).toBe('1');
    });

    it('should return 404 if goal not found', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
      });
      const res = createMockResponse();

      await getGoal(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.error).toBe('Goal not found');
    });

    it('should prevent accessing other users goals', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-goal' },
      });
      const res = createMockResponse();

      await getGoal(req as any, res);

      verifyErrorResponse(res, 404);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.goal.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await getGoal(req as any, res);

      verifyErrorResponse(res, 500);
    });
  });

  describe('createGoal', () => {
    it('should create a new goal successfully', async () => {
      const mockGoal = {
        id: '1',
        userId: 'user-123',
        title: 'New Goal',
        targetAmount: 5000,
        currentAmount: 0,
        deadline: new Date('2024-12-31'),
        description: 'Test goal',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          title: 'New Goal',
          targetAmount: 5000,
          deadline: '2024-12-31T00:00:00.000Z',
          description: 'Test goal',
        },
      });
      const res = createMockResponse();

      await createGoal(req as any, res);

      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          title: 'New Goal',
          targetAmount: 5000,
          currentAmount: 0,
          status: 'active',
        }),
      });
      verifySuccessResponse(res, 201);
      const response = getResponseData(res);
      expect(response.id).toBe('1');
    });

    it('should create goal without deadline', async () => {
      const mockGoal = {
        id: '1',
        userId: 'user-123',
        title: 'Flexible Goal',
        targetAmount: 3000,
        currentAmount: 0,
        deadline: null,
        description: null,
        status: 'active',
      };

      (prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          title: 'Flexible Goal',
          targetAmount: 3000,
        },
      });
      const res = createMockResponse();

      await createGoal(req as any, res);

      verifySuccessResponse(res, 201);
    });

    it('should reject goal with missing title', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          targetAmount: 5000,
        },
      });
      const res = createMockResponse();

      await createGoal(req as any, res);

      verifyErrorResponse(res, 400);
      expect(prisma.goal.create).not.toHaveBeenCalled();
    });

    it('should reject goal with negative target amount', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          title: 'Invalid Goal',
          targetAmount: -1000,
        },
      });
      const res = createMockResponse();

      await createGoal(req as any, res);

      verifyErrorResponse(res, 400);
      expect(prisma.goal.create).not.toHaveBeenCalled();
    });

    it('should reject goal with zero target amount', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          title: 'Zero Goal',
          targetAmount: 0,
        },
      });
      const res = createMockResponse();

      await createGoal(req as any, res);

      verifyErrorResponse(res, 400);
    });

    it('should reject goal with title too long', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          title: 'a'.repeat(201),
          targetAmount: 5000,
        },
      });
      const res = createMockResponse();

      await createGoal(req as any, res);

      verifyErrorResponse(res, 400);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.goal.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          title: 'Test Goal',
          targetAmount: 5000,
        },
      });
      const res = createMockResponse();

      await createGoal(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.error).toBe('Failed to create goal');
    });
  });

  describe('updateGoal', () => {
    it('should update goal successfully', async () => {
      const existingGoal = {
        id: '1',
        userId: 'user-123',
        title: 'Old Title',
        targetAmount: 5000,
      };

      const updatedGoal = {
        ...existingGoal,
        title: 'Updated Title',
        targetAmount: 7000,
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
      (prisma.goal.update as jest.Mock).mockResolvedValue(updatedGoal);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
        body: {
          title: 'Updated Title',
          targetAmount: 7000,
        },
      });
      const res = createMockResponse();

      await updateGoal(req as any, res);

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          targetAmount: 7000,
        }),
      });
      verifySuccessResponse(res, 200);
    });

    it('should allow updating current amount', async () => {
      const existingGoal = {
        id: '1',
        userId: 'user-123',
        currentAmount: 1000,
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
      (prisma.goal.update as jest.Mock).mockResolvedValue({
        ...existingGoal,
        currentAmount: 2500,
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
        body: { currentAmount: 2500 },
      });
      const res = createMockResponse();

      await updateGoal(req as any, res);

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { currentAmount: 2500 },
      });
    });

    it('should allow changing goal status', async () => {
      const existingGoal = {
        id: '1',
        userId: 'user-123',
        status: 'active',
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
      (prisma.goal.update as jest.Mock).mockResolvedValue({
        ...existingGoal,
        status: 'cancelled',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
        body: { status: 'cancelled' },
      });
      const res = createMockResponse();

      await updateGoal(req as any, res);

      verifySuccessResponse(res, 200);
    });

    it('should return 404 if goal not found', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
        body: { title: 'Updated' },
      });
      const res = createMockResponse();

      await updateGoal(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.goal.update).not.toHaveBeenCalled();
    });

    it('should prevent updating other users goals', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-goal' },
        body: { title: 'Hacked' },
      });
      const res = createMockResponse();

      await updateGoal(req as any, res);

      verifyErrorResponse(res, 404);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.goal.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
        body: { title: 'Updated' },
      });
      const res = createMockResponse();

      await updateGoal(req as any, res);

      verifyErrorResponse(res, 500);
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal successfully', async () => {
      const existingGoal = {
        id: '1',
        userId: 'user-123',
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(existingGoal);
      (prisma.goal.delete as jest.Mock).mockResolvedValue(existingGoal);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await deleteGoal(req as any, res);

      expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 if goal not found', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
      });
      const res = createMockResponse();

      await deleteGoal(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.goal.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.goal.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await deleteGoal(req as any, res);

      verifyErrorResponse(res, 500);
    });
  });

  describe('updateGoalProgress', () => {
    it('should update goal progress from earnings', async () => {
      const mockGoal = {
        id: '1',
        userId: 'user-123',
        targetAmount: 5000,
        currentAmount: 0,
        createdAt: new Date('2024-01-01'),
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(mockGoal);
      (prisma.earning.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 3000 },
      });
      (prisma.goal.update as jest.Mock).mockResolvedValue({
        ...mockGoal,
        currentAmount: 3000,
        status: 'active',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await updateGoalProgress(req as any, res);

      expect(prisma.earning.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          date: { gte: mockGoal.createdAt },
        },
        _sum: { amount: true },
      });
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          currentAmount: 3000,
          status: 'active',
        },
      });
      verifySuccessResponse(res, 200);
    });

    it('should mark goal as completed when target reached', async () => {
      const mockGoal = {
        id: '1',
        userId: 'user-123',
        targetAmount: 5000,
        createdAt: new Date('2024-01-01'),
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(mockGoal);
      (prisma.earning.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 6000 },
      });
      (prisma.goal.update as jest.Mock).mockResolvedValue({
        ...mockGoal,
        currentAmount: 6000,
        status: 'completed',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await updateGoalProgress(req as any, res);

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          currentAmount: 6000,
          status: 'completed',
        },
      });
    });

    it('should handle zero earnings', async () => {
      const mockGoal = {
        id: '1',
        userId: 'user-123',
        targetAmount: 5000,
        createdAt: new Date('2024-01-01'),
      };

      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(mockGoal);
      (prisma.earning.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: null },
      });
      (prisma.goal.update as jest.Mock).mockResolvedValue({
        ...mockGoal,
        currentAmount: 0,
        status: 'active',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await updateGoalProgress(req as any, res);

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          currentAmount: 0,
          status: 'active',
        },
      });
    });

    it('should return 404 if goal not found', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
      });
      const res = createMockResponse();

      await updateGoalProgress(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.earning.aggregate).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.goal.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await updateGoalProgress(req as any, res);

      verifyErrorResponse(res, 500);
    });
  });
});
