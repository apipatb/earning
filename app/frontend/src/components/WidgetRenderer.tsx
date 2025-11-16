import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Loader, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Widget {
  id: string;
  type: 'CHART' | 'KPI' | 'TABLE' | 'TEXT' | 'GAUGE' | 'HEATMAP' | 'TIME_SERIES';
  title: string;
  config: any;
  dataSource: string;
  refreshInterval?: number;
}

interface WidgetRendererProps {
  widget: Widget;
  dashboardId: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#14b8a6'];

export default function WidgetRenderer({ widget, dashboardId }: WidgetRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWidgetData();

    // Set up auto-refresh if specified
    if (widget.refreshInterval) {
      const interval = setInterval(loadWidgetData, widget.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [widget.id, widget.refreshInterval]);

  const loadWidgetData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/dashboards/${dashboardId}/widgets/${widget.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load widget data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-600">
        <p className="mb-2">{error}</p>
        <button
          onClick={loadWidgetData}
          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  switch (widget.type) {
    case 'KPI':
      return <KPIWidget data={data} config={widget.config} />;
    case 'CHART':
      return <ChartWidget data={data} config={widget.config} />;
    case 'TABLE':
      return <TableWidget data={data} config={widget.config} />;
    case 'TEXT':
      return <TextWidget config={widget.config} />;
    case 'GAUGE':
      return <GaugeWidget data={data} config={widget.config} />;
    case 'TIME_SERIES':
      return <TimeSeriesWidget data={data} config={widget.config} />;
    case 'HEATMAP':
      return <HeatmapWidget data={data} config={widget.config} />;
    default:
      return <div className="text-gray-500">Unsupported widget type</div>;
  }
}

// KPI Widget Component
function KPIWidget({ data, config }: any) {
  if (!data) return null;

  const value = config.metric ? data[config.metric] : data.total || 0;
  const trend = data.trend || 0;
  const showTrend = config.showTrend !== false;

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="text-4xl font-bold text-gray-900 mb-2">
        {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
      </div>
      {showTrend && (
        <div className={`flex items-center space-x-1 text-sm ${
          trend >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{Math.abs(trend).toFixed(1)}% vs previous period</span>
        </div>
      )}
      {data.count !== undefined && (
        <div className="text-sm text-gray-500 mt-1">
          {data.count} transactions
        </div>
      )}
    </div>
  );
}

// Chart Widget Component
function ChartWidget({ data, config }: any) {
  if (!data) return null;

  const chartData = data.byDate || data.byPlatform || data.byCategory || data.byProduct || [];

  const renderChart = () => {
    switch (config.chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="amount" fill="#6366f1" />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
          </AreaChart>
        );
      default:
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#6366f1" />
          </BarChart>
        );
    }
  };

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

// Table Widget Component
function TableWidget({ data, config }: any) {
  if (!data) return null;

  const items = Array.isArray(data) ? data : data.invoices || data.goals || [];

  return (
    <div className="h-full overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {Object.keys(items[0] || {}).slice(0, 4).map((key) => (
              <th
                key={key}
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.slice(0, config.limit || 10).map((item: any, index: number) => (
            <tr key={index}>
              {Object.values(item).slice(0, 4).map((value: any, i: number) => (
                <td key={i} className="px-4 py-2 text-sm text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Text Widget Component
function TextWidget({ config }: any) {
  return (
    <div
      className="h-full prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: config.content || '' }}
    />
  );
}

// Gauge Widget Component
function GaugeWidget({ data, config }: any) {
  if (!data) return null;

  const value = config.metric ? data[config.metric] : data.profitMargin || 0;
  const max = config.max || 100;
  const percentage = Math.min((value / max) * 100, 100);

  const getColor = () => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={`${percentage * 2.827} 282.7`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className={getColor()}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </div>
            <div className="text-sm text-gray-500">
              {config.unit || '%'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Time Series Widget Component
function TimeSeriesWidget({ data, config }: any) {
  if (!data || !data.byDate) return null;

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.byDate}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Heatmap Widget Component
function HeatmapWidget({ data, config }: any) {
  if (!data) return null;

  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      <p>Heatmap visualization coming soon</p>
    </div>
  );
}
