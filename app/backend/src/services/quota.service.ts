import { PrismaClient, QuotaTier, UsagePeriod, ViolationAction } from '@prisma/client';

const prisma = new PrismaClient();

interface QuotaLimits {
  requestsPerHour: number;
  requestsPerDay: number;
  requestsPerMonth: number;
  storageGB: number;
  concurrentRequests: number;
}

interface UsageStats {
  hourly: number;
  daily: number;
  monthly: number;
  concurrent: number;
  storage: number;
}

interface QuotaReport {
  userId: string;
  tier: QuotaTier;
  limits: QuotaLimits;
  current: UsageStats;
  remaining: UsageStats;
  percentageUsed: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  violations: number;
  resetAt: Date;
}

interface ViolationRecord {
  id: string;
  endpoint: string;
  timestamp: Date;
  action: ViolationAction;
  limitExceeded: string;
  attemptedCount: number;
}

class QuotaService {
  /**
   * Get tiered quota limits based on subscription tier
   */
  private getTierLimits(tier: QuotaTier): QuotaLimits {
    const tiers: Record<QuotaTier, QuotaLimits> = {
      FREE: {
        requestsPerHour: 100,
        requestsPerDay: 1000,
        requestsPerMonth: 10000,
        storageGB: 1,
        concurrentRequests: 5,
      },
      PRO: {
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        requestsPerMonth: 100000,
        storageGB: 100,
        concurrentRequests: 20,
      },
      ENTERPRISE: {
        requestsPerHour: 10000,
        requestsPerDay: 100000,
        requestsPerMonth: 1000000,
        storageGB: 1000,
        concurrentRequests: 100,
      },
    };

    return tiers[tier];
  }

  /**
   * Initialize quota for a new user
   */
  async initializeQuota(userId: string, tier: QuotaTier = QuotaTier.FREE) {
    const limits = this.getTierLimits(tier);

    const quota = await prisma.apiQuota.create({
      data: {
        userId,
        tier,
        ...limits,
      },
    });

    return quota;
  }

  /**
   * Get or create quota for user
   */
  async getOrCreateQuota(userId: string) {
    let quota = await prisma.apiQuota.findUnique({
      where: { userId },
    });

    if (!quota) {
      quota = await this.initializeQuota(userId);
    }

    return quota;
  }

  /**
   * Update quota tier (upgrade/downgrade)
   */
  async updateQuotaTier(userId: string, tier: QuotaTier) {
    const limits = this.getTierLimits(tier);

    const quota = await prisma.apiQuota.update({
      where: { userId },
      data: {
        tier,
        ...limits,
      },
    });

    return quota;
  }

  /**
   * Track API usage for a request
   */
  async trackUsage(
    userId: string,
    endpoint: string,
    method: string,
    responseTime?: number,
    isError: boolean = false
  ) {
    const quota = await this.getOrCreateQuota(userId);
    const now = new Date();

    // Track usage for all periods (hour, day, month)
    const periods: UsagePeriod[] = [UsagePeriod.HOUR, UsagePeriod.DAY, UsagePeriod.MONTH];

    for (const period of periods) {
      const { periodStart, periodEnd } = this.getPeriodBounds(now, period);

      // Find or create usage record
      const usage = await prisma.apiUsage.findFirst({
        where: {
          userId,
          quotaId: quota.id,
          endpoint,
          period,
          periodStart,
        },
      });

      if (usage) {
        // Update existing record
        await prisma.apiUsage.update({
          where: { id: usage.id },
          data: {
            count: { increment: 1 },
            errorCount: isError ? { increment: 1 } : usage.errorCount,
            responseTime: responseTime
              ? Math.round((usage.responseTime || 0 + responseTime) / 2)
              : usage.responseTime,
          },
        });
      } else {
        // Create new record
        await prisma.apiUsage.create({
          data: {
            userId,
            quotaId: quota.id,
            endpoint,
            method,
            count: 1,
            period,
            periodStart,
            periodEnd,
            errorCount: isError ? 1 : 0,
            responseTime,
          },
        });
      }
    }
  }

  /**
   * Check if user has exceeded quota limits
   */
  async checkQuotaLimits(userId: string, endpoint: string): Promise<{
    allowed: boolean;
    limitExceeded?: string;
    remaining?: number;
    resetAt?: Date;
  }> {
    const quota = await this.getOrCreateQuota(userId);
    const now = new Date();

    // Check hourly limit
    const hourlyUsage = await this.getUsageForPeriod(userId, UsagePeriod.HOUR);
    if (hourlyUsage >= quota.requestsPerHour) {
      return {
        allowed: false,
        limitExceeded: 'hourly_limit',
        remaining: 0,
        resetAt: this.getNextPeriodReset(now, UsagePeriod.HOUR),
      };
    }

    // Check daily limit
    const dailyUsage = await this.getUsageForPeriod(userId, UsagePeriod.DAY);
    if (dailyUsage >= quota.requestsPerDay) {
      return {
        allowed: false,
        limitExceeded: 'daily_limit',
        remaining: 0,
        resetAt: this.getNextPeriodReset(now, UsagePeriod.DAY),
      };
    }

    // Check monthly limit
    const monthlyUsage = await this.getUsageForPeriod(userId, UsagePeriod.MONTH);
    if (monthlyUsage >= quota.requestsPerMonth) {
      return {
        allowed: false,
        limitExceeded: 'monthly_limit',
        remaining: 0,
        resetAt: this.getNextPeriodReset(now, UsagePeriod.MONTH),
      };
    }

    // All checks passed
    return {
      allowed: true,
      remaining: Math.min(
        quota.requestsPerHour - hourlyUsage,
        quota.requestsPerDay - dailyUsage,
        quota.requestsPerMonth - monthlyUsage
      ),
      resetAt: this.getNextPeriodReset(now, UsagePeriod.HOUR),
    };
  }

  /**
   * Get total usage for a specific period
   */
  private async getUsageForPeriod(userId: string, period: UsagePeriod): Promise<number> {
    const { periodStart } = this.getPeriodBounds(new Date(), period);

    const usageRecords = await prisma.apiUsage.findMany({
      where: {
        userId,
        period,
        periodStart,
      },
    });

    return usageRecords.reduce((total, record) => total + record.count, 0);
  }

  /**
   * Get period bounds (start and end)
   */
  private getPeriodBounds(date: Date, period: UsagePeriod): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(date);
    const periodEnd = new Date(date);

    switch (period) {
      case UsagePeriod.HOUR:
        periodStart.setMinutes(0, 0, 0);
        periodEnd.setHours(periodStart.getHours() + 1, 0, 0, 0);
        break;
      case UsagePeriod.DAY:
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(periodStart.getDate() + 1);
        periodEnd.setHours(0, 0, 0, 0);
        break;
      case UsagePeriod.MONTH:
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setMonth(periodStart.getMonth() + 1);
        periodEnd.setDate(1);
        periodEnd.setHours(0, 0, 0, 0);
        break;
    }

    return { periodStart, periodEnd };
  }

  /**
   * Get next period reset time
   */
  private getNextPeriodReset(date: Date, period: UsagePeriod): Date {
    const { periodEnd } = this.getPeriodBounds(date, period);
    return periodEnd;
  }

  /**
   * Record a rate limit violation
   */
  async recordViolation(
    userId: string,
    endpoint: string,
    method: string,
    limitExceeded: string,
    attemptedCount: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    const quota = await this.getOrCreateQuota(userId);

    // Determine action based on violation severity
    const recentViolations = await prisma.rateLimitViolation.count({
      where: {
        userId,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    let action: ViolationAction = ViolationAction.WARN;
    if (recentViolations >= 10) {
      action = ViolationAction.BLOCK;
    } else if (recentViolations >= 5) {
      action = ViolationAction.THROTTLE;
    }

    const violation = await prisma.rateLimitViolation.create({
      data: {
        userId,
        quotaId: quota.id,
        endpoint,
        method,
        action,
        attemptedCount,
        limitExceeded,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ recentViolations }),
      },
    });

    return violation;
  }

  /**
   * Get current usage statistics
   */
  async getCurrentUsage(userId: string): Promise<UsageStats> {
    const hourlyUsage = await this.getUsageForPeriod(userId, UsagePeriod.HOUR);
    const dailyUsage = await this.getUsageForPeriod(userId, UsagePeriod.DAY);
    const monthlyUsage = await this.getUsageForPeriod(userId, UsagePeriod.MONTH);

    // Get storage usage (sum of file sizes)
    const storageResult = await prisma.fileUpload.aggregate({
      where: { userId },
      _sum: { fileSize: true },
    });

    const storageBytes = Number(storageResult._sum.fileSize || 0);
    const storageGB = storageBytes / (1024 * 1024 * 1024);

    return {
      hourly: hourlyUsage,
      daily: dailyUsage,
      monthly: monthlyUsage,
      concurrent: 0, // This would need to be tracked in real-time
      storage: parseFloat(storageGB.toFixed(2)),
    };
  }

  /**
   * Get remaining quota
   */
  async getRemainingQuota(userId: string): Promise<UsageStats> {
    const quota = await this.getOrCreateQuota(userId);
    const current = await this.getCurrentUsage(userId);

    return {
      hourly: Math.max(0, quota.requestsPerHour - current.hourly),
      daily: Math.max(0, quota.requestsPerDay - current.daily),
      monthly: Math.max(0, quota.requestsPerMonth - current.monthly),
      concurrent: Math.max(0, quota.concurrentRequests - current.concurrent),
      storage: Math.max(0, parseFloat(quota.storageGB.toString()) - current.storage),
    };
  }

  /**
   * Generate comprehensive usage report
   */
  async generateUsageReport(userId: string): Promise<QuotaReport> {
    const quota = await this.getOrCreateQuota(userId);
    const current = await this.getCurrentUsage(userId);
    const remaining = await this.getRemainingQuota(userId);

    const limits: QuotaLimits = {
      requestsPerHour: quota.requestsPerHour,
      requestsPerDay: quota.requestsPerDay,
      requestsPerMonth: quota.requestsPerMonth,
      storageGB: parseFloat(quota.storageGB.toString()),
      concurrentRequests: quota.concurrentRequests,
    };

    const violations = await prisma.rateLimitViolation.count({
      where: {
        userId,
        resolved: false,
      },
    });

    return {
      userId,
      tier: quota.tier,
      limits,
      current,
      remaining,
      percentageUsed: {
        hourly: (current.hourly / limits.requestsPerHour) * 100,
        daily: (current.daily / limits.requestsPerDay) * 100,
        monthly: (current.monthly / limits.requestsPerMonth) * 100,
      },
      violations,
      resetAt: quota.resetAt,
    };
  }

  /**
   * Get usage history with time series data
   */
  async getUsageHistory(
    userId: string,
    period: UsagePeriod,
    startDate: Date,
    endDate: Date
  ) {
    const usageRecords = await prisma.apiUsage.findMany({
      where: {
        userId,
        period,
        periodStart: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        periodStart: 'asc',
      },
    });

    return usageRecords.map((record) => ({
      timestamp: record.periodStart,
      endpoint: record.endpoint,
      count: record.count,
      errorCount: record.errorCount,
      averageResponseTime: record.responseTime,
    }));
  }

  /**
   * Get violation history
   */
  async getViolationHistory(
    userId: string,
    limit: number = 50
  ): Promise<ViolationRecord[]> {
    const violations = await prisma.rateLimitViolation.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return violations.map((v) => ({
      id: v.id,
      endpoint: v.endpoint,
      timestamp: v.timestamp,
      action: v.action,
      limitExceeded: v.limitExceeded,
      attemptedCount: v.attemptedCount,
    }));
  }

  /**
   * Clean up old usage records
   */
  async cleanupOldRecords(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await prisma.apiUsage.deleteMany({
      where: {
        periodEnd: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[Quota] Cleaned up ${deleted.count} old usage records`);
    return deleted.count;
  }

  /**
   * Reset quota counters (for testing or manual reset)
   */
  async resetQuota(userId: string) {
    const quota = await this.getOrCreateQuota(userId);

    // Delete all usage records for current periods
    await prisma.apiUsage.deleteMany({
      where: { userId },
    });

    // Update reset timestamp
    await prisma.apiQuota.update({
      where: { userId },
      data: { resetAt: new Date() },
    });

    return quota;
  }

  /**
   * Get top endpoints by usage
   */
  async getTopEndpoints(userId: string, period: UsagePeriod, limit: number = 10) {
    const { periodStart } = this.getPeriodBounds(new Date(), period);

    const usage = await prisma.apiUsage.findMany({
      where: {
        userId,
        period,
        periodStart,
      },
      orderBy: {
        count: 'desc',
      },
      take: limit,
    });

    return usage.map((u) => ({
      endpoint: u.endpoint,
      method: u.method,
      count: u.count,
      errorRate: u.errorCount / u.count,
      averageResponseTime: u.responseTime,
    }));
  }

  /**
   * Check if user should be throttled
   */
  async shouldThrottle(userId: string): Promise<boolean> {
    const recentViolations = await prisma.rateLimitViolation.count({
      where: {
        userId,
        action: { in: [ViolationAction.THROTTLE, ViolationAction.BLOCK] },
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
        resolved: false,
      },
    });

    return recentViolations > 0;
  }
}

export const quotaService = new QuotaService();
