import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';

const prisma = new PrismaClient();

// Initialize Redis for caching (optional)
let redis: any = null;
if (process.env.REDIS_URL) {
  try {
    // Lazy load Redis to avoid issues if ioredis is not available
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL);
  } catch (error) {
    logger.warn('Redis connection failed, caching disabled:', error);
  }
}

/**
 * Analytics Aggregation Job
 * Runs: Daily at midnight
 * Task: Aggregate daily analytics and update dashboard cache
 */
export async function analyticsAggregationJob(): Promise<void> {
  logger.info('Starting analytics aggregation job');

  try {
    // 1. Aggregate daily earnings metrics
    await aggregateDailyEarnings();

    // 2. Calculate trending metrics
    await calculateTrendingMetrics();

    // 3. Update dashboard cache
    await updateDashboardCache();

    // 4. Update customer insights
    await updateCustomerInsights();

    logger.info('Analytics aggregation job completed successfully');
  } catch (error) {
    logger.error('Analytics aggregation job failed:', error);
    throw error;
  }
}

/**
 * Aggregate daily earnings metrics
 */
async function aggregateDailyEarnings(): Promise<void> {
  try {
    logger.info('Aggregating daily earnings metrics');

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      try {
        // Calculate daily earnings
        const earnings = await prisma.earning.aggregate({
          where: {
            userId: user.id,
            date: {
              gte: yesterday,
              lt: today,
            },
          },
          _sum: { amount: true, hours: true },
          _count: true,
        });

        const totalEarnings = earnings._sum.amount || 0;
        const totalHours = earnings._sum.hours || 0;
        const hourlyRate =
          totalHours > 0 ? Number(totalEarnings) / Number(totalHours) : 0;

        const dailyMetrics = {
          userId: user.id,
          date: yesterday,
          totalEarnings: totalEarnings.toFixed(2),
          totalHours: totalHours.toFixed(2),
          hourlyRate: hourlyRate.toFixed(2),
          transactionCount: earnings._count,
        };

        // Cache daily metrics
        if (redis) {
          const cacheKey = `analytics:daily:${user.id}:${yesterday.getTime()}`;
          await redis.setex(cacheKey, 86400 * 30, JSON.stringify(dailyMetrics)); // 30 days
        }

        logger.debug(`Daily earnings aggregated for user ${user.id}:`, dailyMetrics);
      } catch (userError) {
        logger.error(`Failed to aggregate earnings for user ${user.id}:`, userError);
      }
    }

    logger.info('Daily earnings aggregation completed');
  } catch (error) {
    logger.error('Failed to aggregate daily earnings:', error);
  }
}

/**
 * Calculate trending metrics
 */
async function calculateTrendingMetrics(): Promise<void> {
  try {
    logger.info('Calculating trending metrics');

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      try {
        // Calculate metrics for last 7, 14, and 30 days
        const periods = [
          { name: '7days', days: 7 },
          { name: '14days', days: 14 },
          { name: '30days', days: 30 },
        ];

        for (const period of periods) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - period.days);
          startDate.setHours(0, 0, 0, 0);

          const earnings = await prisma.earning.aggregate({
            where: {
              userId: user.id,
              date: { gte: startDate },
            },
            _sum: { amount: true },
            _avg: { amount: true },
            _max: { amount: true },
            _min: { amount: true },
            _count: true,
          });

          const trendingMetrics = {
            period: period.name,
            totalEarnings: earnings._sum.amount?.toFixed(2) || '0.00',
            averageEarnings: earnings._avg.amount?.toFixed(2) || '0.00',
            maxEarning: earnings._max.amount?.toFixed(2) || '0.00',
            minEarning: earnings._min.amount?.toFixed(2) || '0.00',
            transactionCount: earnings._count,
            averagePerTransaction: earnings._count > 0
              ? (Number(earnings._sum.amount || 0) / earnings._count).toFixed(2)
              : '0.00',
          };

          // Cache trending metrics
          if (redis) {
            const cacheKey = `analytics:trending:${user.id}:${period.name}`;
            await redis.setex(
              cacheKey,
              3600, // 1 hour
              JSON.stringify(trendingMetrics)
            );
          }

          logger.debug(
            `Trending metrics calculated for user ${user.id} (${period.name}):`,
            trendingMetrics
          );
        }
      } catch (userError) {
        logger.error(`Failed to calculate trends for user ${user.id}:`, userError);
      }
    }

    logger.info('Trending metrics calculation completed');
  } catch (error) {
    logger.error('Failed to calculate trending metrics:', error);
  }
}

/**
 * Update dashboard cache
 */
async function updateDashboardCache(): Promise<void> {
  try {
    logger.info('Updating dashboard cache');

    if (!redis) {
      logger.info('Redis not available, skipping dashboard cache update');
      return;
    }

    const users = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      try {
        // Get key dashboard metrics
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEarnings = await prisma.earning.aggregate({
          where: {
            userId: user.id,
            date: {
              gte: today,
            },
          },
          _sum: { amount: true },
        });

        const monthEarnings = await prisma.earning.aggregate({
          where: {
            userId: user.id,
            date: {
              gte: new Date(today.getFullYear(), today.getMonth(), 1),
            },
          },
          _sum: { amount: true },
        });

        const yearEarnings = await prisma.earning.aggregate({
          where: {
            userId: user.id,
            date: {
              gte: new Date(today.getFullYear(), 0, 1),
            },
          },
          _sum: { amount: true },
        });

        const dashboardData = {
          userId: user.id,
          todayEarnings: todayEarnings._sum.amount?.toFixed(2) || '0.00',
          monthEarnings: monthEarnings._sum.amount?.toFixed(2) || '0.00',
          yearEarnings: yearEarnings._sum.amount?.toFixed(2) || '0.00',
          updatedAt: new Date().toISOString(),
        };

        const cacheKey = `dashboard:${user.id}`;
        await redis.setex(cacheKey, 3600, JSON.stringify(dashboardData)); // 1 hour TTL

        logger.debug(`Dashboard cache updated for user ${user.id}`);
      } catch (userError) {
        logger.error(`Failed to update dashboard cache for user ${user.id}:`, userError);
      }
    }

    logger.info('Dashboard cache update completed');
  } catch (error) {
    logger.error('Failed to update dashboard cache:', error);
  }
}

/**
 * Update customer insights and metrics
 */
async function updateCustomerInsights(): Promise<void> {
  try {
    logger.info('Updating customer insights');

    // Get all customers with recent activity
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        userId: true,
      },
    });

    for (const customer of customers) {
      try {
        // Get customer sales metrics
        const sales = await prisma.sale.aggregate({
          where: {
            userId: customer.userId,
            customer: customer.id,
          },
          _sum: { totalAmount: true },
          _count: true,
        });

        // Get customer invoices
        const invoices = await prisma.invoice.aggregate({
          where: {
            customerId: customer.id,
          },
          _sum: { totalAmount: true },
          _count: true,
        });

        const insights = {
          customerId: customer.id,
          totalSales: sales._sum.totalAmount?.toFixed(2) || '0.00',
          salesCount: sales._count,
          totalInvoices: invoices._sum.totalAmount?.toFixed(2) || '0.00',
          invoiceCount: invoices._count,
        };

        // Cache customer insights
        if (redis) {
          const cacheKey = `customer:insights:${customer.id}`;
          await redis.setex(cacheKey, 3600, JSON.stringify(insights));
        }

        logger.debug(`Customer insights updated for customer ${customer.id}`);
      } catch (customerError) {
        logger.error(`Failed to update insights for customer ${customer.id}:`, customerError);
      }
    }

    logger.info('Customer insights update completed');
  } catch (error) {
    logger.error('Failed to update customer insights:', error);
  }
}
