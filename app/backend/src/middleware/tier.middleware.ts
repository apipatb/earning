import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TIER_LIMITS = {
  free: {
    maxPlatforms: 3,
    features: {
      basicTracking: true,
      dashboard: true,
      platformManagement: true,
    },
  },
  pro: {
    maxPlatforms: -1, // unlimited
    features: {
      basicTracking: true,
      dashboard: true,
      platformManagement: true,
      advancedAnalytics: true,
      goalsAndForecasting: true,
      csvExport: true,
    },
  },
  business: {
    maxPlatforms: -1, // unlimited
    features: {
      basicTracking: true,
      dashboard: true,
      platformManagement: true,
      advancedAnalytics: true,
      goalsAndForecasting: true,
      csvExport: true,
      teamCollaboration: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

// Middleware to attach subscription to request
export const attachSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next();
    }

    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // Create default subscription if it doesn't exist
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          tier: 'free',
        },
      });
    }

    // Attach to request
    (req as any).subscription = subscription;
    (req as any).tier = subscription.tier;
    (req as any).tierLimits = TIER_LIMITS[subscription.tier as keyof typeof TIER_LIMITS];

    next();
  } catch (error) {
    next(error);
  }
};

// Check platform limit
export const checkPlatformLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];

    if (tierLimits.maxPlatforms === -1) {
      // Unlimited
      return next();
    }

    const platformCount = await prisma.platform.count({
      where: {
        userId,
        isActive: true,
      },
    });

    if (platformCount >= tierLimits.maxPlatforms) {
      return res.status(403).json({
        error: `Platform limit reached for ${tier} tier`,
        limit: tierLimits.maxPlatforms,
        current: platformCount,
        upgrade: tier === 'free' ? 'Upgrade to Pro for unlimited platforms' : 'Upgrade to Business',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check feature access
export const requireFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tier = (req as any).tier;
      const tierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];

      if (!tierLimits.features[feature as keyof typeof tierLimits.features]) {
        return res.status(403).json({
          error: `Feature '${feature}' not available for ${tier} tier`,
          requiredTier: feature === 'teamCollaboration' || feature === 'apiAccess' ? 'business' : 'pro',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Require paid tier (pro or business)
export const requirePaidTier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tier = (req as any).tier;

    if (tier === 'free') {
      return res.status(403).json({
        error: 'This feature requires a paid subscription',
        requiredTier: 'pro',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  attachSubscription,
  checkPlatformLimit,
  requireFeature,
  requirePaidTier,
};
