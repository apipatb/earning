import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';

const passiveIncomeSchema = z.object({
  name: z.string().max(100),
  category: z.string().max(50),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().max(100).optional(),
  frequency: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const getAllPassiveIncomes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, category, limit = '100', offset = '0' } = req.query;

    const where: any = { userId };

    if (start_date && end_date) {
      where.date = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string),
      };
    }

    if (category) {
      where.category = category;
    }

    const [passiveIncomes, total] = await Promise.all([
      prisma.passiveIncome.findMany({
        where,
        orderBy: { date: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.passiveIncome.count({ where }),
    ]);

    const formatted = passiveIncomes.map((pi) => ({
      id: pi.id,
      name: pi.name,
      category: pi.category,
      amount: Number(pi.amount),
      date: pi.date.toISOString().split('T')[0],
      source: pi.source,
      frequency: pi.frequency,
      notes: pi.notes,
    }));

    res.json({
      passive_incomes: formatted,
      total,
      has_more: total > parseInt(offset as string) + parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get passive incomes error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch passive incomes',
    });
  }
};

export const createPassiveIncome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = passiveIncomeSchema.parse(req.body);

    const passiveIncome = await prisma.passiveIncome.create({
      data: {
        userId,
        name: data.name,
        category: data.category,
        amount: data.amount,
        date: new Date(data.date),
        source: data.source,
        frequency: data.frequency || 'one_time',
        notes: data.notes,
      },
    });

    res.status(201).json({
      passive_income: {
        id: passiveIncome.id,
        name: passiveIncome.name,
        category: passiveIncome.category,
        amount: Number(passiveIncome.amount),
        date: passiveIncome.date.toISOString().split('T')[0],
        source: passiveIncome.source,
        frequency: passiveIncome.frequency,
        notes: passiveIncome.notes,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    console.error('Create passive income error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create passive income',
    });
  }
};

export const updatePassiveIncome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const incomeId = req.params.id;
    const data = passiveIncomeSchema.partial().parse(req.body);

    const passiveIncome = await prisma.passiveIncome.findFirst({
      where: { id: incomeId, userId },
    });

    if (!passiveIncome) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Passive income not found',
      });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.source !== undefined) updateData.source = data.source;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.passiveIncome.update({
      where: { id: incomeId },
      data: updateData,
    });

    res.json({
      passive_income: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        amount: Number(updated.amount),
        date: updated.date.toISOString().split('T')[0],
        source: updated.source,
        frequency: updated.frequency,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error('Update passive income error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update passive income',
    });
  }
};

export const deletePassiveIncome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const incomeId = req.params.id;

    const passiveIncome = await prisma.passiveIncome.findFirst({
      where: { id: incomeId, userId },
    });

    if (!passiveIncome) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Passive income not found',
      });
    }

    await prisma.passiveIncome.delete({
      where: { id: incomeId },
    });

    res.json({ message: 'Passive income deleted successfully' });
  } catch (error) {
    console.error('Delete passive income error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete passive income',
    });
  }
};
