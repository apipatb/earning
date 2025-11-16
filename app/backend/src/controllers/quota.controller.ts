import { Response } from 'express';
import { AuthRequest } from '../types';
import { quotaService } from '../services/quota.service';
import { QuotaTier, UsagePeriod } from '@prisma/client';
import { rbacService } from '../services/rbac.service';
import { subscriptionService } from '../services/subscription.service';

/**
 * Quota Controller
 *
 * Handles API quota and rate limit management endpoints
 */

/**
 * @route   GET /api/v1/quota/usage
 * @desc    Get current API usage for authenticated user
 * @access  Private
 */
export const getCurrentUsage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const usage = await quotaService.getCurrentUsage(userId);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error('[Quota] Error getting current usage:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve current usage',
    });
  }
};

/**
 * @route   GET /api/v1/quota/limits
 * @desc    Get quota limits for authenticated user
 * @access  Private
 */
export const getQuotaLimits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const quota = await quotaService.getOrCreateQuota(userId);
    const remaining = await quotaService.getRemainingQuota(userId);

    res.json({
      success: true,
      data: {
        tier: quota.tier,
        limits: {
          requestsPerHour: quota.requestsPerHour,
          requestsPerDay: quota.requestsPerDay,
          requestsPerMonth: quota.requestsPerMonth,
          storageGB: parseFloat(quota.storageGB.toString()),
          concurrentRequests: quota.concurrentRequests,
        },
        remaining,
        resetAt: quota.resetAt,
      },
    });
  } catch (error) {
    console.error('[Quota] Error getting quota limits:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve quota limits',
    });
  }
};

/**
 * @route   GET /api/v1/quota/report
 * @desc    Get comprehensive usage report
 * @access  Private
 */
export const getUsageReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const report = await quotaService.generateUsageReport(userId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('[Quota] Error generating usage report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate usage report',
    });
  }
};

/**
 * @route   GET /api/v1/quota/history
 * @desc    Get usage history with time series data
 * @access  Private
 */
export const getUsageHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'DAY', startDate, endDate, limit = 30 } = req.query;

    // Validate period
    if (!Object.values(UsagePeriod).includes(period as UsagePeriod)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid period. Must be HOUR, DAY, or MONTH',
      });
    }

    // Set default date range if not provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - parseInt(limit as string) * 24 * 60 * 60 * 1000);

    const history = await quotaService.getUsageHistory(
      userId,
      period as UsagePeriod,
      start,
      end
    );

    res.json({
      success: true,
      data: {
        period,
        startDate: start,
        endDate: end,
        records: history,
      },
    });
  } catch (error) {
    console.error('[Quota] Error getting usage history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve usage history',
    });
  }
};

/**
 * @route   GET /api/v1/quota/violations
 * @desc    Get rate limit violation history
 * @access  Private
 */
export const getViolations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 50 } = req.query;

    const violations = await quotaService.getViolationHistory(
      userId,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: violations,
    });
  } catch (error) {
    console.error('[Quota] Error getting violations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve violation history',
    });
  }
};

/**
 * @route   GET /api/v1/quota/top-endpoints
 * @desc    Get top API endpoints by usage
 * @access  Private
 */
export const getTopEndpoints = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'DAY', limit = 10 } = req.query;

    // Validate period
    if (!Object.values(UsagePeriod).includes(period as UsagePeriod)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid period. Must be HOUR, DAY, or MONTH',
      });
    }

    const topEndpoints = await quotaService.getTopEndpoints(
      userId,
      period as UsagePeriod,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        period,
        endpoints: topEndpoints,
      },
    });
  } catch (error) {
    console.error('[Quota] Error getting top endpoints:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve top endpoints',
    });
  }
};

/**
 * @route   POST /api/v1/quota/upgrade
 * @desc    Upgrade quota tier
 * @access  Private
 */
export const upgradeQuotaTier = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tier } = req.body;

    // Validate tier
    if (!Object.values(QuotaTier).includes(tier)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid tier. Must be FREE, PRO, or ENTERPRISE',
      });
    }

    // Check if user has active subscription for paid tiers
    if (tier !== QuotaTier.FREE) {
      // Admins can upgrade to any tier without subscription
      const isAdmin = await rbacService.hasRole(userId, 'ADMIN');

      if (!isAdmin) {
        // Verify user has active subscription for paid tiers
        try {
          const hasActiveSubscription = await subscriptionService.hasActiveSubscription(userId);

          if (!hasActiveSubscription) {
            console.warn(`[Quota] User ${userId} attempted to upgrade to ${tier} without active subscription`);
            return res.status(402).json({
              error: 'Payment Required',
              message: 'An active subscription is required to upgrade to paid tiers. Please subscribe to a plan first.',
              requiredAction: 'subscribe',
            });
          }

          // Get subscription details for logging
          const subscription = await subscriptionService.getActiveSubscription(userId);
          console.log(`[Quota] User ${userId} has active subscription (plan: ${subscription?.plan.name}, status: ${subscription?.status})`);
        } catch (error) {
          console.error(`[Quota] Error verifying subscription for user ${userId}:`, error);
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to verify subscription status. Please try again later.',
          });
        }
      } else {
        console.log(`[Quota] Admin user ${userId} upgrading to ${tier} (subscription check bypassed)`);
      }
    }

    const quota = await quotaService.updateQuotaTier(userId, tier);

    res.json({
      success: true,
      message: 'Quota tier updated successfully',
      data: {
        tier: quota.tier,
        limits: {
          requestsPerHour: quota.requestsPerHour,
          requestsPerDay: quota.requestsPerDay,
          requestsPerMonth: quota.requestsPerMonth,
          storageGB: parseFloat(quota.storageGB.toString()),
          concurrentRequests: quota.concurrentRequests,
        },
      },
    });
  } catch (error) {
    console.error('[Quota] Error upgrading quota tier:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upgrade quota tier',
    });
  }
};

/**
 * @route   POST /api/v1/quota/reset
 * @desc    Reset quota (for testing or support)
 * @access  Private (Admin only)
 */
export const resetQuota = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Admin check - only administrators can reset quotas
    const isAdmin = await rbacService.hasRole(userId, 'ADMIN');
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can reset quotas',
      });
    }

    const quota = await quotaService.resetQuota(userId);

    res.json({
      success: true,
      message: 'Quota reset successfully',
      data: quota,
    });
  } catch (error) {
    console.error('[Quota] Error resetting quota:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset quota',
    });
  }
};

/**
 * @route   GET /api/v1/quota/check/:endpoint
 * @desc    Check if specific endpoint is within quota limits
 * @access  Private
 */
export const checkEndpointQuota = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { endpoint } = req.params;

    const quotaCheck = await quotaService.checkQuotaLimits(userId, endpoint);

    res.json({
      success: true,
      data: quotaCheck,
    });
  } catch (error) {
    console.error('[Quota] Error checking endpoint quota:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check endpoint quota',
    });
  }
};

/**
 * @route   GET /api/v1/quota/tiers
 * @desc    Get available quota tiers with limits
 * @access  Public
 */
export const getAvailableTiers = async (req: AuthRequest, res: Response) => {
  try {
    const tiers = [
      {
        name: QuotaTier.FREE,
        displayName: 'Free',
        price: 0,
        limits: {
          requestsPerHour: 100,
          requestsPerDay: 1000,
          requestsPerMonth: 10000,
          storageGB: 1,
          concurrentRequests: 5,
        },
        features: [
          'Basic API access',
          '1 GB storage',
          'Community support',
          'Rate limiting',
        ],
      },
      {
        name: QuotaTier.PRO,
        displayName: 'Pro',
        price: 49,
        limits: {
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          requestsPerMonth: 100000,
          storageGB: 100,
          concurrentRequests: 20,
        },
        features: [
          'Advanced API access',
          '100 GB storage',
          'Priority support',
          'Advanced analytics',
          'Webhook integrations',
        ],
      },
      {
        name: QuotaTier.ENTERPRISE,
        displayName: 'Enterprise',
        price: 499,
        limits: {
          requestsPerHour: 10000,
          requestsPerDay: 100000,
          requestsPerMonth: 1000000,
          storageGB: 1000,
          concurrentRequests: 100,
        },
        features: [
          'Unlimited API access',
          '1 TB storage',
          'Dedicated support',
          'Custom integrations',
          'SLA guarantee',
          'Custom rate limits',
        ],
      },
    ];

    res.json({
      success: true,
      data: tiers,
    });
  } catch (error) {
    console.error('[Quota] Error getting tiers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve quota tiers',
    });
  }
};
