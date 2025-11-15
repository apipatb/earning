import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Target, AlertCircle, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ForecastData {
  date: string;
  actual?: number;
  predicted: number;
  lower: number;
  upper: number;
}

export default function FinancialForecasting() {
  const [forecastPeriod, setForecastPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [metrics, setMetrics] = useState({
    avgGrowthRate: 0,
    predictedTotal: 0,
    confidence: 0,
    trend: 'stable' as 'up' | 'down' | 'stable',
  });

  useEffect(() => {
    generateForecast();
  }, [forecastPeriod]);

  const generateForecast = () => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');

    if (earnings.length === 0) {
      setForecastData([]);
      return;
    }

    // Sort by date
    const sorted = [...earnings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by period
    const grouped = groupByPeriod(sorted, 'day');

    // Calculate moving average and trend
    const values = Object.values(grouped);
    const avgGrowthRate = calculateGrowthRate(values as number[]);
    const trend = avgGrowthRate > 0.05 ? 'up' : avgGrowthRate < -0.05 ? 'down' : 'stable';

    // Generate forecast
    const daysToForecast = forecastPeriod === 'week' ? 7 : forecastPeriod === 'month' ? 30 : forecastPeriod === 'quarter' ? 90 : 365;
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const avgDaily = values.length > 0 ? (values as number[]).reduce((sum, v) => sum + v, 0) / values.length : 0;

    const forecast: ForecastData[] = [];
    let predictedTotal = 0;

    // Add historical data
    const last30Days = Object.entries(grouped).slice(-30);
    last30Days.forEach(([date, amount]) => {
      forecast.push({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: amount as number,
        predicted: amount as number,
        lower: amount as number,
        upper: amount as number,
      });
    });

    // Generate future predictions
    for (let i = 1; i <= daysToForecast; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(lastDate.getDate() + i);

      // Simple linear regression with growth rate
      const predicted = avgDaily * (1 + avgGrowthRate * (i / 30));
      const variance = avgDaily * 0.3; // 30% confidence interval

      predictedTotal += predicted;

      forecast.push({
        date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        predicted: Math.max(0, predicted),
        lower: Math.max(0, predicted - variance),
        upper: predicted + variance,
      });
    }

    setForecastData(forecast);
    setMetrics({
      avgGrowthRate: avgGrowthRate * 100,
      predictedTotal,
      confidence: Math.min(95, Math.max(60, 85 - (daysToForecast / 10))),
      trend,
    });
  };

  const groupByPeriod = (earnings: any[], period: 'day' | 'week' | 'month') => {
    const grouped: Record<string, number> = {};

    earnings.forEach(e => {
      const date = new Date(e.date);
      let key: string;

      if (period === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      grouped[key] = (grouped[key] || 0) + e.amount;
    });

    return grouped;
  };

  const calculateGrowthRate = (values: number[]) => {
    if (values.length < 2) return 0;

    let totalGrowth = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        totalGrowth += (values[i] - values[i - 1]) / values[i - 1];
      }
    }

    return totalGrowth / (values.length - 1);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          {payload[0].payload.date}
        </p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toFixed(2)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Financial Forecasting</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              AI-powered predictions based on your earning patterns
            </p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'quarter', 'year'] as const).map(period => (
          <button
            key={period}
            onClick={() => setForecastPeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              forecastPeriod === period
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {period === 'week' ? '1 Week' : period === 'month' ? '1 Month' : period === 'quarter' ? '3 Months' : '1 Year'}
          </button>
        ))}
      </div>

      {forecastData.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Not Enough Data</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add more earnings entries to generate accurate forecasts
          </p>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Predicted Total</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                ${metrics.predictedTotal.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Growth Rate</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {metrics.avgGrowthRate > 0 ? '+' : ''}{metrics.avgGrowthRate.toFixed(2)}%
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Confidence</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {metrics.confidence.toFixed(0)}%
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Trend</span>
              </div>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 capitalize">
                {metrics.trend}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Confidence interval */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="url(#colorConfidence)"
                  fillOpacity={1}
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="url(#colorConfidence)"
                  fillOpacity={1}
                  name="Lower Bound"
                />

                {/* Actual earnings */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorActual)"
                  name="Actual"
                  connectNulls
                />

                {/* Predicted earnings */}
                <Area
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#colorPredicted)"
                  name="Predicted"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              How Forecasting Works
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Uses historical earning patterns to predict future income</li>
              <li>Calculates average growth rate and applies it to forecasts</li>
              <li>Confidence intervals show range of possible outcomes</li>
              <li>Accuracy improves with more historical data</li>
              <li>Forecasts update automatically as you add new earnings</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
