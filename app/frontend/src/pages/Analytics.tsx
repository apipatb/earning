import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Target, Download, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { analyticsAPI } from '../lib/api';

interface AnalyticsData {
  totalEarnings: number;
  totalHours: number;
  avgHourlyRate: number;
  earningsByPlatform: Array<{
    platform: string;
    amount: number;
    percentage: number;
    color: string | null;
  }>;
  earningsByDate: Array<{
    date: string;
    amount: number;
    hours: number;
  }>;
  earningsByCategory: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  previousPeriod?: {
    totalEarnings: number;
    totalHours: number;
    avgHourlyRate: number;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

// Helper function to calculate growth percentage
const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to get growth indicator
const getGrowthIndicator = (growth: number) => {
  if (growth > 0) {
    return { icon: ArrowUp, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900' };
  } else if (growth < 0) {
    return { icon: ArrowDown, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900' };
  }
  return { icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700' };
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.getAnalytics(period);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No analytics data available</div>
      </div>
    );
  }

  // Calculate growth metrics
  const earningsGrowth = analytics.previousPeriod
    ? calculateGrowth(analytics.totalEarnings, analytics.previousPeriod.totalEarnings)
    : 0;
  const hoursGrowth = analytics.previousPeriod
    ? calculateGrowth(analytics.totalHours, analytics.previousPeriod.totalHours)
    : 0;
  const rateGrowth = analytics.previousPeriod
    ? calculateGrowth(analytics.avgHourlyRate, analytics.previousPeriod.avgHourlyRate)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive insights into your earnings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Period Selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {(['area', 'line', 'bar'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-2 rounded-md font-medium text-sm transition-all ${
                  chartType === type
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards with Growth Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg rounded-lg p-6 animate-slide-in-up hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Total Earnings</div>
            <DollarSign className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-2">
            ${analytics.totalEarnings.toFixed(2)}
          </div>
          {analytics.previousPeriod && (
            <div className="flex items-center gap-1 text-xs opacity-90">
              {(() => {
                const indicator = getGrowthIndicator(earningsGrowth);
                const Icon = indicator.icon;
                return (
                  <>
                    <Icon className="w-3 h-3" />
                    <span>{Math.abs(earningsGrowth).toFixed(1)}% vs last period</span>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg rounded-lg p-6 animate-slide-in-up hover:shadow-xl transition-shadow" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Total Hours</div>
            <Clock className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-2">
            {analytics.totalHours.toFixed(1)}
          </div>
          {analytics.previousPeriod && (
            <div className="flex items-center gap-1 text-xs opacity-90">
              {(() => {
                const indicator = getGrowthIndicator(hoursGrowth);
                const Icon = indicator.icon;
                return (
                  <>
                    <Icon className="w-3 h-3" />
                    <span>{Math.abs(hoursGrowth).toFixed(1)}% vs last period</span>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg rounded-lg p-6 animate-slide-in-up hover:shadow-xl transition-shadow" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Avg Hourly Rate</div>
            <TrendingUp className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-2">
            ${analytics.avgHourlyRate.toFixed(2)}
          </div>
          {analytics.previousPeriod && (
            <div className="flex items-center gap-1 text-xs opacity-90">
              {(() => {
                const indicator = getGrowthIndicator(rateGrowth);
                const Icon = indicator.icon;
                return (
                  <>
                    <Icon className="w-3 h-3" />
                    <span>{Math.abs(rateGrowth).toFixed(1)}% vs last period</span>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg rounded-lg p-6 animate-slide-in-up hover:shadow-xl transition-shadow" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Active Platforms</div>
            <Target className="w-10 h-10 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-2">
            {analytics.earningsByPlatform.length}
          </div>
          <div className="text-xs opacity-90">
            Generating revenue
          </div>
        </div>
      </div>

      {/* Dynamic Earnings Trend Chart */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Earnings Trend</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {period.charAt(0).toUpperCase() + period.slice(1)} Overview
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          {chartType === 'area' ? (
            <AreaChart data={analytics.earningsByDate}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="#9ca3af"
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                strokeWidth={3}
                fill="url(#colorAmount)"
                name="Earnings"
                animationDuration={1000}
              />
            </AreaChart>
          ) : chartType === 'line' ? (
            <LineChart data={analytics.earningsByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="#9ca3af"
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 8 }}
                name="Earnings"
                animationDuration={1000}
              />
            </LineChart>
          ) : (
            <BarChart data={analytics.earningsByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="#9ca3af"
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
              />
              <Legend />
              <Bar
                dataKey="amount"
                fill="#3B82F6"
                name="Earnings"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Combined Earnings & Hours Chart */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Earnings vs Hours Worked</h2>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={analytics.earningsByDate}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              stroke="#9ca3af"
            />
            <YAxis yAxisId="left" stroke="#9ca3af" />
            <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="amount"
              fill="#3B82F6"
              name="Earnings ($)"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hours"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#10B981', r: 5 }}
              name="Hours"
              animationDuration={1200}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Pie Chart */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Earnings Distribution</h2>
          {analytics.earningsByPlatform.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={analytics.earningsByPlatform}
                  dataKey="amount"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={(entry) => `${entry.percentage.toFixed(1)}%`}
                  labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                  animationDuration={1000}
                >
                  {analytics.earningsByPlatform.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No platform data available
            </div>
          )}
        </div>

        {/* Enhanced Bar Chart */}
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Comparison</h2>
          {analytics.earningsByPlatform.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics.earningsByPlatform}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="platform" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                />
                <Legend />
                <Bar
                  dataKey="amount"
                  name="Earnings"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                >
                  {analytics.earningsByPlatform.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No platform data available
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {analytics.earningsByCategory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Earnings by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={analytics.earningsByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number, name: string) => {
                  if (name === 'amount') return [`$${value.toFixed(2)}`, 'Earnings'];
                  return [value, 'Transactions'];
                }}
              />
              <Legend />
              <Bar dataKey="amount" name="Earnings" fill="#10B981" radius={[8, 8, 0, 0]} animationDuration={1000} />
              <Bar dataKey="count" name="Transactions" fill="#F59E0B" radius={[8, 8, 0, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Platform Performance Radar */}
      {analytics.earningsByPlatform.length > 0 && analytics.earningsByPlatform.length <= 8 && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Performance Overview</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={analytics.earningsByPlatform}>
              <PolarGrid stroke="#9ca3af" />
              <PolarAngleAxis dataKey="platform" stroke="#9ca3af" />
              <PolarRadiusAxis stroke="#9ca3af" />
              <Radar
                name="Earnings"
                dataKey="amount"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
                animationDuration={1500}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Platform Details Table */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {analytics.earningsByPlatform.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No platform data available
                  </td>
                </tr>
              ) : (
                analytics.earningsByPlatform.map((platform, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {platform.color && (
                          <div
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: platform.color }}
                          />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {platform.platform}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                      ${platform.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {platform.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${platform.percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hours Trend */}
      {analytics.earningsByDate.some(d => d.hours > 0) && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hours Worked Trend</h2>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={analytics.earningsByDate}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="#9ca3af"
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [value.toFixed(1), 'Hours']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#colorHours)"
                name="Hours Worked"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
