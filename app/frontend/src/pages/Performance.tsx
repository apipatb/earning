import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  Gauge,
  HardDrive,
  Loader,
  TrendingUp,
  Wifi,
  XCircle,
} from 'lucide-react';
import { performanceAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  services: Record<string, any>;
}

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
}

interface ErrorLog {
  id: string;
  message: string;
  severity: string;
  endpoint?: string;
  createdAt: string;
}

interface ServiceStatusInfo {
  status: string;
  services: Array<{
    name: string;
    status: string;
    incidents?: number;
  }>;
}

interface DashboardData {
  systemHealth: {
    uptime: number;
    memoryUsage: number;
    cpuCount: number;
  };
  metrics: {
    requestsLastHour: number;
    errorsLastHour: number;
    avgResponseTime: number;
  };
  errors: {
    lastHour: number;
    lastDay: number;
  };
  uptime: {
    lastDay: number;
    lastWeek: number;
  };
}

export default function Performance() {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'errors' | 'status'>('overview');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatusInfo | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'overview') {
        const health = await performanceAPI.getSystemHealth();
        const dashboard = await performanceAPI.getMonitoringDashboard();
        setHealth(health);
        setDashboard(dashboard);
      } else if (activeTab === 'metrics') {
        const metrics = await performanceAPI.getPerformanceMetrics();
        setMetrics(metrics);
      } else if (activeTab === 'errors') {
        const errors = await performanceAPI.getErrorLogs();
        setErrors(errors);
      } else if (activeTab === 'status') {
        const status = await performanceAPI.getServiceStatus();
        setServiceStatus(status);
      }
    } catch (error) {
      notify.error('Error', 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
      case 'degraded_performance':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'down':
      case 'operational_issues':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'fatal':
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'error':
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">System health, metrics, and diagnostics</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <Loader className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['overview', 'metrics', 'errors', 'status'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'overview' && <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> Overview</span>}
            {tab === 'metrics' && <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Metrics</span>}
            {tab === 'errors' && <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Errors</span>}
            {tab === 'status' && <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Status</span>}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
        </div>
      )}

      {!loading && (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && health && dashboard && (
            <div className="space-y-6">
              {/* System Status Banner */}
              <div
                className={`rounded-lg p-6 shadow ${
                  health.status === 'healthy'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {health.status === 'healthy' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                      System Status: {health.status}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Last updated: {new Date(health.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboard.metrics.requestsLastHour}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Requests (last hour)</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mb-2" />
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboard.errors.lastHour}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Errors (last hour)</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboard.metrics.avgResponseTime}ms
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Response Time</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboard.systemHealth.memoryUsage}MB
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Memory Usage</p>
                </div>
              </div>

              {/* System Services */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Services</h2>
                <div className="space-y-3">
                  {Object.entries(health.services).map(([name, service]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <div className="flex items-center gap-3">
                        {service.status === 'healthy' ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{name}</span>
                      </div>
                      <span className={`text-sm font-medium ${service.status === 'healthy' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {service.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uptime */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Uptime</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Last 24 Hours</span>
                      <span className="font-bold text-gray-900 dark:text-white">{dashboard.uptime.lastDay}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Last 7 Days</span>
                      <span className="font-bold text-gray-900 dark:text-white">{dashboard.uptime.lastWeek}%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Server Info</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">Uptime:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.floor(dashboard.systemHealth.uptime / 3600)}h
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">CPUs:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">{dashboard.systemHealth.cpuCount}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {metrics.length === 0 ? (
                <div className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No metrics available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Endpoint
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Response Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {metrics.map((metric) => (
                        <tr key={metric.endpoint} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">{metric.endpoint}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium dark:bg-blue-900 dark:text-blue-200">
                              {metric.method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                metric.statusCode >= 200 && metric.statusCode < 300
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : metric.statusCode >= 400
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}
                            >
                              {metric.statusCode}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{metric.responseTime}ms</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(metric.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <div className="space-y-2">
              {errors.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No errors found</p>
                </div>
              ) : (
                errors.map((error) => (
                  <div key={error.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{error.message}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getSeverityColor(error.severity)}`}>
                            {error.severity}
                          </span>
                        </div>
                        {error.endpoint && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Endpoint: <span className="font-mono">{error.endpoint}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(error.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && serviceStatus && (
            <div className="space-y-6">
              {/* Overall Status */}
              <div
                className={`rounded-lg p-6 shadow border-l-4 ${
                  serviceStatus.status === 'operational'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : serviceStatus.status === 'degraded_performance'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  {serviceStatus.status === 'operational' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <div>
                    <h3 className={`text-lg font-semibold capitalize ${getStatusColor(serviceStatus.status)}`}>
                      {serviceStatus.status}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      All systems operational
                    </p>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviceStatus.services.map((service) => (
                  <div key={service.name} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <div className="flex items-center gap-3 mb-4">
                      {service.status === 'operational' ? (
                        <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                    </div>
                    <p className={`text-sm font-medium ${service.status === 'operational' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {service.status}
                    </p>
                    {service.incidents && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {service.incidents} incidents in last hour
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
