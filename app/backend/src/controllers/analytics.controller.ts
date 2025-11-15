import { Response } from 'express';
import { AuthRequest, AnalyticsSummary, PlatformBreakdown, DailyBreakdown } from '../types';
import prisma from '../lib/prisma';

export const getSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'month', start_date, end_date } = req.query;

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (start_date && end_date) {
      startDate = new Date(start_date as string);
      endDate = new Date(end_date as string);
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
      period: period as string,
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
    console.error('Get summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics',
    });
  }
};
