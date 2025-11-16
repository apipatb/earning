import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

const platformSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['freelance', 'delivery', 'services', 'other']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  expectedRate: z.number().positive().optional(),
});

export const getAllPlatforms = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const platforms = await prisma.platform.findMany({
      where: { userId },
      include: {
        earnings: {
          select: {
            amount: true,
            hours: true,
          },
        },
      },
    });

    // Calculate stats for each platform
    const platformsWithStats = platforms.map((platform) => {
      const totalEarnings = platform.earnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalHours = platform.earnings.reduce((sum, e) => sum + Number(e.hours || 0), 0);
      const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

      return {
        id: platform.id,
        name: platform.name,
        category: platform.category,
        color: platform.color,
        expectedRate: platform.expectedRate ? Number(platform.expectedRate) : null,
        isActive: platform.isActive,
        stats: {
          total_earnings: totalEarnings,
          total_hours: totalHours,
          avg_hourly_rate: avgHourlyRate,
        },
      };
    });

    res.json({ platforms: platformsWithStats });
  } catch (error) {
    logger.error('Get platforms error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch platforms',
    });
  }
};

export const createPlatform = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = platformSchema.parse(req.body);

    const platform = await prisma.platform.create({
      data: {
        userId,
        name: data.name,
        category: data.category,
        color: data.color,
        expectedRate: data.expectedRate,
      },
    });

    res.status(201).json({ platform });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create platform error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create platform',
    });
  }
};

export const updatePlatform = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const platformId = req.params.id;
    const data = platformSchema.partial().parse(req.body);

    // Check ownership
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Platform not found',
      });
    }

    const updated = await prisma.platform.update({
      where: { id: platformId },
      data,
    });

    res.json({ platform: updated });
  } catch (error) {
    logger.error('Update platform error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update platform',
    });
  }
};

export const deletePlatform = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const platformId = req.params.id;

    // Check ownership
    const platform = await prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!platform) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Platform not found',
      });
    }

    await prisma.platform.delete({
      where: { id: platformId },
    });

    res.json({ message: 'Platform deleted successfully' });
  } catch (error) {
    logger.error('Delete platform error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete platform',
    });
  }
};
