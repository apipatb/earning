/**
 * Quota Management Routes
 * Endpoints for viewing quotas, usage stats, and managing subscriptions
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth.middleware';
import { QuotaService } from '../services/quota.service';
import { quotaConfig, QuotaTier } from '../config/quotas.config';
import { logInfo, logError, logWarn } from '../lib/logger';
import prisma from '../lib/prisma';

const router = Router();

// All quota endpoints require authentication
router.use(authenticate);

/**
 * GET /api/v1/quotas
 * Get current quota configuration for the user's tier
 */
router.get('/quotas', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const tier = (user.tier as QuotaTier) || 'free';
    const tierConfig = quotaConfig[tier];

    logInfo('Quota configuration retrieved', { userId, tier });

    res.json({
      tier,
      quotas: {
        earnings: tierConfig.earnings,
        invoices: tierConfig.invoices,
        products: tierConfig.products,
        sales: tierConfig.sales,
        documents: tierConfig.documents,
        websocket_connections: tierConfig.websocket_connections,
        api_rate_limit: tierConfig.api_rate_limit,
        concurrent_requests: tierConfig.concurrent_requests,
        storage_gb: tierConfig.storage_gb,
      },
    });
  } catch (error) {
    logError('Error fetching quotas', error as Error);
    res.status(500).json({
      error: 'Failed to fetch quotas',
    });
  }
});

/**
 * GET /api/v1/usage
 * Get current usage statistics for all features
 */
router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const usageStatus = await QuotaService.getAllUsageStats(userId);

    if (!usageStatus) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    logInfo('Usage statistics retrieved', { userId });

    res.json({
      tier: usageStatus.tier,
      features: usageStatus.features.map((feature) => ({
        feature: feature.feature,
        count: feature.count,
        limit: feature.limit,
        percentUsed: Math.round(feature.percentUsed * 100) / 100,
        isExceeded: feature.isExceeded,
        resetDate: feature.resetDate,
      })),
      isAnyQuotaExceeded: usageStatus.isAnyQuotaExceeded,
      totalPercentUsed: Math.round(usageStatus.totalPercentUsed * 100) / 100,
    });
  } catch (error) {
    logError('Error fetching usage', error as Error);
    res.status(500).json({
      error: 'Failed to fetch usage statistics',
    });
  }
});

/**
 * GET /api/v1/usage/:feature
 * Get usage statistics for a specific feature
 */
router.get('/usage/:feature', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const feature = req.params.feature as any;

    const usageStats = await QuotaService.getUsageStats(userId, feature);

    if (!usageStats) {
      return res.status(404).json({
        error: 'Feature not found',
      });
    }

    logInfo('Feature usage retrieved', { userId, feature });

    res.json({
      feature: usageStats.feature,
      count: usageStats.count,
      limit: usageStats.limit,
      percentUsed: Math.round(usageStats.percentUsed * 100) / 100,
      isExceeded: usageStats.isExceeded,
      resetDate: usageStats.resetDate,
    });
  } catch (error) {
    logError('Error fetching feature usage', error as Error);
    res.status(500).json({
      error: 'Failed to fetch feature usage',
    });
  }
});

/**
 * POST /api/v1/upgrade-tier
 * Upgrade user subscription tier
 */
router.post('/upgrade-tier', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tier } = req.body;

    // Validate tier
    if (!['free', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        error: 'Invalid tier',
        message: 'Tier must be one of: free, pro, enterprise',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const currentTier = user.tier as QuotaTier;
    if (currentTier === tier) {
      return res.status(400).json({
        error: 'User already on this tier',
      });
    }

    // In production, this would integrate with Stripe/payment system
    // For now, we'll just update the tier
    await QuotaService.upgradeTier(userId, tier as QuotaTier);

    logInfo('User tier upgraded', { userId, fromTier: currentTier, toTier: tier });

    res.json({
      message: 'Tier upgraded successfully',
      tier,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    logError('Error upgrading tier', error as Error);
    res.status(500).json({
      error: 'Failed to upgrade tier',
    });
  }
});

/**
 * GET /api/v1/subscription
 * Get subscription details for current user
 */
router.get('/subscription', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    logInfo('Subscription retrieved', { userId });

    res.json({
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate,
      createdAt: subscription.createdAt,
    });
  } catch (error) {
    logError('Error fetching subscription', error as Error);
    res.status(500).json({
      error: 'Failed to fetch subscription',
    });
  }
});

/**
 * PUT /api/v1/admin/quotas/:userId
 * Admin endpoint to adjust quotas for a user
 */
router.put('/admin/quotas/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const adminUserId = req.user!.id;
    const targetUserId = req.params.userId;
    const { tier, feature, limit } = req.body;

    // Check if requester is admin (would need admin role check in production)
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.tier !== 'enterprise') {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only enterprise users can adjust quotas',
      });
    }

    // If updating tier
    if (tier) {
      if (!['free', 'pro', 'enterprise'].includes(tier)) {
        return res.status(400).json({
          error: 'Invalid tier',
        });
      }

      await QuotaService.upgradeTier(targetUserId, tier as QuotaTier);
    }

    // If updating specific feature limit
    if (feature && limit !== undefined) {
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);

      await prisma.usage.upsert({
        where: {
          userId_feature_resetDate: {
            userId: targetUserId,
            feature,
            resetDate,
          },
        },
        create: {
          userId: targetUserId,
          feature,
          count: 0,
          limit,
          resetDate,
        },
        update: {
          limit,
        },
      });
    }

    logInfo('Quota adjusted by admin', {
      adminId: adminUserId,
      targetUserId,
      tier,
      feature,
      limit,
    });

    res.json({
      message: 'Quota adjusted successfully',
      userId: targetUserId,
      tier,
      feature,
      limit,
    });
  } catch (error) {
    logError('Error adjusting quotas', error as Error);
    res.status(500).json({
      error: 'Failed to adjust quotas',
    });
  }
});

/**
 * DELETE /api/v1/admin/quotas/:userId/:feature
 * Admin endpoint to reset a user's feature quota
 */
router.delete('/admin/quotas/:userId/:feature', async (req: AuthRequest, res: Response) => {
  try {
    const adminUserId = req.user!.id;
    const targetUserId = req.params.userId;
    const feature = req.params.feature;

    // Check if requester is admin
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.tier !== 'enterprise') {
      return res.status(403).json({
        error: 'Unauthorized',
      });
    }

    // Delete usage records for this feature
    const deleted = await prisma.usage.deleteMany({
      where: {
        userId: targetUserId,
        feature,
      },
    });

    logInfo('Feature quota reset by admin', {
      adminId: adminUserId,
      targetUserId,
      feature,
      deletedCount: deleted.count,
    });

    res.json({
      message: 'Feature quota reset successfully',
      userId: targetUserId,
      feature,
      deletedCount: deleted.count,
    });
  } catch (error) {
    logError('Error resetting quota', error as Error);
    res.status(500).json({
      error: 'Failed to reset quota',
    });
  }
});

export default router;
