/**
 * Quota Middleware
 * Checks quotas before processing requests and includes quota info in response headers
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { QuotaService } from '../services/quota.service';
import { logWarn, logDebug } from '../lib/logger';
import { QuotaFeature } from '../config/quotas.config';

// Mapping of endpoints to quota features
const ENDPOINT_FEATURE_MAP: Record<string, QuotaFeature> = {
  // Earnings endpoints
  'POST /api/v1/earnings': 'earnings',
  'POST /api/v1/earnings/create': 'earnings',

  // Invoice endpoints
  'POST /api/v1/invoices': 'invoices',
  'POST /api/v1/invoices/create': 'invoices',

  // Product endpoints
  'POST /api/v1/products': 'products',
  'POST /api/v1/products/create': 'products',

  // Sales endpoints
  'POST /api/v1/sales': 'sales',
  'POST /api/v1/sales/create': 'sales',

  // Document endpoints (file uploads)
  'POST /api/v1/upload': 'documents',
  'POST /api/v1/documents': 'documents',

  // Customer endpoints
  'POST /api/v1/customers': 'invoices', // Limit customers with invoices
  'POST /api/v1/customers/create': 'invoices',

  // Expense endpoints
  'POST /api/v1/expenses': 'earnings', // Expenses use same quota as earnings
  'POST /api/v1/expenses/create': 'earnings',
};

/**
 * Quota enforcement middleware
 * Checks if user has exceeded quota before allowing request
 */
export const quotaMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip for non-authenticated requests
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return next();
    }

    // Skip for non-quota endpoints
    const endpoint = `${req.method} ${req.path}`;
    const feature = findFeatureForEndpoint(endpoint, req.path);

    if (!feature) {
      return next();
    }

    logDebug('Checking quota', {
      userId: authReq.user.id,
      endpoint,
      feature,
    });

    // Check if quota is exceeded
    const isExceeded = await QuotaService.checkQuota(authReq.user.id, feature);

    if (isExceeded) {
      logWarn('Quota exceeded for request', {
        userId: authReq.user.id,
        endpoint,
        feature,
      });

      return res.status(429).json({
        error: 'Quota Exceeded',
        message: `You have exceeded your ${feature} quota. Please upgrade your plan or wait for the monthly reset.`,
        feature,
        code: 'QUOTA_EXCEEDED',
      });
    }

    // Get usage stats to include in response headers
    const usageStats = await QuotaService.getUsageStats(authReq.user.id, feature);
    if (usageStats) {
      res.setHeader('X-Quota-Limit', usageStats.limit || 'unlimited');
      res.setHeader('X-Quota-Used', usageStats.count);
      res.setHeader('X-Quota-Remaining', Math.max(0, (usageStats.limit || 0) - usageStats.count));
      res.setHeader('X-Quota-Reset', usageStats.resetDate.toISOString());
    }

    return next();
  } catch (error) {
    logDebug('Error in quota middleware', error);
    // Don't block request on error, just log and continue
    return next();
  }
};

/**
 * Middleware to add all quota info to response
 * Attaches quota status to response locals for access in controllers
 */
export const quotaInfoMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return next();
    }

    // Get all usage stats
    const quotaStatus = await QuotaService.getAllUsageStats(authReq.user.id);
    if (quotaStatus) {
      // Attach to response locals for use in controllers
      (res as any).locals = (res as any).locals || {};
      (res as any).locals.quotaStatus = quotaStatus;

      // Add quota warning header if any quota is over 90%
      const warningFeatures = quotaStatus.features.filter((f) => f.percentUsed >= 90);
      if (warningFeatures.length > 0) {
        res.setHeader(
          'X-Quota-Warning',
          warningFeatures.map((f) => `${f.feature}:${Math.round(f.percentUsed)}%`).join(',')
        );
      }
    }

    return next();
  } catch (error) {
    logDebug('Error in quota info middleware', error);
    return next();
  }
};

/**
 * Find the feature for a given endpoint
 * @param endpoint Full endpoint string (e.g., "POST /api/v1/earnings")
 * @param path Request path
 * @returns Feature name or null if not found
 */
function findFeatureForEndpoint(endpoint: string, path: string): QuotaFeature | null {
  // Direct match
  if (ENDPOINT_FEATURE_MAP[endpoint]) {
    return ENDPOINT_FEATURE_MAP[endpoint];
  }

  // Try partial matches
  const pathParts = path.split('/');
  const baseEndpoint = pathParts[pathParts.length - 1];

  if (baseEndpoint === 'earnings') {
    return 'earnings';
  }
  if (baseEndpoint === 'invoices') {
    return 'invoices';
  }
  if (baseEndpoint === 'products') {
    return 'products';
  }
  if (baseEndpoint === 'sales') {
    return 'sales';
  }
  if (baseEndpoint === 'upload' || baseEndpoint === 'documents') {
    return 'documents';
  }
  if (baseEndpoint === 'customers') {
    return 'invoices';
  }
  if (baseEndpoint === 'expenses') {
    return 'earnings';
  }

  return null;
}

/**
 * Custom response interceptor to track usage
 * Should be used after route handler to track successful creations
 */
export const trackUsageOnSuccess = (feature: QuotaFeature) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user?.id) {
        return next();
      }

      // Wrap the send method to track usage after successful response
      const originalSend = res.send;
      res.send = function (data: any) {
        // Only track if request was successful (2xx status)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          QuotaService.trackUsage(authReq.user!.id, feature).catch(() => {
            // Silently fail usage tracking
          });
        }

        return originalSend.call(this, data);
      };

      return next();
    } catch (error) {
      logDebug('Error in track usage middleware', error);
      return next();
    }
  };
};
