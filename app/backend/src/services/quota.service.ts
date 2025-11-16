/**
 * Quota Service
 * Handles quota checking, usage tracking, and quota enforcement
 */

import prisma from '../lib/prisma';
import { CacheService } from './cache.service';
import { logInfo, logWarn, logDebug, logError } from '../lib/logger';
import {
  getQuotaForTier,
  getFeatureLimit,
  getResetPeriod,
  isFeatureUnlimited,
  QuotaTier,
  QuotaFeature,
} from '../config/quotas.config';

export interface UsageStats {
  userId: string;
  feature: QuotaFeature;
  count: number;
  limit: number | null;
  percentUsed: number;
  isExceeded: boolean;
  resetDate: Date;
}

export interface UserQuotaStatus {
  tier: QuotaTier;
  features: UsageStats[];
  isAnyQuotaExceeded: boolean;
  totalPercentUsed: number;
}

export class QuotaService {
  private static readonly CACHE_PREFIX = 'quota:';
  private static readonly USAGE_CACHE_TTL = 300; // 5 minutes

  /**
   * Track feature usage for a user
   * Increments the usage counter for a feature in the current billing period
   * @param userId User ID
   * @param feature Feature name
   * @param amount Amount to increment (default 1)
   * @returns Updated usage count
   */
  static async trackUsage(userId: string, feature: QuotaFeature, amount: number = 1): Promise<number> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        logWarn('User not found for quota tracking', { userId });
        return 0;
      }

      const tier = (user.tier as QuotaTier) || 'free';
      const resetDate = this.getResetDate(tier, feature);

      // Check for unlimited feature
      if (isFeatureUnlimited(tier, feature)) {
        logDebug('Feature is unlimited, skipping usage tracking', { userId, feature, tier });
        return 0;
      }

      // Find or create usage record
      let usage = await prisma.usage.findUnique({
        where: {
          userId_feature_resetDate: {
            userId,
            feature,
            resetDate,
          },
        },
      });

      if (!usage) {
        const limit = getFeatureLimit(tier, feature) || 0;
        usage = await prisma.usage.create({
          data: {
            userId,
            feature,
            count: 0,
            limit,
            resetDate,
          },
        });
      }

      // Update count
      const newCount = usage.count + amount;
      const updatedUsage = await prisma.usage.update({
        where: { id: usage.id },
        data: { count: newCount },
      });

      // Log usage
      logDebug('Usage tracked', {
        userId,
        feature,
        amount,
        newCount,
        limit: usage.limit,
      });

      // Invalidate cache
      await this.invalidateCache(userId);

      return newCount;
    } catch (error) {
      logError('Failed to track usage', error as Error, { userId, feature });
      return 0;
    }
  }

  /**
   * Check if a user has exceeded quota for a feature
   * @param userId User ID
   * @param feature Feature name
   * @returns True if quota is exceeded
   */
  static async checkQuota(userId: string, feature: QuotaFeature): Promise<boolean> {
    try {
      const stats = await this.getUsageStats(userId, feature);
      if (!stats) {
        return false;
      }

      const isExceeded = stats.isExceeded;
      if (isExceeded) {
        logWarn('Quota exceeded', {
          userId,
          feature,
          count: stats.count,
          limit: stats.limit,
        });
      }

      return isExceeded;
    } catch (error) {
      logError('Failed to check quota', error as Error, { userId, feature });
      return false;
    }
  }

  /**
   * Get usage statistics for a specific feature
   * @param userId User ID
   * @param feature Feature name
   * @returns Usage statistics
   */
  static async getUsageStats(userId: string, feature: QuotaFeature): Promise<UsageStats | null> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return null;
      }

      const tier = (user.tier as QuotaTier) || 'free';

      // Check if feature is unlimited
      if (isFeatureUnlimited(tier, feature)) {
        return {
          userId,
          feature,
          count: 0,
          limit: null,
          percentUsed: 0,
          isExceeded: false,
          resetDate: this.getResetDate(tier, feature),
        };
      }

      const resetDate = this.getResetDate(tier, feature);
      const limit = getFeatureLimit(tier, feature) || 0;

      const usage = await prisma.usage.findUnique({
        where: {
          userId_feature_resetDate: {
            userId,
            feature,
            resetDate,
          },
        },
      });

      const count = usage?.count || 0;
      const percentUsed = limit > 0 ? (count / limit) * 100 : 0;
      const isExceeded = count >= limit;

      return {
        userId,
        feature,
        count,
        limit,
        percentUsed,
        isExceeded,
        resetDate,
      };
    } catch (error) {
      logError('Failed to get usage stats', error as Error, { userId, feature });
      return null;
    }
  }

  /**
   * Get all usage statistics for a user
   * @param userId User ID
   * @returns All usage statistics
   */
  static async getAllUsageStats(userId: string): Promise<UserQuotaStatus | null> {
    try {
      // Try cache first
      const cacheKey = `${this.CACHE_PREFIX}all:${userId}`;
      const cached = await CacheService.get<UserQuotaStatus>(cacheKey);
      if (cached) {
        logDebug('Returning cached usage stats', { userId });
        return cached;
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return null;
      }

      const tier = (user.tier as QuotaTier) || 'free';
      const features: QuotaFeature[] = ['earnings', 'invoices', 'products', 'sales', 'documents', 'websocket_connections'];

      const featureStats = await Promise.all(
        features.map((feature) => this.getUsageStats(userId, feature))
      );

      const validStats = featureStats.filter((stat) => stat !== null) as UsageStats[];
      const isAnyQuotaExceeded = validStats.some((stat) => stat.isExceeded);
      const totalPercentUsed =
        validStats.length > 0
          ? validStats.reduce((sum, stat) => sum + stat.percentUsed, 0) / validStats.length
          : 0;

      const status: UserQuotaStatus = {
        tier,
        features: validStats,
        isAnyQuotaExceeded,
        totalPercentUsed,
      };

      // Cache for 5 minutes
      await CacheService.set(cacheKey, status, this.USAGE_CACHE_TTL);

      return status;
    } catch (error) {
      logError('Failed to get all usage stats', error as Error, { userId });
      return null;
    }
  }

  /**
   * Reset quota counters for a user (monthly reset)
   * Called by scheduled job at the beginning of each month
   * @param userId User ID
   * @returns Number of quotas reset
   */
  static async resetQuotaCounters(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        logWarn('User not found for quota reset', { userId });
        return 0;
      }

      const tier = (user.tier as QuotaTier) || 'free';
      const features: QuotaFeature[] = ['earnings', 'invoices', 'products', 'sales', 'documents'];

      let resetCount = 0;

      for (const feature of features) {
        const resetPeriod = getResetPeriod(tier, feature);
        if (resetPeriod !== 'monthly') {
          continue;
        }

        // Find all usage records for this feature that need resetting
        const oldUsages = await prisma.usage.findMany({
          where: {
            userId,
            feature,
            resetDate: {
              lt: this.getResetDate(tier, feature),
            },
          },
        });

        // Delete old usage records
        if (oldUsages.length > 0) {
          await prisma.usage.deleteMany({
            where: {
              id: {
                in: oldUsages.map((u) => u.id),
              },
            },
          });
          resetCount += oldUsages.length;
        }
      }

      // Invalidate cache
      await this.invalidateCache(userId);

      logInfo('Quota counters reset', { userId, resetCount });
      return resetCount;
    } catch (error) {
      logError('Failed to reset quota counters', error as Error, { userId });
      return 0;
    }
  }

  /**
   * Upgrade user tier
   * @param userId User ID
   * @param newTier New tier
   * @returns Updated user
   */
  static async upgradeTier(userId: string, newTier: QuotaTier): Promise<any> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { tier: newTier },
      });

      // Create or update subscription record
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier: newTier,
          status: 'active',
          startDate,
          endDate,
          billingCycle: 'monthly',
          nextBillingDate: endDate,
        },
        update: {
          tier: newTier,
          status: 'active',
          endDate,
          nextBillingDate: endDate,
        },
      });

      // Invalidate cache
      await this.invalidateCache(userId);

      logInfo('User tier upgraded', { userId, newTier });
      return user;
    } catch (error) {
      logError('Failed to upgrade tier', error as Error, { userId, newTier });
      throw error;
    }
  }

  /**
   * Get the next reset date for a feature quota
   * @param tier Subscription tier
   * @param feature Feature name
   * @returns Reset date
   */
  private static getResetDate(tier: QuotaTier, feature: QuotaFeature): Date {
    const resetPeriod = getResetPeriod(tier, feature);

    if (resetPeriod === 'never') {
      return new Date('2099-12-31');
    }

    const now = new Date();

    if (resetPeriod === 'monthly') {
      // Reset on the first day of next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth;
    }

    if (resetPeriod === 'yearly') {
      // Reset on January 1st next year
      const nextYear = new Date(now.getFullYear() + 1, 0, 1);
      return nextYear;
    }

    return now;
  }

  /**
   * Invalidate cache for a user
   * @param userId User ID
   */
  private static async invalidateCache(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}all:${userId}`;
      await CacheService.delete(cacheKey);
    } catch (error) {
      logDebug('Failed to invalidate cache', { userId });
    }
  }
}
