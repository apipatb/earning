import { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Download, RefreshCw } from 'lucide-react';
import { notify } from '../store/notification.store';

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

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  hasMore: boolean;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const offset = (page - 1) * limit;

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: new Date(filters.startDate).toISOString() }),
        ...(filters.endDate && { endDate: new Date(filters.endDate).toISOString() }),
      });

      const endpoint = searchQuery
        ? `/api/v1/audit/logs/search?${params}&query=${encodeURIComponent(searchQuery)}`
        : `/api/v1/audit/logs?${params}`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load audit logs');
      }

      const data: AuditLogsResponse = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      notify.error('Error', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/compliance/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportType: 'ACTIVITY',
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export logs');
      }

      notify.success('Success', 'Activity log export generated successfully');
      loadLogs();
    } catch (error) {
      notify.error('Error', 'Failed to export logs');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'READ':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'LOGIN':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'LOGOUT':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      case 'EXPORT':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                showFilters
                  ? 'border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800'
              } hover:bg-gray-50 dark:hover:bg-gray-700`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={loadLogs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="READ">READ</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="EXPORT">EXPORT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resource
              </label>
              <input
                type="text"
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                placeholder="e.g., earnings"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Loading audit logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {log.resource}
                        {log.resourceId && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                            (ID: {log.resourceId.substring(0, 8)}...)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {log.user?.email || log.userId.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {log.ipAddress || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  <span className="inline-flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Audit Log Details
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Action</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Resource</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.resource}</p>
                </div>

                {selectedLog.resourceId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Resource ID</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                      {selectedLog.resourceId}
                    </p>
                  </div>
                )}

                {selectedLog.user && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">User</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedLog.user.name || selectedLog.user.email}
                    </p>
                  </div>
                )}

                {selectedLog.ipAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">IP Address</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                      {selectedLog.ipAddress}
                    </p>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">User Agent</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}

                {selectedLog.changes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Changes</label>
                    <pre className="mt-1 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.errorMsg && (
                  <div>
                    <label className="text-sm font-medium text-red-500 dark:text-red-400">Error Message</label>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">{selectedLog.errorMsg}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <p className="mt-1">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedLog.status === 'SUCCESS'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {selectedLog.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
