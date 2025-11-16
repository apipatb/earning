import { useState, useEffect } from 'react';
import { Shield, FileText, Download, Filter, Search, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { notify } from '../store/notification.store';
import AuditLogViewer from '../components/AuditLogViewer';
import ComplianceReportGenerator from '../components/ComplianceReportGenerator';

interface AuditLog {
  id: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  errorMsg?: string;
  timestamp: string;
}

interface AuditStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByResource: Record<string, number>;
  actionsByDay: Record<string, number>;
  successRate: number;
  failedActions: number;
  recentActions: AuditLog[];
}

export default function AuditLogs() {
  const [activeTab, setActiveTab] = useState<'logs' | 'compliance' | 'stats'>('logs');
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/audit/stats?days=30', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      notify.error('Error', 'Failed to load audit statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Audit & Compliance
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor system activity, generate compliance reports, and track data access
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('logs')}
            className={`${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Search className="h-4 w-4 mr-2" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`${
              activeTab === 'compliance'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Compliance Reports
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Statistics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'logs' && <AuditLogViewer />}

        {activeTab === 'compliance' && <ComplianceReportGenerator />}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500 dark:text-gray-400">Loading statistics...</div>
              </div>
            ) : stats ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Actions</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stats.totalActions.toLocaleString()}
                        </p>
                      </div>
                      <Shield className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                          {stats.successRate.toFixed(1)}%
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Failed Actions</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                          {stats.failedActions}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                          Last 30 Days
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>

                {/* Actions by Type */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Actions by Type
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.actionsByType).map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {action}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${(count / stats.totalActions) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions by Resource */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Actions by Resource
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.actionsByResource)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([resource, count]) => (
                        <div key={resource} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {resource}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                                style={{
                                  width: `${(count / stats.totalActions) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Recent Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Actions
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Action
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Resource
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {stats.recentActions.map((log) => (
                          <tr key={log.id}>
                            <td className="px-3 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {log.action}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {log.resource}
                            </td>
                            <td className="px-3 py-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  log.status === 'SUCCESS'
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No statistics available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
