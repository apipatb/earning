/**
 * Tests for Expense Controller
 */

import {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getProfitMargin,
} from '../expense.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockExpense,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Expense Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllExpenses', () => {
    it('should return all expenses for a user', async () => {
      const mockExpenses = [
        {
          id: '1',
          userId: 'user-123',
          category: 'Supplies',
          description: 'Office supplies',
          amount: 50,
          expenseDate: new Date('2024-01-15'),
          vendor: 'Office Depot',
          isTaxDeductible: true,
          receiptUrl: 'https://example.com/receipt1.pdf',
          notes: 'Monthly supplies',
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: 'user-123',
          category: 'Software',
          description: 'Adobe subscription',
          amount: 52.99,
          expenseDate: new Date('2024-01-10'),
          vendor: 'Adobe',
          isTaxDeductible: true,
          receiptUrl: null,
          notes: null,
          createdAt: new Date(),
        },
      ];

      (prisma.expense.findMany as jest.Mock).mockResolvedValue(mockExpenses);
      (prisma.expense.count as jest.Mock).mockResolvedValue(2);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllExpenses(req as any, res);

      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { expenseDate: 'desc' },
        take: 50,
        skip: 0,
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.expenses).toHaveLength(2);
      expect(response.total).toBe(2);
    });

    it('should filter expenses by date range', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });
      const res = createMockResponse();

      await getAllExpenses(req as any, res);

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            expenseDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should filter expenses by category', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { category: 'Supplies' },
      });
      const res = createMockResponse();

      await getAllExpenses(req as any, res);

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            category: 'Supplies',
          }),
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should filter expenses by tax deductible status', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { isTaxDeductible: 'true' },
      });
      const res = createMockResponse();

      await getAllExpenses(req as any, res);

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            isTaxDeductible: true,
          }),
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should support pagination with limit and offset', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(100);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { limit: '25', offset: '25' },
      });
      const res = createMockResponse();

      await getAllExpenses(req as any, res);

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 25,
        })
      );
      verifySuccessResponse(res, 200);
    });

    it('should handle server errors gracefully', async () => {
      (prisma.expense.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllExpenses(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to fetch expenses');
    });
  });

  describe('createExpense', () => {
    it('should create expense successfully', async () => {
      const mockExpense = {
        id: 'expense-1',
        userId: 'user-123',
        category: 'Supplies',
        description: 'Office supplies',
        amount: 50,
        expenseDate: new Date('2024-01-15'),
        vendor: 'Office Depot',
        isTaxDeductible: true,
        receiptUrl: 'https://example.com/receipt.pdf',
        notes: 'Monthly supplies',
        createdAt: new Date(),
      };

      (prisma.expense.create as jest.Mock).mockResolvedValue(mockExpense);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          category: 'Supplies',
          description: 'Office supplies',
          amount: 50,
          expenseDate: '2024-01-15',
          vendor: 'Office Depot',
          isTaxDeductible: true,
          receiptUrl: 'https://example.com/receipt.pdf',
          notes: 'Monthly supplies',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          category: 'Supplies',
          description: 'Office supplies',
          amount: 50,
        }),
      });
      verifySuccessResponse(res, 201);
    });

    it('should create expense with minimal required fields', async () => {
      const mockExpense = {
        id: 'expense-1',
        userId: 'user-123',
        category: 'Supplies',
        description: 'Office supplies',
        amount: 50,
        expenseDate: new Date('2024-01-15'),
        vendor: null,
        isTaxDeductible: false,
        receiptUrl: null,
        notes: null,
        createdAt: new Date(),
      };

      (prisma.expense.create as jest.Mock).mockResolvedValue(mockExpense);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          category: 'Supplies',
          description: 'Office supplies',
          amount: 50,
          expenseDate: '2024-01-15',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      verifySuccessResponse(res, 201);
    });

    it('should reject if category is missing', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          description: 'Office supplies',
          amount: 50,
          expenseDate: '2024-01-15',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should reject if description is missing', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          category: 'Supplies',
          amount: 50,
          expenseDate: '2024-01-15',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should reject negative amount', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          category: 'Supplies',
          description: 'Office supplies',
          amount: -50,
          expenseDate: '2024-01-15',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should reject zero amount', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          category: 'Supplies',
          description: 'Office supplies',
          amount: 0,
          expenseDate: '2024-01-15',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      verifyErrorResponse(res, 400);
    });

    it('should reject invalid receipt URL', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          category: 'Supplies',
          description: 'Office supplies',
          amount: 50,
          expenseDate: '2024-01-15',
          receiptUrl: 'not-a-url',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      verifyErrorResponse(res, 400);
    });

    it('should handle server errors gracefully', async () => {
      (prisma.expense.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          category: 'Supplies',
          description: 'Office supplies',
          amount: 50,
          expenseDate: '2024-01-15',
        },
      });
      const res = createMockResponse();

      await createExpense(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to create expense');
    });
  });

  describe('updateExpense', () => {
    it('should update expense successfully', async () => {
      const mockExpense = createMockExpense({ id: 'expense-1', userId: 'user-123' });
      const updatedExpense = {
        ...mockExpense,
        amount: 75,
        description: 'Updated description',
      };

      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue(updatedExpense);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'expense-1' },
        body: { amount: 75, description: 'Updated description' },
      });
      const res = createMockResponse();

      await updateExpense(req as any, res);

      expect(prisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 'expense-1', userId: 'user-123' },
      });
      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
        data: expect.objectContaining({
          amount: 75,
          description: 'Updated description',
        }),
      });
      verifySuccessResponse(res, 200);
    });

    it('should reject if expense not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
        body: { amount: 75 },
      });
      const res = createMockResponse();

      await updateExpense(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.message).toBe('Expense not found');
      expect(prisma.expense.update).not.toHaveBeenCalled();
    });

    it('should reject if expense belongs to different user', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-user-expense' },
        body: { amount: 75 },
      });
      const res = createMockResponse();

      await updateExpense(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.expense.update).not.toHaveBeenCalled();
    });

    it('should update only specified fields', async () => {
      const mockExpense = createMockExpense({ id: 'expense-1', userId: 'user-123' });
      const updatedExpense = { ...mockExpense, isTaxDeductible: true };

      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue(updatedExpense);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'expense-1' },
        body: { isTaxDeductible: true },
      });
      const res = createMockResponse();

      await updateExpense(req as any, res);

      verifySuccessResponse(res, 200);
    });

    it('should handle server errors gracefully', async () => {
      const mockExpense = createMockExpense({ id: 'expense-1', userId: 'user-123' });
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'expense-1' },
        body: { amount: 75 },
      });
      const res = createMockResponse();

      await updateExpense(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to update expense');
    });
  });

  describe('deleteExpense', () => {
    it('should delete expense successfully', async () => {
      const mockExpense = createMockExpense({ id: 'expense-1', userId: 'user-123' });
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.delete as jest.Mock).mockResolvedValue(mockExpense);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'expense-1' },
      });
      const res = createMockResponse();

      await deleteExpense(req as any, res);

      expect(prisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 'expense-1', userId: 'user-123' },
      });
      expect(prisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.message).toBe('Expense deleted successfully');
    });

    it('should reject if expense not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
      });
      const res = createMockResponse();

      await deleteExpense(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.message).toBe('Expense not found');
      expect(prisma.expense.delete).not.toHaveBeenCalled();
    });

    it('should reject if expense belongs to different user', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-user-expense' },
      });
      const res = createMockResponse();

      await deleteExpense(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.expense.delete).not.toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      const mockExpense = createMockExpense({ id: 'expense-1', userId: 'user-123' });
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'expense-1' },
      });
      const res = createMockResponse();

      await deleteExpense(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to delete expense');
    });
  });

  describe('getExpenseSummary', () => {
    it('should return expense summary for default period (month)', async () => {
      const mockExpenses = [
        createMockExpense({ amount: 50, isTaxDeductible: true, category: 'Supplies' }),
        createMockExpense({ amount: 100, isTaxDeductible: false, category: 'Software' }),
        createMockExpense({ amount: 75, isTaxDeductible: true, category: 'Supplies' }),
      ];

      (prisma.expense.findMany as jest.Mock).mockResolvedValue(mockExpenses);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getExpenseSummary(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.summary.total_expenses).toBe(225);
      expect(response.summary.tax_deductible).toBe(125);
      expect(response.summary.non_deductible).toBe(100);
      expect(response.summary.expense_count).toBe(3);
      expect(response.by_category).toHaveLength(2);
    });

    it('should return expense summary for week period', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'week' },
      });
      const res = createMockResponse();

      await getExpenseSummary(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.period).toBe('week');
    });

    it('should return expense summary for year period', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'year' },
      });
      const res = createMockResponse();

      await getExpenseSummary(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.period).toBe('year');
    });

    it('should group expenses by category correctly', async () => {
      const mockExpenses = [
        createMockExpense({ amount: 50, category: 'Supplies' }),
        createMockExpense({ amount: 100, category: 'Software' }),
        createMockExpense({ amount: 75, category: 'Supplies' }),
      ];

      (prisma.expense.findMany as jest.Mock).mockResolvedValue(mockExpenses);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getExpenseSummary(req as any, res);

      const response = getResponseData(res);
      expect(response.by_category).toEqual(
        expect.arrayContaining([
          { category: 'Supplies', amount: 125 },
          { category: 'Software', amount: 100 },
        ])
      );
    });

    it('should handle server errors gracefully', async () => {
      (prisma.expense.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getExpenseSummary(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to fetch expense summary');
    });
  });

  describe('getProfitMargin', () => {
    it('should calculate profit margin correctly', async () => {
      const mockSales = [
        { totalAmount: 1000, status: 'completed' },
        { totalAmount: 500, status: 'completed' },
      ];
      const mockExpenses = [
        createMockExpense({ amount: 300 }),
        createMockExpense({ amount: 200 }),
      ];

      (prisma.sale.findMany as jest.Mock).mockResolvedValue(mockSales);
      (prisma.expense.findMany as jest.Mock).mockResolvedValue(mockExpenses);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getProfitMargin(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.financials.revenue).toBe(1500);
      expect(response.financials.expenses).toBe(500);
      expect(response.financials.profit).toBe(1000);
      expect(parseFloat(response.financials.profit_margin_percent)).toBeCloseTo(66.67, 1);
    });

    it('should handle zero revenue gracefully', async () => {
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([
        createMockExpense({ amount: 100 }),
      ]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getProfitMargin(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.financials.revenue).toBe(0);
      expect(response.financials.profit_margin_percent).toBe('0.00');
    });

    it('should only include completed sales', async () => {
      const mockSales = [
        { totalAmount: 1000, status: 'completed' },
        { totalAmount: 500, status: 'pending' },
      ];

      (prisma.sale.findMany as jest.Mock).mockResolvedValue(mockSales);
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getProfitMargin(req as any, res);

      expect(prisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'completed',
          }),
        })
      );
    });

    it('should handle different time periods', async () => {
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { period: 'year' },
      });
      const res = createMockResponse();

      await getProfitMargin(req as any, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.period).toBe('year');
    });

    it('should handle server errors gracefully', async () => {
      (prisma.sale.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getProfitMargin(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to fetch profit margin');
    });
  });
});
