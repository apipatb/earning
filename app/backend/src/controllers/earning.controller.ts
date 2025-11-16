import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { parseLimitParam, parseOffsetParam, parseDateParam } from '../utils/validation';

const earningSchema = z.object({
  platformId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  hours: z.number().positive().optional(),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export const getAllEarnings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, platform_id, limit, offset } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const where: any = { userId };

    if (start_date && end_date) {
      const startDate = parseDateParam(start_date as string);
      const endDate = parseDateParam(end_date as string);

      if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }
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
        take: parsedLimit,
        skip: parsedOffset,
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

    res.json({
      earnings: earningsWithRate,
      total,
      has_more: total > parsedOffset + parsedLimit,
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch earnings',
    });
  }
};

export const createEarning = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = earningSchema.parse(req.body);

    // Verify platform ownership
    const platform = await prisma.platform.findFirst({
      where: { id: data.platformId, userId },
    });

    if (!platform) {
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

    res.status(201).json({ earning });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    console.error('Create earning error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create earning',
    });
  }
};

export const updateEarning = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const earningId = req.params.id;
    const data = earningSchema.partial().parse(req.body);

    // Check ownership
    const earning = await prisma.earning.findFirst({
      where: { id: earningId, userId },
    });

    if (!earning) {
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

    res.json({ earning: updated });
  } catch (error) {
    console.error('Update earning error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update earning',
    });
  }
};

export const deleteEarning = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const earningId = req.params.id;

    // Check ownership
    const earning = await prisma.earning.findFirst({
      where: { id: earningId, userId },
    });

    if (!earning) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Earning not found',
      });
    }

    await prisma.earning.delete({
      where: { id: earningId },
    });

    res.json({ message: 'Earning deleted successfully' });
  } catch (error) {
    console.error('Delete earning error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete earning',
    });
  }
};
