import { Response } from 'express';
import { AuthRequest, AnalyticsSummary, PlatformBreakdown, DailyBreakdown } from '../types';
import prisma from '../lib/prisma';
import { logInfo, logDebug, logError, logWarn } from '../lib/logger';
import { AnalyticsPeriodSchema } from '../schemas/validation.schemas';
import { validateRequest, ValidationException } from '../utils/validate-request.util';

export const getSummary = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    // Validate query parameters
    const params = await validateRequest(req.query, AnalyticsPeriodSchema);
    const { period = 'month', start_date, end_date } = params;

    logDebug('Fetching analytics summary', {
      requestId,
      userId,
      period,
      customDateRange: start_date && end_date ? true : false,
    });

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      const now = new Date();
      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0); // All time
      }
    }

    // Get all earnings in date range
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
    });

    // Calculate totals
    const totalEarnings = earnings.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const totalHours = earnings.reduce((sum: number, e: any) => sum + Number(e.hours || 0), 0);
    const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

    // Group by platform
    const platformMap = new Map<string, PlatformBreakdown>();
    earnings.forEach((e: any) => {
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
    earnings.forEach((e: any) => {
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
      period: period as string,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_earnings: totalEarnings,
      total_hours: totalHours,
      avg_hourly_rate: avgHourlyRate,
      by_platform: byPlatform,
      daily_breakdown: dailyBreakdown,
    };

    logInfo('Analytics summary generated successfully', {
      requestId,
      userId,
      period,
      totalEarnings,
      totalHours,
      platformCount: byPlatform.length,
      dateRangeStart: startDate.toISOString().split('T')[0],
      dateRangeEnd: endDate.toISOString().split('T')[0],
    });

    res.json(summary);
  } catch (error) {
    if (error instanceof ValidationException) {
      logWarn('Validation error fetching analytics', {
        requestId,
        userId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Invalid analytics parameters',
        errors: error.errors,
      });
    }
    logError('Failed to fetch analytics summary', error, {
      requestId,
      userId,
      period: req.query.period,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics',
    });
  }
};
