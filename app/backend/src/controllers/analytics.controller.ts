import { Response } from 'express';
import { AuthRequest, AnalyticsSummary, PlatformBreakdown, DailyBreakdown } from '../types';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { validatePeriodParam } from '../utils/validation';
import { calculateDateRange } from '../utils/dateRange';

export const getSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period: periodParam, start_date, end_date } = req.query;

    // Validate period parameter
    let validatedPeriod: 'today' | 'week' | 'month' | 'year';
    try {
      validatedPeriod = validatePeriodParam(periodParam as string | undefined);
    } catch (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error instanceof Error ? error.message : 'Invalid period parameter',
      });
    }

    // Calculate date range using centralized utility
    const { startDate, endDate } = calculateDateRange(
      validatedPeriod,
      start_date as string | undefined,
      end_date as string | undefined
    );

    // Get earnings in date range (limit to most recent 1000 for performance)
    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
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
      orderBy: { date: 'desc' },
      take: 1000,
    });

    // Calculate totals
    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalHours = earnings.reduce((sum, e) => sum + Number(e.hours || 0), 0);
    const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

    // Group by platform
    const platformMap = new Map<string, PlatformBreakdown>();
    earnings.forEach((e) => {
      const platformId = e.platform.id;
      if (!platformMap.has(platformId)) {
        platformMap.set(platformId, {
          platform: e.platform,
          earnings: 0,
          hours: 0,
          hourly_rate: 0,
          percentage: 0,
        });
      }
      const platform = platformMap.get(platformId)!;
      platform.earnings += Number(e.amount);
      platform.hours += Number(e.hours || 0);
    });

    // Calculate hourly rates and percentages
    const byPlatform = Array.from(platformMap.values()).map((p) => ({
      ...p,
      hourly_rate: p.hours > 0 ? p.earnings / p.hours : 0,
      percentage: totalEarnings > 0 ? (p.earnings / totalEarnings) * 100 : 0,
    }));

    // Group by date
    const dailyMap = new Map<string, DailyBreakdown>();
    earnings.forEach((e) => {
      const dateStr = e.date.toISOString().split('T')[0];
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          date: dateStr,
          earnings: 0,
          hours: 0,
        });
      }
      const daily = dailyMap.get(dateStr)!;
      daily.earnings += Number(e.amount);
      daily.hours += Number(e.hours || 0);
    });

    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const summary: AnalyticsSummary = {
      period: validatedPeriod,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_earnings: totalEarnings,
      total_hours: totalHours,
      avg_hourly_rate: avgHourlyRate,
      by_platform: byPlatform,
      daily_breakdown: dailyBreakdown,
    };

    res.json(summary);
  } catch (error) {
    logger.error('Get summary error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics',
    });
  }
};
