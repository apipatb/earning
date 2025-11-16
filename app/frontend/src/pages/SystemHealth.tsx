import { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import HealthMetrics from '../components/HealthMetrics';
import ServiceStatus from '../components/ServiceStatus';
import HealthAlerts from '../components/HealthAlerts';
import { api } from '../lib/api';

// Type definitions
interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  timestamp: Date;
}

interface ServiceHealth {
  name: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED' | 'UNKNOWN';
  responseTime?: number;
  message?: string;
  details?: any;
}

interface HealthReport {
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED' | 'UNKNOWN';
  timestamp: Date;
  metrics: SystemMetrics;
  services: ServiceHealth[];
  alerts: number;
}

const SystemHealth = () => {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch health data
  const fetchHealthData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setRefreshing(true);
      }

      const response = await api.get('/api/v1/health/metrics');
      setHealthReport(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchHealthData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealthData(false);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Manual refresh
  const handleRefresh = () => {
    fetchHealthData();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-600 bg-green-100';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-100';
      case 'CRITICAL':
        return 'text-red-600 bg-red-100';
      case 'DEGRADED':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="w-6 h-6" />;
      case 'WARNING':
        return <AlertTriangle className="w-6 h-6" />;
      case 'CRITICAL':
        return <XCircle className="w-6 h-6" />;
      default:
        return <Activity className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading health data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-1">
            Monitor system performance and infrastructure status
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Auto-refresh toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Overall Status Card */}
      {healthReport && (
        <div
          className={`p-6 rounded-lg border-2 ${
            healthReport.overall === 'HEALTHY'
              ? 'bg-green-50 border-green-200'
              : healthReport.overall === 'WARNING'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${getStatusColor(healthReport.overall)}`}>
                {getStatusIcon(healthReport.overall)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  System Status: {healthReport.overall}
                </h2>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
                  </div>
                  {healthReport.alerts > 0 && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{healthReport.alerts} active alerts</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Services Summary */}
            <div className="flex items-center space-x-4">
              {healthReport.services.map((service) => (
                <div key={service.name} className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      service.status === 'HEALTHY'
                        ? 'bg-green-500'
                        : service.status === 'WARNING'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm text-gray-700">{service.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {healthReport && (
          <>
            {/* CPU Metric */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">CPU Usage</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    healthReport.metrics.cpu > 80
                      ? 'bg-red-100 text-red-700'
                      : healthReport.metrics.cpu > 60
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {healthReport.metrics.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    healthReport.metrics.cpu > 80
                      ? 'bg-red-500'
                      : healthReport.metrics.cpu > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(healthReport.metrics.cpu, 100)}%` }}
                />
              </div>
            </div>

            {/* Memory Metric */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Memory Usage</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    healthReport.metrics.memory > 85
                      ? 'bg-red-100 text-red-700'
                      : healthReport.metrics.memory > 70
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {healthReport.metrics.memory.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    healthReport.metrics.memory > 85
                      ? 'bg-red-500'
                      : healthReport.metrics.memory > 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(healthReport.metrics.memory, 100)}%` }}
                />
              </div>
            </div>

            {/* Disk Metric */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Disk Usage</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    healthReport.metrics.disk > 90
                      ? 'bg-red-100 text-red-700'
                      : healthReport.metrics.disk > 75
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {healthReport.metrics.disk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    healthReport.metrics.disk > 90
                      ? 'bg-red-500'
                      : healthReport.metrics.disk > 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(healthReport.metrics.disk, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detailed Components */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Health Metrics Chart */}
        <HealthMetrics />

        {/* Service Status */}
        <ServiceStatus services={healthReport?.services || []} />
      </div>

      {/* Health Alerts */}
      <HealthAlerts />
    </div>
  );
};

export default SystemHealth;
