import { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Layers,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api';

interface ServiceHealth {
  name: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED' | 'UNKNOWN';
  responseTime?: number;
  message?: string;
  details?: any;
}

interface ServiceStatusData {
  id: string;
  name: string;
  type: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED' | 'UNKNOWN';
  responseTime?: number;
  lastCheck: string;
  uptime: number;
  errorCount: number;
  metadata?: any;
  endpoint?: string;
  version?: string;
}

interface Props {
  services: ServiceHealth[];
}

const ServiceStatus = ({ services: initialServices }: Props) => {
  const [services, setServices] = useState<ServiceStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Fetch service status
  const fetchServiceStatus = async () => {
    try {
      const response = await api.get('/api/v1/health/services');
      setServices(response.data);
    } catch (error) {
      console.error('Failed to fetch service status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceStatus();
    const interval = setInterval(fetchServiceStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Get service icon
  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'database':
        return <Database className="w-5 h-5" />;
      case 'redis':
        return <Layers className="w-5 h-5" />;
      case 'bullmq':
        return <Zap className="w-5 h-5" />;
      case 'api':
        return <Server className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'CRITICAL':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'DEGRADED':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'CRITICAL':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  // Format response time
  const formatResponseTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format uptime
  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  // Toggle service expansion
  const toggleService = (serviceName: string) => {
    setExpandedService(expandedService === serviceName ? null : serviceName);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Service Health</h2>
        </div>
        <div className="text-sm text-gray-600">
          {services.filter((s) => s.status === 'HEALTHY').length} / {services.length} healthy
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading services...</div>
          </div>
        ) : services.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">No services available</div>
          </div>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              className={`border-2 rounded-lg overflow-hidden transition-all ${getStatusColor(
                service.status
              )}`}
            >
              {/* Service Header */}
              <div
                className="p-4 cursor-pointer hover:opacity-80"
                onClick={() => toggleService(service.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(service.status)}`}>
                      {getServiceIcon(service.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-600">{service.type}</span>
                        {service.version && (
                          <span className="text-xs text-gray-600">v{service.version}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Response Time */}
                    {service.responseTime !== undefined && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatResponseTime(service.responseTime)}
                        </div>
                        <div className="text-xs text-gray-600">response</div>
                      </div>
                    )}

                    {/* Uptime */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatUptime(service.uptime)}
                      </div>
                      <div className="text-xs text-gray-600">uptime</div>
                    </div>

                    {/* Status Icon */}
                    {getStatusIcon(service.status)}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedService === service.name && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Last Check */}
                    <div className="flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-600">Last Check</div>
                        <div className="text-sm text-gray-900">
                          {new Date(service.lastCheck).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Error Count */}
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-600">Error Count</div>
                        <div className="text-sm text-gray-900">{service.errorCount}</div>
                      </div>
                    </div>

                    {/* Endpoint */}
                    {service.endpoint && (
                      <div className="col-span-2 flex items-start space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-xs text-gray-600">Endpoint</div>
                          <div className="text-sm text-gray-900 font-mono break-all">
                            {service.endpoint}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {service.metadata && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-600 mb-2">Additional Details</div>
                        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-900 overflow-auto max-h-40">
                          <pre>{JSON.stringify(service.metadata, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {services.filter((s) => s.status === 'HEALTHY').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {services.filter((s) => s.status === 'WARNING').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Warning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {services.filter((s) => s.status === 'CRITICAL').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {services.filter((s) => s.status === 'UNKNOWN').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Unknown</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceStatus;
