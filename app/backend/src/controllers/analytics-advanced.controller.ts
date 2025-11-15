import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Custom Dashboard
export const createDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { name, description, widgets, isDefault } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Dashboard name is required' });
    }

    const dashboard = await prisma.customDashboard.create({
      data: {
        userId,
        name,
        description,
        widgets: widgets || [],
        isDefault: isDefault || false,
      },
    });

    res.status(201).json(dashboard);
  } catch (error) {
    next(error);
  }
};

export const getDashboards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const dashboards = await prisma.customDashboard.findMany({
      where: { userId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });

    res.json(dashboards);
  } catch (error) {
    next(error);
  }
};

export const updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { dashboardId } = req.params;
    const { name, description, widgets, isDefault } = req.body;

    // Verify ownership
    const dashboard = await prisma.customDashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard || dashboard.userId !== userId) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const updated = await prisma.customDashboard.update({
      where: { id: dashboardId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(widgets && { widgets }),
        ...(typeof isDefault === 'boolean' && { isDefault }),
        updatedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { dashboardId } = req.params;

    const dashboard = await prisma.customDashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard || dashboard.userId !== userId) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    await prisma.customDashboard.update({
      where: { id: dashboardId },
      data: { isActive: false },
    });

    res.json({ message: 'Dashboard deleted' });
  } catch (error) {
    next(error);
  }
};

// Advanced Filtering & Segmentation
export const getFilteredEarnings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const {
      startDate,
      endDate,
      platformIds,
      minAmount,
      maxAmount,
      sortBy = 'date',
      order = 'desc',
      limit = 100,
      offset = 0,
    } = req.query;

    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    if (platformIds) {
      where.platformId = { in: (platformIds as string).split(',') };
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount as string);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount as string);
    }

    const earnings = await prisma.earning.findMany({
      where,
      include: { platform: true },
      orderBy: { [sortBy as string]: order as 'asc' | 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.earning.count({ where });

    res.json({
      earnings,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    next(error);
  }
};

// Trend Analysis
export const getTrendAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { period = 'month', months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Group by period
    const grouped: { [key: string]: any } = {};

    earnings.forEach((earning) => {
      let key: string;

      if (period === 'day') {
        key = earning.date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const date = new Date(earning.date);
        const week = Math.ceil((date.getDate() - date.getDay()) / 7);
        key = `${date.getFullYear()}-W${week}`;
      } else {
        // month
        key = earning.date.toISOString().substring(0, 7);
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          totalEarnings: 0,
          count: 0,
          averageEarning: 0,
          maxEarning: 0,
          minEarning: Infinity,
          platformBreakdown: {},
        };
      }

      grouped[key].totalEarnings += Number(earning.amount);
      grouped[key].count += 1;
      grouped[key].maxEarning = Math.max(grouped[key].maxEarning, Number(earning.amount));
      grouped[key].minEarning = Math.min(grouped[key].minEarning, Number(earning.amount));

      const platformId = earning.platformId;
      if (!grouped[key].platformBreakdown[platformId]) {
        grouped[key].platformBreakdown[platformId] = 0;
      }
      grouped[key].platformBreakdown[platformId] += Number(earning.amount);
    });

    const trends = Object.values(grouped).map((item: any) => ({
      ...item,
      averageEarning: item.count > 0 ? item.totalEarnings / item.count : 0,
      minEarning: item.minEarning === Infinity ? 0 : item.minEarning,
      growth: 0, // Will calculate after sorting
    }));

    // Calculate growth rates
    for (let i = 1; i < trends.length; i++) {
      const prev = trends[i - 1] as any;
      const curr = trends[i] as any;
      if (prev.totalEarnings > 0) {
        curr.growth = ((curr.totalEarnings - prev.totalEarnings) / prev.totalEarnings) * 100;
      }
    }

    res.json(trends);
  } catch (error) {
    next(error);
  }
};

// Comparative Analysis
export const getComparativeAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { period1Start, period1End, period2Start, period2End } = req.query;

    if (!period1Start || !period1End || !period2Start || !period2End) {
      return res.status(400).json({ error: 'All date periods are required' });
    }

    const period1 = await prisma.earning.findMany({
      where: {
        userId,
        date: {
          gte: new Date(period1Start as string),
          lte: new Date(period1End as string),
        },
      },
    });

    const period2 = await prisma.earning.findMany({
      where: {
        userId,
        date: {
          gte: new Date(period2Start as string),
          lte: new Date(period2End as string),
        },
      },
    });

    const p1Total = period1.reduce((sum, e) => sum + Number(e.amount), 0);
    const p1Avg = p1Total / Math.max(period1.length, 1);

    const p2Total = period2.reduce((sum, e) => sum + Number(e.amount), 0);
    const p2Avg = p2Total / Math.max(period2.length, 1);

    const comparison = {
      period1: {
        total: p1Total,
        count: period1.length,
        average: p1Avg,
        max: Math.max(...period1.map((e) => Number(e.amount))),
        min: Math.min(...period1.map((e) => Number(e.amount))),
      },
      period2: {
        total: p2Total,
        count: period2.length,
        average: p2Avg,
        max: Math.max(...period2.map((e) => Number(e.amount))),
        min: Math.min(...period2.map((e) => Number(e.amount))),
      },
      comparison: {
        totalGrowth: ((p2Total - p1Total) / Math.max(p1Total, 1)) * 100,
        avgGrowth: ((p2Avg - p1Avg) / Math.max(p1Avg, 1)) * 100,
        countGrowth: ((period2.length - period1.length) / Math.max(period1.length, 1)) * 100,
      },
    };

    res.json(comparison);
  } catch (error) {
    next(error);
  }
};

// Platform Performance Analysis
export const getPlatformAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      include: { platform: true },
    });

    const platformStats: { [key: string]: any } = {};

    earnings.forEach((earning) => {
      const platformId = earning.platformId;

      if (!platformStats[platformId]) {
        platformStats[platformId] = {
          platformId,
          platformName: earning.platform.name,
          totalEarnings: 0,
          count: 0,
          averageEarning: 0,
          maxEarning: 0,
          minEarning: Infinity,
          percentageOfTotal: 0,
          trend: [],
        };
      }

      platformStats[platformId].totalEarnings += Number(earning.amount);
      platformStats[platformId].count += 1;
      platformStats[platformId].maxEarning = Math.max(
        platformStats[platformId].maxEarning,
        Number(earning.amount)
      );
      platformStats[platformId].minEarning = Math.min(
        platformStats[platformId].minEarning,
        Number(earning.amount)
      );
    });

    const totalEarnings = Object.values(platformStats).reduce(
      (sum: number, p: any) => sum + p.totalEarnings,
      0
    );

    const analysis = Object.values(platformStats).map((stat: any) => ({
      ...stat,
      averageEarning: stat.count > 0 ? stat.totalEarnings / stat.count : 0,
      minEarning: stat.minEarning === Infinity ? 0 : stat.minEarning,
      percentageOfTotal: totalEarnings > 0 ? (stat.totalEarnings / totalEarnings) * 100 : 0,
    }));

    res.json(analysis.sort((a: any, b: any) => b.totalEarnings - a.totalEarnings));
  } catch (error) {
    next(error);
  }
};

// Goal Progress Analysis
export const getGoalAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const goals = await prisma.goal.findMany({
      where: { userId, isActive: true },
    });

    const goalAnalysis = await Promise.all(
      goals.map(async (goal) => {
        let earnings;

        if (goal.type === 'daily') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          earnings = await prisma.earning.findMany({
            where: {
              userId,
              date: {
                gte: today,
                lte: new Date(today.getTime() + 24 * 60 * 60 * 1000),
              },
            },
          });
        } else if (goal.type === 'weekly') {
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          earnings = await prisma.earning.findMany({
            where: {
              userId,
              date: { gte: startOfWeek },
            },
          });
        } else {
          // monthly
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          earnings = await prisma.earning.findMany({
            where: {
              userId,
              date: { gte: startOfMonth },
            },
          });
        }

        const currentTotal = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
        const targetAmount = Number(goal.targetAmount);
        const progress = (currentTotal / targetAmount) * 100;

        return {
          goalId: goal.id,
          type: goal.type,
          targetAmount,
          currentTotal,
          progress: Math.min(progress, 100),
          isOnTrack: progress >= (100 / (goal.type === 'daily' ? 1 : goal.type === 'weekly' ? 7 : 30)) * new Date().getDate(),
          remaining: Math.max(0, targetAmount - currentTotal),
          earnedPercentage: progress,
        };
      })
    );

    res.json(goalAnalysis);
  } catch (error) {
    next(error);
  }
};

// Revenue Segmentation
export const getRevenueSegmentation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { months = 12, segment = 'platform' } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      include: { platform: true },
    });

    const segments: { [key: string]: any } = {};
    let totalRevenue = 0;

    earnings.forEach((earning) => {
      let key: string;

      if (segment === 'platform') {
        key = earning.platform.name;
      } else if (segment === 'category') {
        key = earning.platform.category || 'uncategorized';
      } else {
        // daily
        key = earning.date.toISOString().split('T')[0];
      }

      if (!segments[key]) {
        segments[key] = {
          segment: key,
          revenue: 0,
          count: 0,
          percentage: 0,
        };
      }

      segments[key].revenue += Number(earning.amount);
      segments[key].count += 1;
      totalRevenue += Number(earning.amount);
    });

    const result = Object.values(segments)
      .map((seg: any) => ({
        ...seg,
        percentage: totalRevenue > 0 ? (seg.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    res.json({
      totalRevenue,
      segmentation: result,
      segmentCount: result.length,
    });
  } catch (error) {
    next(error);
  }
};

// Advanced Insights
export const getAdvancedInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    // Get 3 months of data
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      include: { platform: true },
      orderBy: { date: 'asc' },
    });

    if (earnings.length === 0) {
      return res.json({
        insights: [],
        recommendations: [],
      });
    }

    const insights = [];
    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const avgDaily = totalEarnings / Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Insight 1: Best performing platform
    const platformEarnings: { [key: string]: number } = {};
    earnings.forEach((e) => {
      platformEarnings[e.platform.name] = (platformEarnings[e.platform.name] || 0) + Number(e.amount);
    });

    const bestPlatform = Object.entries(platformEarnings).sort((a, b) => b[1] - a[1])[0];
    if (bestPlatform) {
      insights.push({
        type: 'top_platform',
        title: 'Best Performing Platform',
        description: `${bestPlatform[0]} generates the most revenue`,
        value: bestPlatform[1],
        percentage: (bestPlatform[1] / totalEarnings) * 100,
      });
    }

    // Insight 2: Earnings trend
    const dailyEarnings: { [key: string]: number } = {};
    earnings.forEach((e) => {
      const day = e.date.toISOString().split('T')[0];
      dailyEarnings[day] = (dailyEarnings[day] || 0) + Number(e.amount);
    });

    const sortedDays = Object.entries(dailyEarnings).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    if (sortedDays.length > 1) {
      const firstWeek = sortedDays.slice(0, 7).reduce((sum, [, v]) => sum + v, 0) / Math.min(7, sortedDays.length);
      const lastWeek = sortedDays.slice(-7).reduce((sum, [, v]) => sum + v, 0) / 7;
      const growth = ((lastWeek - firstWeek) / firstWeek) * 100;

      insights.push({
        type: 'growth_trend',
        title: 'Growth Trend',
        description: growth > 0 ? 'Earnings are increasing' : 'Earnings are declining',
        value: growth,
        direction: growth > 0 ? 'up' : 'down',
      });
    }

    // Insight 3: Consistency score
    const dailyValues = sortedDays.map(([, v]) => v);
    const mean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
    const variance = dailyValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / dailyValues.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (stdDev / mean) * 100);

    insights.push({
      type: 'consistency',
      title: 'Earnings Consistency',
      description: consistency > 70 ? 'Very consistent' : consistency > 40 ? 'Moderately consistent' : 'Highly variable',
      value: consistency,
      rating: consistency > 70 ? 'excellent' : consistency > 40 ? 'good' : 'needs_improvement',
    });

    res.json({
      insights,
      summary: {
        totalEarnings,
        avgDaily,
        daysTracked: sortedDays.length,
        platformCount: Object.keys(platformEarnings).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Export Analytics
export const exportAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { format = 'json', months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      include: { platform: true },
    });

    const data = {
      exportDate: new Date().toISOString(),
      period: {
        from: startDate.toISOString(),
        to: new Date().toISOString(),
      },
      summary: {
        totalEarnings: earnings.reduce((sum, e) => sum + Number(e.amount), 0),
        totalEntries: earnings.length,
        platformCount: new Set(earnings.map((e) => e.platformId)).size,
      },
      earnings: earnings.map((e) => ({
        date: e.date,
        platform: e.platform.name,
        amount: Number(e.amount),
        notes: e.notes,
      })),
    };

    if (format === 'json') {
      res.json(data);
    } else if (format === 'csv') {
      let csv = 'Date,Platform,Amount,Notes\n';
      earnings.forEach((e) => {
        csv += `${e.date.toISOString()},${e.platform.name},${Number(e.amount)},"${e.notes || ''}"\n`;
      });
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="analytics.csv"');
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
};
