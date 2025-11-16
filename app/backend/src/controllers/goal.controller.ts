import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  targetAmount: z.number().positive(),
  deadline: z.string().datetime().optional(),
  description: z.string().max(1000).optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().datetime().optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
});

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;

    const goals = await prisma.goal.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: [
        { status: 'asc' },
        { deadline: 'asc' },
      ],
    });

    res.json(goals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

export const getGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(goal);
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
};

export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createGoalSchema.parse(req.body);

    const goal = await prisma.goal.create({
      data: {
        userId,
        title: data.title,
        targetAmount: data.targetAmount,
        currentAmount: 0,
        deadline: data.deadline ? new Date(data.deadline) : null,
        description: data.description || null,
        status: 'active',
      },
    });

    res.status(201).json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid goal data', details: error.errors });
    }
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
};

export const updateGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateGoalSchema.parse(req.body);

    const existingGoal = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existingGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
    if (data.currentAmount !== undefined) updateData.currentAmount = data.currentAmount;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
    });

    res.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid goal data', details: error.errors });
    }
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const goal = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await prisma.goal.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};

export const updateGoalProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Recalculate goal progress from earnings
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Calculate total earnings since goal creation
    const totalEarnings = await prisma.earning.aggregate({
      where: {
        userId,
        date: {
          gte: goal.createdAt,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const currentAmount = totalEarnings._sum.amount || 0;
    const status = Number(currentAmount) >= Number(goal.targetAmount) ? 'completed' : 'active';

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        currentAmount,
        status,
      },
    });

    res.json(updatedGoal);
  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
};
