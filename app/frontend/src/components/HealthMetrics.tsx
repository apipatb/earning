import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Activity, Server, HardDrive, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../lib/api';

interface MetricData {
  id: string;
  metric: 'CPU' | 'MEMORY' | 'DISK' | 'API_LATENCY' | 'RESPONSE_TIME' | 'QUEUE_DEPTH' | 'CACHE_HIT_RATE';
  value: number;
  threshold?: number;
  unit: string;
  timestamp: string;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}

const HealthMetrics = () => {
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'CPU' | 'MEMORY' | 'DISK'>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [loading, setLoading] = useState(true);

  // Fetch metrics history
  const fetchMetricsHistory = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '6h':
          startDate.setHours(startDate.getHours() - 6);
          break;
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
      }

      const response = await api.get('/api/v1/health/metrics/history', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 100,
        },
      });

      setMetricsData(response.data);

      // Transform data for charts
      const dataByTimestamp: { [key: string]: ChartDataPoint } = {};

      response.data.forEach((metric: MetricData) => {
        const timestamp = new Date(metric.timestamp).toISOString();
        const time = new Date(metric.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        if (!dataByTimestamp[timestamp]) {
          dataByTimestamp[timestamp] = {
            timestamp,
            time,
            cpu: 0,
            memory: 0,
            disk: 0,
          };
        }

        if (metric.metric === 'CPU') {
          dataByTimestamp[timestamp].cpu = metric.value;
        } else if (metric.metric === 'MEMORY') {
          dataByTimestamp[timestamp].memory = metric.value;
        } else if (metric.metric === 'DISK') {
          dataByTimestamp[timestamp].disk = metric.value;
        }
      });

      const chartDataArray = Object.values(dataByTimestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-50); // Keep last 50 data points

      setChartData(chartDataArray);
    } catch (error) {
      console.error('Failed to fetch metrics history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsHistory();
    const interval = setInterval(fetchMetricsHistory, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  // Calculate average values
  const calculateAverage = (metric: 'cpu' | 'memory' | 'disk') => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, data) => acc + data[metric], 0);
    return (sum / chartData.length).toFixed(1);
  };

  // Calculate trend
  const calculateTrend = (metric: 'cpu' | 'memory' | 'disk') => {
    if (chartData.length < 2) return 0;
    const recent = chartData.slice(-10);
    const older = chartData.slice(-20, -10);

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((acc, d) => acc + d[metric], 0) / recent.length;
    const olderAvg = older.reduce((acc, d) => acc + d[metric], 0) / older.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">System Metrics</h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Metric selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Metrics</option>
            <option value="CPU">CPU Only</option>
            <option value="MEMORY">Memory Only</option>
            <option value="DISK">Disk Only</option>
          </select>

          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* CPU Stats */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">CPU Avg</span>
            </div>
            {calculateTrend('cpu') > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{calculateAverage('cpu')}%</div>
          <div className="text-xs text-gray-600 mt-1">
            {calculateTrend('cpu') > 0 ? '+' : ''}
            {calculateTrend('cpu').toFixed(1)}% trend
          </div>
        </div>

        {/* Memory Stats */}
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Memory Avg</span>
            </div>
            {calculateTrend('memory') > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{calculateAverage('memory')}%</div>
          <div className="text-xs text-gray-600 mt-1">
            {calculateTrend('memory') > 0 ? '+' : ''}
            {calculateTrend('memory').toFixed(1)}% trend
          </div>
        </div>

        {/* Disk Stats */}
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Disk Avg</span>
            </div>
            {calculateTrend('disk') > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{calculateAverage('disk')}%</div>
          <div className="text-xs text-gray-600 mt-1">
            {calculateTrend('disk') > 0 ? '+' : ''}
            {calculateTrend('disk').toFixed(1)}% trend
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading metrics...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No data available</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                domain={[0, 100]}
                label={{ value: 'Usage (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px',
                }}
              />
              <Legend />
              {(selectedMetric === 'all' || selectedMetric === 'CPU') && (
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  fillOpacity={0.6}
                  name="CPU %"
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'MEMORY') && (
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="#a855f7"
                  fill="#d8b4fe"
                  fillOpacity={0.6}
                  name="Memory %"
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'DISK') && (
                <Area
                  type="monotone"
                  dataKey="disk"
                  stroke="#6366f1"
                  fill="#c7d2fe"
                  fillOpacity={0.6}
                  name="Disk %"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Data points: {chartData.length}</span>
          </div>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default HealthMetrics;
