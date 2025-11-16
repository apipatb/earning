import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Crown,
  Zap,
  Database,
  Clock,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import QuotaUsage from '../components/QuotaUsage';

interface UsageHistory {
  timestamp: string;
  endpoint: string;
  count: number;
  errorCount: number;
  averageResponseTime: number | null;
}

interface Violation {
  id: string;
  endpoint: string;
  timestamp: string;
  action: string;
  limitExceeded: string;
  attemptedCount: number;
}

interface TopEndpoint {
  endpoint: string;
  method: string;
  count: number;
  errorRate: number;
  averageResponseTime: number | null;
}

interface QuotaTier {
  name: string;
  displayName: string;
  price: number;
  limits: {
    requestsPerHour: number;
    requestsPerDay: number;
    requestsPerMonth: number;
    storageGB: number;
    concurrentRequests: number;
  };
  features: string[];
}

const ApiUsage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'violations' | 'endpoints' | 'tiers'>('overview');
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>([]);
  const [quotaTiers, setQuotaTiers] = useState<QuotaTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'HOUR' | 'DAY' | 'MONTH'>('DAY');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [historyRes, violationsRes, endpointsRes, tiersRes] = await Promise.all([
        fetch(`/api/v1/quota/history?period=${period}&limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/quota/violations?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/quota/top-endpoints?period=${period}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/quota/tiers'),
      ]);

      const historyData = await historyRes.json();
      const violationsData = await violationsRes.json();
      const endpointsData = await endpointsRes.json();
      const tiersData = await tiersRes.json();

      setUsageHistory(historyData.data?.records || []);
      setViolations(violationsData.data || []);
      setTopEndpoints(endpointsData.data?.endpoints || []);
      setQuotaTiers(tiersData.data || []);
    } catch (error) {
      console.error('Error fetching API usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/quota/report', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-usage-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getActionBadgeColor = (action: string): string => {
    switch (action) {
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'BLOCK':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'THROTTLE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            API Usage & Quota
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor your API usage, quota limits, and rate limit violations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData()}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'history', label: 'Usage History', icon: Clock },
            { id: 'violations', label: 'Violations', icon: AlertTriangle },
            { id: 'endpoints', label: 'Top Endpoints', icon: BarChart3 },
            { id: 'tiers', label: 'Quota Tiers', icon: Crown },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <QuotaUsage showDetails={true} />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests (Today)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(usageHistory.reduce((sum, h) => sum + h.count, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Violations</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {violations.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Zap className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {usageHistory.length > 0
                        ? Math.round(
                            usageHistory.reduce(
                              (sum, h) => sum + (h.averageResponseTime || 0),
                              0
                            ) / usageHistory.length
                          )
                        : 0}
                      ms
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Usage History
                </h2>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="HOUR">Hourly</option>
                  <option value="DAY">Daily</option>
                  <option value="MONTH">Monthly</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                  <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
                </div>
              ) : usageHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No usage history available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usageHistory.map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {record.endpoint}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(record.timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatNumber(record.count)} requests
                        </p>
                        {record.errorCount > 0 && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {record.errorCount} errors
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Violations Tab */}
        {activeTab === 'violations' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Rate Limit Violations
              </h2>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                  <p className="text-gray-600 dark:text-gray-400">Loading violations...</p>
                </div>
              ) : violations.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-gray-600 dark:text-gray-400">No violations found!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    You're staying within your rate limits
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {violations.map((violation) => (
                    <div
                      key={violation.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getActionBadgeColor(
                                violation.action
                              )}`}
                            >
                              {violation.action}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(violation.timestamp)}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {violation.endpoint}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Limit exceeded: {violation.limitExceeded.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {violation.attemptedCount} attempts
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Top Endpoints by Usage
                </h2>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="HOUR">Last Hour</option>
                  <option value="DAY">Last Day</option>
                  <option value="MONTH">Last Month</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                  <p className="text-gray-600 dark:text-gray-400">Loading endpoints...</p>
                </div>
              ) : topEndpoints.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No endpoint data available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topEndpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                              {endpoint.method}
                            </span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {endpoint.endpoint}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>{formatNumber(endpoint.count)} requests</span>
                            <span>
                              Error rate: {(endpoint.errorRate * 100).toFixed(1)}%
                            </span>
                            {endpoint.averageResponseTime && (
                              <span>
                                Avg: {Math.round(endpoint.averageResponseTime)}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quota Tiers Tab */}
        {activeTab === 'tiers' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quotaTiers.map((tier) => (
              <div
                key={tier.name}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                  tier.name === 'PRO'
                    ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                    : ''
                }`}
              >
                {tier.name === 'PRO' && (
                  <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className={`w-6 h-6 ${
                      tier.name === 'ENTERPRISE' ? 'text-yellow-500' :
                      tier.name === 'PRO' ? 'text-blue-500' :
                      'text-gray-400'
                    }`} />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tier.displayName}
                    </h3>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      ${tier.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/month</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Requests/hour
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatNumber(tier.limits.requestsPerHour)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Requests/day
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatNumber(tier.limits.requestsPerDay)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Storage</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {tier.limits.storageGB} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Concurrent
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {tier.limits.concurrentRequests}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <Zap className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/billing')}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      tier.name === 'PRO'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    }`}
                  >
                    {tier.price === 0 ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiUsage;
