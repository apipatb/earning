/**
 * Quota Configuration by Tier
 * Defines API limits and feature quotas for each subscription tier
 */

export type QuotaTier = 'free' | 'pro' | 'enterprise';
export type QuotaFeature = 'earnings' | 'invoices' | 'products' | 'sales' | 'documents' | 'websocket_connections';

export interface FeatureQuota {
  limit: number | null; // null = unlimited
  resetPeriod: 'monthly' | 'yearly' | 'never';
  description: string;
}

export interface TierQuotas {
  earnings: FeatureQuota;
  invoices: FeatureQuota;
  products: FeatureQuota;
  sales: FeatureQuota;
  documents: FeatureQuota;
  websocket_connections: FeatureQuota;
  api_rate_limit: {
    requests_per_minute: number;
    description: string;
  };
  concurrent_requests: number;
  storage_gb: number; // Storage in GB
}

export interface QuotaConfig {
  free: TierQuotas;
  pro: TierQuotas;
  enterprise: TierQuotas;
}

// Quota limits by tier
export const quotaConfig: QuotaConfig = {
  free: {
    earnings: {
      limit: 100,
      resetPeriod: 'monthly',
      description: 'Max 100 earnings records per month',
    },
    invoices: {
      limit: 10,
      resetPeriod: 'monthly',
      description: 'Max 10 invoices per month',
    },
    products: {
      limit: 5,
      resetPeriod: 'never',
      description: 'Max 5 products total',
    },
    sales: {
      limit: 50,
      resetPeriod: 'monthly',
      description: 'Max 50 sales per month',
    },
    documents: {
      limit: 5,
      resetPeriod: 'monthly',
      description: 'Max 5 documents per month',
    },
    websocket_connections: {
      limit: 1,
      resetPeriod: 'never',
      description: 'Max 1 concurrent WebSocket connection',
    },
    api_rate_limit: {
      requests_per_minute: 30,
      description: '30 requests per minute',
    },
    concurrent_requests: 5,
    storage_gb: 1,
  },

  pro: {
    earnings: {
      limit: 1000,
      resetPeriod: 'monthly',
      description: 'Max 1000 earnings records per month',
    },
    invoices: {
      limit: 100,
      resetPeriod: 'monthly',
      description: 'Max 100 invoices per month',
    },
    products: {
      limit: 50,
      resetPeriod: 'never',
      description: 'Max 50 products total',
    },
    sales: {
      limit: 500,
      resetPeriod: 'monthly',
      description: 'Max 500 sales per month',
    },
    documents: {
      limit: 50,
      resetPeriod: 'monthly',
      description: 'Max 50 documents per month',
    },
    websocket_connections: {
      limit: 5,
      resetPeriod: 'never',
      description: 'Max 5 concurrent WebSocket connections',
    },
    api_rate_limit: {
      requests_per_minute: 100,
      description: '100 requests per minute',
    },
    concurrent_requests: 20,
    storage_gb: 10,
  },

  enterprise: {
    earnings: {
      limit: null,
      resetPeriod: 'never',
      description: 'Unlimited earnings records',
    },
    invoices: {
      limit: null,
      resetPeriod: 'never',
      description: 'Unlimited invoices',
    },
    products: {
      limit: null,
      resetPeriod: 'never',
      description: 'Unlimited products',
    },
    sales: {
      limit: null,
      resetPeriod: 'never',
      description: 'Unlimited sales',
    },
    documents: {
      limit: null,
      resetPeriod: 'never',
      description: 'Unlimited documents',
    },
    websocket_connections: {
      limit: null,
      resetPeriod: 'never',
      description: 'Unlimited concurrent WebSocket connections',
    },
    api_rate_limit: {
      requests_per_minute: 1000,
      description: '1000 requests per minute (contact support for higher limits)',
    },
    concurrent_requests: 100,
    storage_gb: 1000,
  },
};

/**
 * Get quota configuration for a specific tier
 * @param tier The subscription tier
 * @returns Quota configuration for the tier
 */
export function getQuotaForTier(tier: QuotaTier): TierQuotas {
  return quotaConfig[tier] || quotaConfig.free;
}

/**
 * Get limit for a specific feature and tier
 * @param tier The subscription tier
 * @param feature The feature to get limit for
 * @returns The limit (null if unlimited)
 */
export function getFeatureLimit(tier: QuotaTier, feature: QuotaFeature): number | null {
  const tierQuota = getQuotaForTier(tier);
  const featureQuota = tierQuota[feature] as FeatureQuota | undefined;
  return featureQuota?.limit ?? null;
}

/**
 * Check if a feature is unlimited for a tier
 * @param tier The subscription tier
 * @param feature The feature to check
 * @returns True if unlimited
 */
export function isFeatureUnlimited(tier: QuotaTier, feature: QuotaFeature): boolean {
  return getFeatureLimit(tier, feature) === null;
}

/**
 * Get reset period for a feature quota
 * @param tier The subscription tier
 * @param feature The feature to get reset period for
 * @returns The reset period
 */
export function getResetPeriod(tier: QuotaTier, feature: QuotaFeature): 'monthly' | 'yearly' | 'never' {
  const tierQuota = getQuotaForTier(tier);
  const featureQuota = tierQuota[feature] as FeatureQuota | undefined;
  return featureQuota?.resetPeriod ?? 'never';
}
