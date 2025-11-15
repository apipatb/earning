import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple ML models for predictions and insights
class EarningsMLModel {
  // Calculate trend using linear regression
  static calculateTrend(data: number[]): { slope: number; intercept: number } {
    if (data.length < 2) return { slope: 0, intercept: data[0] || 0 };

    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, i) => sum + i * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  // Detect anomalies using z-score
  static detectAnomalies(data: number[], threshold: number = 2): number[] {
    if (data.length < 2) return [];

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return data
      .map((value, index) => ({ index, value }))
      .filter(({ value }) => Math.abs((value - mean) / stdDev) > threshold)
      .map(({ index }) => index);
  }

  // Predict future earnings using exponential smoothing
  static predictFuture(data: number[], periods: number = 7, alpha: number = 0.3): number[] {
    if (data.length === 0) return [];

    const forecast: number[] = [];
    let level = data[0];

    for (let i = 0; i < data.length; i++) {
      level = alpha * data[i] + (1 - alpha) * level;
    }

    for (let i = 0; i < periods; i++) {
      forecast.push(level);
    }

    return forecast;
  }

  // Pattern detection
  static detectPatterns(data: number[]): string[] {
    const patterns: string[] = [];

    if (data.length < 3) return patterns;

    // Check if increasing trend
    let increasing = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i] > data[i - 1]) increasing++;
    }
    if (increasing / data.length > 0.6) patterns.push('uptrend');
    if (increasing / data.length < 0.4) patterns.push('downtrend');

    // Check for cyclical pattern (weekend vs weekday)
    const weekdayAvg = data.filter((_, i) => i % 7 < 5).reduce((a, b) => a + b, 0) /
                       data.filter((_, i) => i % 7 < 5).length;
    const weekendAvg = data.filter((_, i) => i % 7 >= 5).reduce((a, b) => a + b, 0) /
                       data.filter((_, i) => i % 7 >= 5).length;

    if (Math.abs(weekdayAvg - weekendAvg) / ((weekdayAvg + weekendAvg) / 2) > 0.2) {
      patterns.push('weekly_cycle');
    }

    return patterns;
  }
}

export const getAIInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { period = 'month' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get earnings data
    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      include: { platform: true },
      orderBy: { date: 'asc' },
    });

    // Prepare data for ML models
    const dailyEarnings = new Map<string, number>();
    earnings.forEach((e) => {
      const dateStr = e.date.toISOString().split('T')[0];
      dailyEarnings.set(dateStr, (dailyEarnings.get(dateStr) || 0) + Number(e.amount));
    });

    const dailyData = Array.from(dailyEarnings.values());

    // ML analysis
    const trend = EarningsMLModel.calculateTrend(dailyData);
    const anomalies = EarningsMLModel.detectAnomalies(dailyData);
    const forecast = EarningsMLModel.predictFuture(dailyData, 7);
    const patterns = EarningsMLModel.detectPatterns(dailyData);

    // Platform insights
    const platformMetrics: any = {};
    earnings.forEach((e) => {
      const pName = e.platform.name;
      if (!platformMetrics[pName]) {
        platformMetrics[pName] = { total: 0, count: 0, data: [] };
      }
      platformMetrics[pName].total += Number(e.amount);
      platformMetrics[pName].count += 1;
      platformMetrics[pName].data.push(Number(e.amount));
    });

    const platformInsights = Object.entries(platformMetrics).map(([name, metrics]: any) => {
      const trend = EarningsMLModel.calculateTrend(metrics.data);
      return {
        platform: name,
        totalEarnings: metrics.total,
        avgEarnings: metrics.total / metrics.count,
        trend: trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable',
        trendStrength: Math.abs(trend.slope),
      };
    });

    // Generate recommendations
    const recommendations = generateRecommendations(platformInsights, patterns, trend);

    res.json({
      summary: {
        totalEarnings: dailyData.reduce((a, b) => a + b, 0),
        avgDaily: dailyData.reduce((a, b) => a + b, 0) / dailyData.length,
        trend: trend.slope > 0 ? 'improving' : trend.slope < 0 ? 'declining' : 'stable',
        trendStrength: Math.abs(trend.slope),
        daysTracked: dailyData.length,
      },
      anomalies: anomalies.map((index) => ({
        index,
        date: Array.from(dailyEarnings.keys())[index],
        value: dailyData[index],
        deviation: 'high',
      })),
      forecast: forecast.map((value, i) => ({
        day: i + 1,
        predictedEarnings: Math.round(value * 100) / 100,
      })),
      patterns,
      platformInsights,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

export const getSmartRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get recent earnings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      include: { platform: true },
    });

    const platformMetrics: any = {};
    earnings.forEach((e) => {
      const pName = e.platform.name;
      if (!platformMetrics[pName]) {
        platformMetrics[pName] = { total: 0, count: 0 };
      }
      platformMetrics[pName].total += Number(e.amount);
      platformMetrics[pName].count += 1;
    });

    const recommendations: any[] = [];

    // Analyze top and bottom performers
    const sorted = Object.entries(platformMetrics)
      .sort((a: any, b: any) => b[1].total - a[1].total);

    if (sorted.length > 0) {
      const topPlatform = sorted[0];
      recommendations.push({
        type: 'focus',
        priority: 'high',
        message: `Focus on ${topPlatform[0]} - your top earner with $${(topPlatform[1] as any).total} earned`,
        action: 'Dedicate more time to this platform for consistent income',
      });
    }

    // Check for underutilized platforms
    const underutilized = sorted.filter((p: any) => (p[1] as any).count < 5);
    if (underutilized.length > 0) {
      recommendations.push({
        type: 'growth',
        priority: 'medium',
        message: `Explore ${underutilized.map((p) => p[0]).join(', ')} - you've earned from these but could do more`,
        action: 'Set daily goals for these platforms to increase consistency',
      });
    }

    // Consistency check
    const totalDays = new Set(earnings.map((e) => e.date.toISOString().split('T')[0])).size;
    const consistency = (totalDays / 30) * 100;

    if (consistency < 50) {
      recommendations.push({
        type: 'consistency',
        priority: 'high',
        message: `You're only active ${Math.round(consistency)}% of days - consistency is key to growth`,
        action: 'Try to earn something every day, even if small amounts',
      });
    }

    if (consistency > 80) {
      recommendations.push({
        type: 'appreciation',
        priority: 'low',
        message: `Great consistency! You've been active ${Math.round(consistency)}% of the month`,
        action: 'Maintain this momentum and look for ways to increase daily earnings',
      });
    }

    res.json({
      recommendations,
      metricsUsed: {
        platformCount: sorted.length,
        daysActive: totalDays,
        daysConsistency: `${Math.round(consistency)}%`,
        periodDays: 30,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnomalyDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { platformId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: sixtyDaysAgo },
        ...(platformId && { platformId: platformId as string }),
      },
      include: { platform: true },
      orderBy: { date: 'asc' },
    });

    const dailyEarnings = new Map<string, number>();
    earnings.forEach((e) => {
      const dateStr = e.date.toISOString().split('T')[0];
      dailyEarnings.set(dateStr, (dailyEarnings.get(dateStr) || 0) + Number(e.amount));
    });

    const dailyData = Array.from(dailyEarnings.values());
    const anomalyIndices = EarningsMLModel.detectAnomalies(dailyData);

    const anomalies = anomalyIndices.map((index) => {
      const dateKey = Array.from(dailyEarnings.keys())[index];
      const value = dailyData[index];
      const mean = dailyData.reduce((a, b) => a + b, 0) / dailyData.length;
      const deviation = ((value - mean) / mean) * 100;

      return {
        date: dateKey,
        amount: value,
        expectedAmount: Math.round(mean * 100) / 100,
        deviationPercent: Math.round(deviation * 100) / 100,
        type: value > mean ? 'spike' : 'dip',
      };
    });

    res.json({
      anomalies,
      statistics: {
        totalDaysAnalyzed: dailyData.length,
        anomaliesDetected: anomalies.length,
        avgDaily: Math.round((dailyData.reduce((a, b) => a + b, 0) / dailyData.length) * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPredictiveAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { forecastDays = 30 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    const dailyEarnings = new Map<string, number>();
    earnings.forEach((e) => {
      const dateStr = e.date.toISOString().split('T')[0];
      dailyEarnings.set(dateStr, (dailyEarnings.get(dateStr) || 0) + Number(e.amount));
    });

    const dailyData = Array.from(dailyEarnings.values());
    const forecast = EarningsMLModel.predictFuture(dailyData, Number(forecastDays) || 30);

    // Calculate confidence intervals
    const mean = dailyData.reduce((a, b) => a + b, 0) / dailyData.length;
    const variance = dailyData.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / dailyData.length;
    const stdDev = Math.sqrt(variance);

    const forecastWithCI = forecast.map((value, i) => ({
      day: i + 1,
      predictedAmount: Math.round(value * 100) / 100,
      upperBound: Math.round((value + 1.96 * stdDev) * 100) / 100,
      lowerBound: Math.round(Math.max(0, value - 1.96 * stdDev) * 100) / 100,
      confidence: 95,
    }));

    const totalForecast = forecast.reduce((a, b) => a + b, 0);

    res.json({
      forecast: forecastWithCI,
      projections: {
        nextWeekTotal: Math.round(forecast.slice(0, 7).reduce((a, b) => a + b, 0) * 100) / 100,
        nextMonthTotal: Math.round(totalForecast * 100) / 100,
        avgDaily: Math.round((totalForecast / forecast.length) * 100) / 100,
      },
      baselineStats: {
        historicalAvgDaily: Math.round(mean * 100) / 100,
        volatility: Math.round(stdDev * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveInsight = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { title, content, category, insights } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const insight = await prisma.aiInsight.create({
      data: {
        userId,
        title,
        content,
        category,
        insights: insights || {},
        isSaved: true,
      },
    });

    res.status(201).json({
      message: 'Insight saved',
      insight,
    });
  } catch (error) {
    next(error);
  }
};

export const getSavedInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const insights = await prisma.aiInsight.findMany({
      where: { userId, isSaved: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(insights);
  } catch (error) {
    next(error);
  }
};

// Helper function
function generateRecommendations(
  platformInsights: any[],
  patterns: string[],
  trend: { slope: number; intercept: number }
): any[] {
  const recommendations: any[] = [];

  // Platform-based recommendations
  const topPlatform = platformInsights.reduce((top, current) =>
    current.totalEarnings > top.totalEarnings ? current : top
  );

  recommendations.push({
    type: 'platform',
    message: `Your top platform is ${topPlatform.platform} with $${Math.round(topPlatform.totalEarnings * 100) / 100} earned`,
    action: 'Focus more efforts on this high-performing platform',
    priority: 'high',
  });

  // Trend-based recommendations
  if (trend.slope > 0) {
    recommendations.push({
      type: 'trend',
      message: 'Your earnings are in an uptrend - keep up the momentum!',
      action: 'Maintain current strategies that are working',
      priority: 'medium',
    });
  } else if (trend.slope < -5) {
    recommendations.push({
      type: 'trend',
      message: 'Your earnings are declining - consider adjusting your strategy',
      action: 'Review underperforming platforms and try new approaches',
      priority: 'high',
    });
  }

  // Pattern-based recommendations
  if (patterns.includes('weekly_cycle')) {
    recommendations.push({
      type: 'pattern',
      message: 'You have a weekly earning cycle - plan accordingly',
      action: 'Allocate more time on high-earning days',
      priority: 'medium',
    });
  }

  if (patterns.includes('downtrend')) {
    recommendations.push({
      type: 'pattern',
      message: 'Recent earnings show a downtrend - focus on recovery',
      action: 'Try new platforms or increase activity level',
      priority: 'high',
    });
  }

  return recommendations;
}
