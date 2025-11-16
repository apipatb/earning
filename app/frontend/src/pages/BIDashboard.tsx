import { useState, useEffect } from 'react';
import {
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  BarChart3,
  Clock,
  Users,
  Package,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface BIMetrics {
  totalEarnings: number;
  totalSales: number;
  totalInvoices: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  avgHourlyRate: number;
  totalHours: number;
  activeCustomers: number;
  activePlatforms: number;
  activeProducts: number;
  period: string;
}

interface SyncStatus {
  lastSync: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
}

interface ExportConfig {
  dataType: 'fact' | 'dimension' | 'metrics';
  entity: string;
  format: 'json' | 'csv';
  startDate?: string;
  endDate?: string;
}

export default function BIDashboard() {
  const [metrics, setMetrics] = useState<BIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    status: 'idle',
    message: '',
  });
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: '',
  });
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    dataType: 'fact',
    entity: 'earnings',
    format: 'json',
  });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {};

      if (dateRange.start_date) params.start_date = dateRange.start_date;
      if (dateRange.end_date) params.end_date = dateRange.end_date;

      const response = await axios.get(`${API_BASE_URL}/api/v1/bi/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setMetrics(response.data);
      setSyncStatus({
        lastSync: new Date().toISOString(),
        status: 'success',
        message: 'Metrics loaded successfully',
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setSyncStatus({
        lastSync: new Date().toISOString(),
        status: 'error',
        message: 'Failed to load metrics',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {
        data_type: exportConfig.dataType,
        entity: exportConfig.entity,
        format: exportConfig.format,
      };

      if (exportConfig.startDate) params.start_date = exportConfig.startDate;
      if (exportConfig.endDate) params.end_date = exportConfig.endDate;

      const response = await axios.get(`${API_BASE_URL}/api/v1/bi/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${exportConfig.entity}_${exportConfig.dataType}.${exportConfig.format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSyncStatus({
        lastSync: new Date().toISOString(),
        status: 'success',
        message: 'Data exported successfully',
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      setSyncStatus({
        lastSync: new Date().toISOString(),
        status: 'error',
        message: 'Failed to export data',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleRefresh = () => {
    setSyncStatus({
      ...syncStatus,
      status: 'syncing',
      message: 'Refreshing metrics...',
    });
    loadMetrics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading BI Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600" />
            BI Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Business Intelligence ready for Looker & Tableau integration
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={syncStatus.status === 'syncing'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Sync Status */}
      <div className={`p-4 rounded-lg border ${
        syncStatus.status === 'success'
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : syncStatus.status === 'error'
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : syncStatus.status === 'syncing'
          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
          : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-3">
          {syncStatus.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {syncStatus.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
          {syncStatus.status === 'syncing' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
          {syncStatus.status === 'idle' && <Activity className="w-5 h-5 text-gray-600" />}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {syncStatus.message || 'Ready to sync'}
            </p>
            {syncStatus.lastSync && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Date Range Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadMetrics}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* BI Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium opacity-90">Total Revenue</div>
                <DollarSign className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
              <div className="text-xs opacity-90 mt-1">{metrics.period}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium opacity-90">Net Profit</div>
                <TrendingUp className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">${metrics.netProfit.toFixed(2)}</div>
              <div className="text-xs opacity-90 mt-1">Revenue - Expenses</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium opacity-90">Avg Hourly Rate</div>
                <Clock className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">${metrics.avgHourlyRate.toFixed(2)}</div>
              <div className="text-xs opacity-90 mt-1">{metrics.totalHours.toFixed(1)} hours total</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium opacity-90">Active Entities</div>
                <BarChart3 className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{metrics.activePlatforms + metrics.activeProducts}</div>
              <div className="text-xs opacity-90 mt-1">Platforms & Products</div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Breakdown</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Earnings</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${metrics.totalEarnings.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sales</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${metrics.totalSales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Invoices</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${metrics.totalInvoices.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Expenses</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -${metrics.totalExpenses.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Entities</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Customers</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {metrics.activeCustomers}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Platforms</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {metrics.activePlatforms}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Products</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {metrics.activeProducts}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">BI Integration</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Looker Ready
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Tableau Compatible
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  CSV/JSON Export
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Real-time Metrics
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Data Wizard */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Export Data for BI Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Type
            </label>
            <select
              value={exportConfig.dataType}
              onChange={(e) => setExportConfig({ ...exportConfig, dataType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="fact">Fact Table</option>
              <option value="dimension">Dimension Table</option>
              <option value="metrics">Metrics</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entity
            </label>
            <select
              value={exportConfig.entity}
              onChange={(e) => setExportConfig({ ...exportConfig, entity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {exportConfig.dataType === 'fact' && (
                <>
                  <option value="earnings">Earnings</option>
                  <option value="sales">Sales</option>
                  <option value="invoices">Invoices</option>
                </>
              )}
              {exportConfig.dataType === 'dimension' && (
                <>
                  <option value="user">User</option>
                  <option value="product">Product</option>
                  <option value="customer">Customer</option>
                  <option value="date">Date</option>
                </>
              )}
              {exportConfig.dataType === 'metrics' && (
                <option value="summary">Summary Metrics</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <select
              value={exportConfig.format}
              onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={exportConfig.startDate || ''}
              onChange={(e) => setExportConfig({ ...exportConfig, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={exportConfig.endDate || ''}
              onChange={(e) => setExportConfig({ ...exportConfig, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              {exportConfig.format === 'json' ? (
                <FileJson className="w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
              Export {exportConfig.entity} as {exportConfig.format.toUpperCase()}
            </>
          )}
        </button>
      </div>

      {/* Integration Instructions */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          BI Tool Integration Guide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Looker Integration
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Use the LookML metadata API endpoint</li>
              <li>Connect via REST API with your auth token</li>
              <li>Access fact and dimension tables</li>
              <li>Configure explores and joins</li>
            </ol>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Tableau Integration
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Use Tableau Web Data Connector</li>
              <li>Point to the schema endpoint</li>
              <li>Authenticate with your bearer token</li>
              <li>Import fact and dimension tables</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
