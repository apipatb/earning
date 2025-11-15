import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart as PieIcon, Activity, Target, Clock, DollarSign, Calendar, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';

interface AnalyticsData {
  overview: {
    totalEarnings: number;
    totalExpenses: number;
    netIncome: number;
    profitMargin: number;
    avgDailyEarnings: number;
    avgHourlyRate: number;
    totalHours: number;
    activeClients: number;
  };
  trends: any[];
  categoryBreakdown: any[];
  clientDistribution: any[];
  hourlyPerformance: any[];
  weeklyComparison: any[];
  monthlyGrowth: any[];
  platformPerformance: any[];
}

export default function AdvancedAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    generateAnalytics();
  }, [period]);

  const generateAnalytics = () => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]');
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');

    // Filter by period
    const now = new Date();
    const periodStart = getPeriodStart(period, now);

    const filteredEarnings = earnings.filter((e: any) => new Date(e.date) >= periodStart);
    const filteredExpenses = expenses.filter((e: any) => new Date(e.date) >= periodStart);
    const filteredTimeEntries = timeEntries.filter((t: any) => new Date(t.startTime) >= periodStart);

    // Overview calculations
    const totalEarnings = filteredEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const netIncome = totalEarnings - totalExpenses;
    const profitMargin = totalEarnings > 0 ? (netIncome / totalEarnings) * 100 : 0;

    const daysDiff = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const avgDailyEarnings = totalEarnings / daysDiff;

    const totalHours = filteredTimeEntries.reduce((sum: number, t: any) => sum + (t.duration / 3600), 0);
    const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;
    const activeClients = clients.filter((c: any) => c.status === 'active').length;

    // Trends - daily earnings over period
    const trends = generateDailyTrends(filteredEarnings, periodStart, now);

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    filteredExpenses.forEach((e: any) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });
    const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Client distribution
    const clientMap: Record<string, number> = {};
    filteredEarnings.forEach((e: any) => {
      const clientId = e.clientId || 'Unknown';
      clientMap[clientId] = (clientMap[clientId] || 0) + e.amount;
    });
    const clientDistribution = Object.entries(clientMap).map(([name, value]) => ({
      name: name === 'Unknown' ? 'Unknown' : clients.find((c: any) => c.id === name)?.name || name,
      value,
    }));

    // Hourly performance
    const hourlyMap: Record<number, { earnings: number; hours: number }> = {};
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap[hour] = { earnings: 0, hours: 0 };
    }

    filteredTimeEntries.forEach((t: any) => {
      const hour = new Date(t.startTime).getHours();
      hourlyMap[hour].earnings += t.totalAmount;
      hourlyMap[hour].hours += t.duration / 3600;
    });

    const hourlyPerformance = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      earnings: hourlyMap[hour].earnings,
      hours: parseFloat(hourlyMap[hour].hours.toFixed(2)),
    }));

    // Weekly comparison
    const weeklyComparison = generateWeeklyComparison(filteredEarnings, filteredExpenses);

    // Monthly growth
    const monthlyGrowth = generateMonthlyGrowth(earnings, expenses);

    // Platform performance
    const platformMap: Record<string, { earnings: number; count: number }> = {};
    filteredEarnings.forEach((e: any) => {
      const platform = e.platformId || 'Unknown';
      if (!platformMap[platform]) {
        platformMap[platform] = { earnings: 0, count: 0 };
      }
      platformMap[platform].earnings += e.amount;
      platformMap[platform].count += 1;
    });

    const platformPerformance = Object.entries(platformMap).map(([name, data]) => ({
      name,
      earnings: data.earnings,
      count: data.count,
      average: data.earnings / data.count,
    }));

    setAnalytics({
      overview: {
        totalEarnings,
        totalExpenses,
        netIncome,
        profitMargin,
        avgDailyEarnings,
        avgHourlyRate,
        totalHours,
        activeClients,
      },
      trends,
      categoryBreakdown,
      clientDistribution,
      hourlyPerformance,
      weeklyComparison,
      monthlyGrowth,
      platformPerformance,
    });
  };

  const getPeriodStart = (period: string, now: Date): Date => {
    const start = new Date(now);
    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    return start;
  };

  const generateDailyTrends = (earnings: any[], start: Date, end: Date) => {
    const days: Record<string, number> = {};
    let current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      days[dateStr] = 0;
      current.setDate(current.getDate() + 1);
    }

    earnings.forEach((e: any) => {
      const dateStr = e.date.split('T')[0];
      if (days[dateStr] !== undefined) {
        days[dateStr] += e.amount;
      }
    });

    return Object.entries(days).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      earnings: parseFloat(amount.toFixed(2)),
    }));
  };

  const generateWeeklyComparison = (earnings: any[], expenses: any[]) => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData: Record<number, { earnings: number; expenses: number; count: number }> = {};

    for (let day = 0; day < 7; day++) {
      weekData[day] = { earnings: 0, expenses: 0, count: 0 };
    }

    earnings.forEach((e: any) => {
      const day = new Date(e.date).getDay();
      weekData[day].earnings += e.amount;
      weekData[day].count += 1;
    });

    expenses.forEach((e: any) => {
      const day = new Date(e.date).getDay();
      weekData[day].expenses += e.amount;
    });

    return weekDays.map((name, index) => ({
      day: name,
      earnings: parseFloat(weekData[index].earnings.toFixed(2)),
      expenses: parseFloat(weekData[index].expenses.toFixed(2)),
      net: parseFloat((weekData[index].earnings - weekData[index].expenses).toFixed(2)),
    }));
  };

  const generateMonthlyGrowth = (earnings: any[], expenses: any[]) => {
    const monthData: Record<string, { earnings: number; expenses: number }> = {};

    [...earnings, ...expenses].forEach((item: any) => {
      const date = new Date(item.date || item.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthData[monthKey]) {
        monthData[monthKey] = { earnings: 0, expenses: 0 };
      }

      if (earnings.includes(item)) {
        monthData[monthKey].earnings += item.amount;
      } else {
        monthData[monthKey].expenses += item.amount;
      }
    });

    return Object.entries(monthData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        earnings: parseFloat(data.earnings.toFixed(2)),
        expenses: parseFloat(data.expenses.toFixed(2)),
        net: parseFloat((data.earnings - data.expenses).toFixed(2)),
      }));
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (!analytics) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Comprehensive insights into your financial performance
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {p === 'week' ? '7D' : p === 'month' ? '30D' : p === 'quarter' ? '90D' : '1Y'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Total Earnings</span>
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            ${analytics.overview.totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            ${analytics.overview.avgDailyEarnings.toFixed(2)}/day avg
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            ${analytics.overview.totalExpenses.toFixed(2)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Net Income</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            ${analytics.overview.netIncome.toFixed(2)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {analytics.overview.profitMargin.toFixed(1)}% margin
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Hourly Rate</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            ${analytics.overview.avgHourlyRate.toFixed(2)}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {analytics.overview.totalHours.toFixed(1)}h total
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Earnings Trend */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Earnings Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.trends}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                }}
              />
              <Area type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} fill="url(#colorEarnings)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Comparison & Monthly Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Weekly Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.weeklyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="day" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="earnings" fill="#10b981" name="Earnings" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Growth
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={analytics.monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
                <Bar dataKey="expenses" fill="#f59e0b" name="Expenses" />
                <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} name="Net" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown & Client Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.categoryBreakdown.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Expense Categories
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {analytics.clientDistribution.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Client Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.clientDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.clientDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Hourly Performance */}
        {analytics.hourlyPerformance.some(h => h.earnings > 0) && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Hourly Performance
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.hourlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="hour" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="earnings" fill="#8b5cf6" name="Earnings ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Platform Performance */}
        {analytics.platformPerformance.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Platform Performance
            </h3>
            <div className="space-y-3">
              {analytics.platformPerformance
                .sort((a, b) => b.earnings - a.earnings)
                .slice(0, 5)
                .map((platform, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {platform.name}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {platform.count} entries
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          ${platform.earnings.toFixed(2)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          ${platform.average.toFixed(2)} avg
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Understanding Your Analytics
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Net income = Total earnings - Total expenses</li>
          <li>Profit margin shows percentage of earnings kept after expenses</li>
          <li>Weekly performance helps identify your most productive days</li>
          <li>Monthly growth reveals long-term trends in your business</li>
          <li>Hourly performance shows your peak earning hours</li>
          <li>Use these insights to optimize your schedule and pricing</li>
        </ul>
      </div>
    </div>
  );
}
