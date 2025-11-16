import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logInfo, logDebug, logError, logWarn } from '../lib/logger';

const earningSchema = z.object({
  platformId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  hours: z.number().positive().optional(),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export const getAllEarnings = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    const { start_date, end_date, platform_id, limit = '100', offset = '0' } = req.query;

    logDebug('Fetching earnings', {
      requestId,
      userId,
      filters: { start_date, end_date, platform_id, limit, offset },
    });

    const where: any = { userId };

    if (start_date && end_date) {
      where.date = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string),
      };
    }

    if (platform_id) {
      where.platformId = platform_id;
    }

    const [earnings, total] = await Promise.all([
      prisma.earning.findMany({
        where,
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
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.earning.count({ where }),
    ]);

    const earningsWithRate = earnings.map((e) => ({
      id: e.id,
      platform: e.platform,
      date: e.date.toISOString().split('T')[0],
      hours: e.hours ? Number(e.hours) : null,
      amount: Number(e.amount),
      hourly_rate: e.hours ? Number(e.amount) / Number(e.hours) : null,
      notes: e.notes,
    }));

    logInfo('Earnings fetched successfully', {
      requestId,
      userId,
      count: earnings.length,
      total,
    });

    res.json({
      earnings: earningsWithRate,
      total,
      has_more: total > parseInt(offset as string) + parseInt(limit as string),
    });
  } catch (error) {
    logError('Failed to fetch earnings', error, {
      requestId,
      userId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch earnings',
    });
  }
};

export const createEarning = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    const data = earningSchema.parse(req.body);
    logDebug('Creating earning', {
      requestId,
      userId,
      platformId: data.platformId,
      amount: data.amount,
      date: data.date,
    });

    // Verify platform ownership
    const platform = await prisma.platform.findFirst({
      where: { id: data.platformId, userId },
    });

    if (!platform) {
      logWarn('Platform not found for earning creation', {
        requestId,
        userId,
        platformId: data.platformId,
      });
      return res.status(404).json({
        error: 'Not Found',
        message: 'Platform not found',
      });
    }

    const earning = await prisma.earning.create({
      data: {
        userId,
        platformId: data.platformId,
        date: new Date(data.date),
        hours: data.hours,
        amount: data.amount,
        notes: data.notes,
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

    logInfo('Earning created successfully', {
      requestId,
      userId,
      earningId: earning.id,
      amount: earning.amount,
      platformId: earning.platformId,
    });

    res.status(201).json({ earning });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logWarn('Validation error during earning creation', {
        requestId,
        userId,
        errors: error.errors,
      });
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logError('Failed to create earning', error, {
      requestId,
      userId,
      platformId: req.body?.platformId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create earning',
    });
  }
};

export const updateEarning = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const earningId = req.params.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    const data = earningSchema.partial().parse(req.body);
    logDebug('Updating earning', {
      requestId,
      userId,
      earningId,
      updates: data,
    });

    // Check ownership
    const earning = await prisma.earning.findFirst({
      where: { id: earningId, userId },
    });

    if (!earning) {
      logWarn('Earning not found for update', {
        requestId,
        userId,
        earningId,
      });
      return res.status(404).json({
        error: 'Not Found',
        message: 'Earning not found',
      });
    }

    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.earning.update({
      where: { id: earningId },
      data: updateData,
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

    logInfo('Earning updated successfully', {
      requestId,
      userId,
      earningId,
      updatedFields: Object.keys(updateData),
    });

    res.json({ earning: updated });
  } catch (error) {
    logError('Failed to update earning', error, {
      requestId,
      userId,
      earningId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update earning',
    });
  }
};

export const deleteEarning = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const earningId = req.params.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    logDebug('Deleting earning', {
      requestId,
      userId,
      earningId,
    });

    // Check ownership
    const earning = await prisma.earning.findFirst({
      where: { id: earningId, userId },
    });

    if (!earning) {
      logWarn('Earning not found for deletion', {
        requestId,
        userId,
        earningId,
      });
      return res.status(404).json({
        error: 'Not Found',
        message: 'Earning not found',
      });
    }

    await prisma.earning.delete({
      where: { id: earningId },
    });

    logInfo('Earning deleted successfully', {
      requestId,
      userId,
      earningId,
      deletedAmount: earning.amount,
    });

    res.json({ message: 'Earning deleted successfully' });
  } catch (error) {
    logError('Failed to delete earning', error, {
      requestId,
      userId,
      earningId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete earning',
    });
  }
};
