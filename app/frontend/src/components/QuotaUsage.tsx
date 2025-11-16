import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  Database,
} from 'lucide-react';

interface UsageStats {
  hourly: number;
  daily: number;
  monthly: number;
  concurrent: number;
  storage: number;
}

interface QuotaLimits {
  requestsPerHour: number;
  requestsPerDay: number;
  requestsPerMonth: number;
  storageGB: number;
  concurrentRequests: number;
}

interface QuotaData {
  tier: string;
  limits: QuotaLimits;
  remaining: UsageStats;
  percentageUsed: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  violations: number;
  resetAt: string;
}

interface QuotaUsageProps {
  showDetails?: boolean;
  compact?: boolean;
}

const QuotaUsage: React.FC<QuotaUsageProps> = ({ showDetails = true, compact = false }) => {
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotaData();

    // Refresh every minute
    const interval = setInterval(fetchQuotaData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuotaData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/quota/report', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quota data');
      }

      const data = await response.json();
      setQuotaData(data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching quota data:', err);
      setError('Failed to load quota information');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (percentage >= 75) return <Activity className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimeUntilReset = (resetAt: string): string => {
    const now = new Date();
    const reset = new Date(resetAt);
    const diff = reset.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !quotaData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error || 'Unable to load quota data'}</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-gray-900 dark:text-white">API Usage</span>
          </div>
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
            {quotaData.tier}
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Hourly</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.round(quotaData.percentageUsed.hourly)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(quotaData.percentageUsed.hourly)}`}
                style={{ width: `${Math.min(quotaData.percentageUsed.hourly, 100)}%` }}
              ></div>
            </div>
          </div>

          {quotaData.violations > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span>{quotaData.violations} violations</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Quota Usage
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current tier: <span className="font-medium text-blue-600 dark:text-blue-400">{quotaData.tier}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Resets in {formatTimeUntilReset(quotaData.resetAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="p-6 space-y-6">
        {/* Hourly Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(quotaData.percentageUsed.hourly)}
              <span className="font-medium text-gray-900 dark:text-white">Hourly Requests</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(quotaData.limits.requestsPerHour - quotaData.remaining.hourly)}
              </span>
              {' / '}
              {formatNumber(quotaData.limits.requestsPerHour)}
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(quotaData.percentageUsed.hourly)}`}
              style={{ width: `${Math.min(quotaData.percentageUsed.hourly, 100)}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {quotaData.remaining.hourly} requests remaining
          </div>
        </div>

        {/* Daily Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(quotaData.percentageUsed.daily)}
              <span className="font-medium text-gray-900 dark:text-white">Daily Requests</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(quotaData.limits.requestsPerDay - quotaData.remaining.daily)}
              </span>
              {' / '}
              {formatNumber(quotaData.limits.requestsPerDay)}
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(quotaData.percentageUsed.daily)}`}
              style={{ width: `${Math.min(quotaData.percentageUsed.daily, 100)}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {quotaData.remaining.daily} requests remaining
          </div>
        </div>

        {/* Monthly Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(quotaData.percentageUsed.monthly)}
              <span className="font-medium text-gray-900 dark:text-white">Monthly Requests</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(quotaData.limits.requestsPerMonth - quotaData.remaining.monthly)}
              </span>
              {' / '}
              {formatNumber(quotaData.limits.requestsPerMonth)}
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(quotaData.percentageUsed.monthly)}`}
              style={{ width: `${Math.min(quotaData.percentageUsed.monthly, 100)}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {quotaData.remaining.monthly} requests remaining
          </div>
        </div>

        {showDetails && (
          <>
            {/* Storage */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Storage</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {quotaData.remaining.storage.toFixed(2)} GB
                  </span>
                  {' / '}
                  {quotaData.limits.storageGB} GB
                </div>
              </div>
            </div>

            {/* Concurrent Requests */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Concurrent Requests</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {quotaData.limits.concurrentRequests}
                  </span>
                  {' max'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Violations Warning */}
        {quotaData.violations > 0 && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {quotaData.violations} Rate Limit Violation{quotaData.violations > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                You have exceeded your rate limits. Consider upgrading your plan.
              </p>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {quotaData.tier === 'FREE' && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Need more requests?
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Upgrade to Pro for 10x more API calls and storage
              </p>
            </div>
            <a
              href="/billing"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Upgrade
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotaUsage;
