import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { parseLimitParam, parseOffsetParam, parseDateParam, parseEnumParam } from '../utils/validation';
import { logger } from '../utils/logger';

const expenseSchema = z.object({
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  amount: z.number().positive('Amount must be positive'),
  expenseDate: z.string().datetime().or(z.string().date()).transform((val) => new Date(val)),
  vendor: z.string().max(255).optional(),
  isTaxDeductible: z.boolean().default(false),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const getAllExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, category, isTaxDeductible, limit, offset } = req.query;

    const where: any = { userId };

    if (startDate && endDate) {
      const start = parseDateParam(startDate as string);
      const end = parseDateParam(endDate as string);
      if (start && end) {
        where.expenseDate = {
          gte: start,
          lte: end,
        };
      }
    }

    if (category) {
      where.category = category;
    }

    if (isTaxDeductible !== undefined) {
      where.isTaxDeductible = isTaxDeductible === 'true';
    }

    const parsedLimit = parseLimitParam(limit as string | undefined, 50);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      take: parsedLimit,
      skip: parsedOffset,
    });

    const total = await prisma.expense.count({ where });

    const formatted = expenses.map((e) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      expenseDate: e.expenseDate,
      vendor: e.vendor,
      isTaxDeductible: e.isTaxDeductible,
      receiptUrl: e.receiptUrl,
      notes: e.notes,
      createdAt: e.createdAt,
    }));

    res.json({ expenses: formatted, total, limit: parsedLimit, offset: parsedOffset });
  } catch (error) {
    logger.error('Get expenses error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch expenses',
    });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = expenseSchema.parse(req.body);

    const expense = await prisma.expense.create({
      data: {
        userId,
        ...data,
      },
    });

    res.status(201).json({
      expense: {
        ...expense,
        amount: Number(expense.amount),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create expense error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create expense',
    });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const expenseId = req.params.id;
    const data = expenseSchema.partial().parse(req.body);

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found',
      });
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data,
    });

    res.json({
      expense: {
        ...updated,
        amount: Number(updated.amount),
      },
    });
  } catch (error) {
    logger.error('Update expense error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update expense',
    });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const expenseId = req.params.id;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found',
      });
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    logger.error('Delete expense error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete expense',
    });
  }
};

export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'month', startDate: startDateParam, endDate: endDateParam, limit: limitParam, offset: offsetParam } = req.query;

    let startDate: Date;
    let endDate: Date = new Date();

    // Use custom date range if provided, otherwise use period
    if (startDateParam && endDateParam) {
      const parsedStart = parseDateParam(startDateParam as string);
      const parsedEnd = parseDateParam(endDateParam as string);

      if (!parsedStart || !parsedEnd) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD).',
        });
      }

      startDate = parsedStart;
      endDate = parsedEnd;
    } else {
      // Use proper date calculations based on period
      switch (period) {
        case 'week':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(endDate);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          // Month: First day of current month
          startDate = new Date(endDate);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
      }
    }

    // Parse pagination parameters
    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    const where = {
      userId,
      expenseDate: { gte: startDate, lte: endDate },
    };

    // Use database-level aggregation and grouping for summary stats
    const [totalStats, taxDeductibleStats, groupedByCategory, total, expenses] = await Promise.all([
      prisma.expense.aggregate({
        where,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...where, isTaxDeductible: true },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
      }),
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          category: true,
          description: true,
          amount: true,
          expenseDate: true,
          vendor: true,
          isTaxDeductible: true,
        },
      }),
    ]);

    const totalExpenses = Number(totalStats._sum.amount || 0);
    const taxDeductible = Number(taxDeductibleStats._sum.amount || 0);

    const byCategory = groupedByCategory.map((group) => ({
      category: group.category,
      amount: Number(group._sum.amount || 0),
    }));

    const hasMore = offset + limit < total;

    res.json({
      period,
      summary: {
        total_expenses: totalExpenses,
        tax_deductible: taxDeductible,
        non_deductible: totalExpenses - taxDeductible,
        expense_count: totalStats._count,
      },
      by_category: byCategory,
      data: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        expenseDate: e.expenseDate,
        vendor: e.vendor,
        isTaxDeductible: e.isTaxDeductible,
      })),
      start_date: startDate,
      end_date: endDate,
      total,
      limit,
      offset,
      hasMore,
    });
  } catch (error) {
    logger.error('Get expense summary error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch expense summary',
    });
  }
};

export const getProfitMargin = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'month' } = req.query;

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Use database-level aggregation instead of loading all records
    const [salesStats, expensesStats] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          userId,
          saleDate: { gte: startDate, lte: endDate },
          status: 'completed',
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: startDate, lte: endDate },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(salesStats._sum.totalAmount || 0);
    const totalExpenses = Number(expensesStats._sum.amount || 0);
    const profit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    res.json({
      period,
      financials: {
        revenue,
        expenses: totalExpenses,
        profit,
        profit_margin_percent: profitMargin.toFixed(2),
        sales_count: salesStats._count,
        expense_count: expensesStats._count,
      },
      start_date: startDate,
      end_date: endDate,
    });
  } catch (error) {
    logger.error('Get profit margin error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch profit margin',
    });
  }
};
