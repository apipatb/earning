import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  User,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { api } from '../lib/api';

interface HealthAlert {
  id: string;
  service: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED' | 'UNKNOWN';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  details?: any;
  triggeredAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const HealthAlerts = () => {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/health/alerts', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          active: activeOnly,
        },
      });

      setAlerts(response.data.alerts || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [pagination.page, pagination.limit, activeOnly]);

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const matchesSearch =
      searchQuery === '' ||
      alert.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  // Resolve alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      setResolving(alertId);
      await api.post(`/api/v1/health/alerts/${alertId}/resolve`, {
        resolution: resolutionNotes || undefined,
      });
      setResolutionNotes('');
      setShowResolveModal(false);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    } finally {
      setResolving(null);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ERROR':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'ERROR':
        return <XCircle className="w-5 h-5" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5" />;
      case 'INFO':
        return <Info className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  // Calculate duration
  const calculateDuration = (triggeredAt: string, resolvedAt?: string) => {
    const start = new Date(triggeredAt).getTime();
    const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
    const duration = end - start;

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Health Alerts</h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Active/All toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveOnly(true)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                activeOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveOnly(false)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                !activeOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Severity filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="ERROR">Error</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading alerts...</div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
            <div className="text-lg font-medium text-gray-900">No alerts found</div>
            <div className="text-sm text-gray-600">System is running smoothly</div>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-2 rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Severity Icon */}
                  <div className="mt-1">{getSeverityIcon(alert.severity)}</div>

                  {/* Alert Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{alert.service}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>

                    {/* Alert Metadata */}
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Triggered: {formatDate(alert.triggeredAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Duration: {calculateDuration(alert.triggeredAt, alert.resolvedAt)}</span>
                      </div>
                    </div>

                    {/* Details */}
                    {alert.details && (
                      <div className="mt-3 p-2 bg-white/50 rounded text-xs font-mono overflow-auto max-h-20">
                        <pre>{JSON.stringify(alert.details, null, 2)}</pre>
                      </div>
                    )}

                    {/* Resolution Info */}
                    {alert.resolvedAt && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="flex items-center space-x-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="font-medium">
                            Resolved: {formatDate(alert.resolvedAt)}
                          </span>
                          {alert.resolvedBy && (
                            <>
                              <span>by</span>
                              <User className="w-3 h-3" />
                              <span>{alert.resolvedBy}</span>
                            </>
                          )}
                        </div>
                        {alert.resolution && (
                          <p className="text-xs text-gray-600 mt-1">{alert.resolution}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolve Button */}
                {!alert.resolvedAt && (
                  <button
                    onClick={() => {
                      setResolving(alert.id);
                      setShowResolveModal(true);
                    }}
                    disabled={resolving === alert.id}
                    className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            alerts
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && resolving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Resolve Alert</h3>
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolving(null);
                  setResolutionNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes (Optional)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add notes about how this alert was resolved..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolving(null);
                  setResolutionNotes('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAlert(resolving)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Resolve Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthAlerts;
