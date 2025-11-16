import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, ControllerHandler } from '../types';
import prisma from '../lib/prisma';

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

export const getAllExpenses: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, category, isTaxDeductible, limit = '50', offset = '0' } = req.query;

    interface ExpenseWhere {
      userId: string;
      expenseDate?: {
        gte: Date;
        lte: Date;
      };
      category?: string;
      isTaxDeductible?: boolean;
    }
    const where: ExpenseWhere = { userId };

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      where.expenseDate = {
        gte: start,
        lte: end,
      };
    }

    if (category) {
      where.category = category;
    }

    if (isTaxDeductible !== undefined) {
      where.isTaxDeductible = isTaxDeductible === 'true';
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.expense.count({ where });

    const formatted = expenses.map((e: typeof expenses[0]) => ({
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

    res.json({ expenses: formatted, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch expenses',
    });
  }
};

export const createExpense: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Create expense error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create expense',
    });
  }
};

export const updateExpense: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Update expense error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update expense',
    });
  }
};

export const deleteExpense: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error('Delete expense error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete expense',
    });
  }
};

export const getExpenseSummary: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { period = 'month' } = req.query as { period?: string };

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

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        expenseDate: { gte: startDate, lte: endDate },
      },
    });

    const totalExpenses = expenses.reduce((sum: number, e: typeof expenses[0]) => sum + Number(e.amount), 0);
    const taxDeductible = expenses
      .filter((e: typeof expenses[0]) => e.isTaxDeductible)
      .reduce((sum: number, e: typeof expenses[0]) => sum + Number(e.amount), 0);

    // Group by category
    const byCategory = new Map<string, number>();
    expenses.forEach((e: typeof expenses[0]) => {
      const current = byCategory.get(e.category) || 0;
      byCategory.set(e.category, current + Number(e.amount));
    });

    res.json({
      period,
      summary: {
        total_expenses: totalExpenses,
        tax_deductible: taxDeductible,
        non_deductible: totalExpenses - taxDeductible,
        expense_count: expenses.length,
      },
      by_category: Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount })),
      start_date: startDate,
      end_date: endDate,
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch expense summary',
    });
  }
};

export const getProfitMargin: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { period = 'month' } = req.query as { period?: string };

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

    const [sales, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          userId,
          saleDate: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          expenseDate: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const revenue = sales.reduce((sum: number, s: typeof sales[0]) => sum + Number(s.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum: number, e: typeof expenses[0]) => sum + Number(e.amount), 0);
    const profit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    res.json({
      period,
      financials: {
        revenue,
        expenses: totalExpenses,
        profit,
        profit_margin_percent: profitMargin.toFixed(2),
        sales_count: sales.length,
        expense_count: expenses.length,
      },
      start_date: startDate,
      end_date: endDate,
    });
  } catch (error) {
    console.error('Get profit margin error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch profit margin',
    });
  }
};
