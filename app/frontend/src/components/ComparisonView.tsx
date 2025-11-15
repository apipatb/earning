import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, ArrowRight, DollarSign, Clock, BarChart3, Download } from 'lucide-react';

interface ComparisonPeriod {
  label: string;
  start: Date;
  end: Date;
}

interface ComparisonMetrics {
  totalEarnings: number;
  totalHours: number;
  avgHourlyRate: number;
  transactionCount: number;
  topPlatform: string;
  topPlatformAmount: number;
  avgPerDay: number;
  avgPerTransaction: number;
}

export default function ComparisonView() {
  const [period1, setPeriod1] = useState<ComparisonPeriod>({
    label: 'This Month',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  });

  const [period2, setPeriod2] = useState<ComparisonPeriod>({
    label: 'Last Month',
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
  });

  const [metrics1, setMetrics1] = useState<ComparisonMetrics | null>(null);
  const [metrics2, setMetrics2] = useState<ComparisonMetrics | null>(null);
  const [customPeriod, setCustomPeriod] = useState(false);

  useEffect(() => {
    calculateMetrics();
  }, [period1, period2]);

  const calculateMetrics = () => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
    const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]');
    const platforms = JSON.parse(localStorage.getItem('platforms') || '[]');

    setMetrics1(calculatePeriodMetrics(earnings, timeEntries, platforms, period1));
    setMetrics2(calculatePeriodMetrics(earnings, timeEntries, platforms, period2));
  };

  const calculatePeriodMetrics = (
    earnings: any[],
    timeEntries: any[],
    platforms: any[],
    period: ComparisonPeriod
  ): ComparisonMetrics => {
    const periodEarnings = earnings.filter(e => {
      const date = new Date(e.date);
      return date >= period.start && date <= period.end;
    });

    const totalEarnings = periodEarnings.reduce((sum, e) => sum + e.amount, 0);
    const transactionCount = periodEarnings.length;

    const periodTimeEntries = timeEntries.filter(e => {
      const date = new Date(e.startTime);
      return date >= period.start && date <= period.end && e.endTime;
    });

    const totalHours = periodTimeEntries.reduce((sum, e) => sum + (e.duration / 3600), 0);
    const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

    // Top platform
    const platformEarnings: Record<string, number> = {};
    periodEarnings.forEach(e => {
      const platform = platforms.find(p => p.id === e.platformId);
      if (platform) {
        platformEarnings[platform.name] = (platformEarnings[platform.name] || 0) + e.amount;
      }
    });

    const topPlatformEntry = Object.entries(platformEarnings).sort(([, a], [, b]) => b - a)[0];
    const topPlatform = topPlatformEntry?.[0] || 'N/A';
    const topPlatformAmount = topPlatformEntry?.[1] || 0;

    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const avgPerDay = days > 0 ? totalEarnings / days : 0;
    const avgPerTransaction = transactionCount > 0 ? totalEarnings / transactionCount : 0;

    return {
      totalEarnings,
      totalHours,
      avgHourlyRate,
      transactionCount,
      topPlatform,
      topPlatformAmount,
      avgPerDay,
      avgPerTransaction,
    };
  };

  const getChange = (value1: number, value2: number): { percent: number; isPositive: boolean } => {
    if (value2 === 0) return { percent: value1 > 0 ? 100 : 0, isPositive: value1 > 0 };
    const percent = ((value1 - value2) / value2) * 100;
    return { percent: Math.abs(percent), isPositive: percent >= 0 };
  };

  const setPredefinedPeriod = (type: 'month' | 'week' | 'quarter' | 'year') => {
    const now = new Date();
    let p1: ComparisonPeriod, p2: ComparisonPeriod;

    switch (type) {
      case 'month':
        p1 = {
          label: 'This Month',
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(),
        };
        p2 = {
          label: 'Last Month',
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        };
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfWeek);
        endOfLastWeek.setDate(startOfWeek.getDate() - 1);

        p1 = { label: 'This Week', start: startOfWeek, end: now };
        p2 = { label: 'Last Week', start: startOfLastWeek, end: endOfLastWeek };
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        p1 = {
          label: 'This Quarter',
          start: new Date(now.getFullYear(), currentQuarter * 3, 1),
          end: now,
        };
        p2 = {
          label: 'Last Quarter',
          start: new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1),
          end: new Date(now.getFullYear(), currentQuarter * 3, 0),
        };
        break;
      case 'year':
        p1 = {
          label: 'This Year',
          start: new Date(now.getFullYear(), 0, 1),
          end: now,
        };
        p2 = {
          label: 'Last Year',
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31),
        };
        break;
    }

    setPeriod1(p1);
    setPeriod2(p2);
    setCustomPeriod(false);
  };

  const MetricCard = ({
    title,
    icon: Icon,
    value1,
    value2,
    format = (v: number) => `$${v.toFixed(2)}`,
  }: {
    title: string;
    icon: any;
    value1: number;
    value2: number;
    format?: (v: number) => string;
  }) => {
    const change = getChange(value1, value2);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Period 1 */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{period1.label}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{format(value1)}</div>
          </div>

          {/* Period 2 */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{period2.label}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{format(value2)}</div>
          </div>
        </div>

        {/* Change */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className={`flex items-center gap-1 text-sm font-medium ${
            change.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {change.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{change.percent.toFixed(1)}% {change.isPositive ? 'increase' : 'decrease'}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!metrics1 || !metrics2) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading comparison...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Period Comparison</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Compare performance across different time periods
            </p>
          </div>
        </div>
      </div>

      {/* Quick Period Selectors */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setPredefinedPeriod('week')}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          This Week vs Last Week
        </button>
        <button
          onClick={() => setPredefinedPeriod('month')}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          This Month vs Last Month
        </button>
        <button
          onClick={() => setPredefinedPeriod('quarter')}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          This Quarter vs Last Quarter
        </button>
        <button
          onClick={() => setPredefinedPeriod('year')}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          This Year vs Last Year
        </button>
        <button
          onClick={() => setCustomPeriod(!customPeriod)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Custom Period
        </button>
      </div>

      {/* Custom Period Inputs */}
      {customPeriod && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period 1
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={period1.label}
                onChange={(e) => setPeriod1({ ...period1, label: e.target.value })}
                placeholder="Label"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={period1.start.toISOString().split('T')[0]}
                  onChange={(e) => setPeriod1({ ...period1, start: new Date(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <input
                  type="date"
                  value={period1.end.toISOString().split('T')[0]}
                  onChange={(e) => setPeriod1({ ...period1, end: new Date(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period 2
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={period2.label}
                onChange={(e) => setPeriod2({ ...period2, label: e.target.value })}
                placeholder="Label"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={period2.start.toISOString().split('T')[0]}
                  onChange={(e) => setPeriod2({ ...period2, start: new Date(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <input
                  type="date"
                  value={period2.end.toISOString().split('T')[0]}
                  onChange={(e) => setPeriod2({ ...period2, end: new Date(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Earnings"
          icon={DollarSign}
          value1={metrics1.totalEarnings}
          value2={metrics2.totalEarnings}
        />

        <MetricCard
          title="Total Hours"
          icon={Clock}
          value1={metrics1.totalHours}
          value2={metrics2.totalHours}
          format={(v) => `${v.toFixed(1)}h`}
        />

        <MetricCard
          title="Avg Hourly Rate"
          icon={TrendingUp}
          value1={metrics1.avgHourlyRate}
          value2={metrics2.avgHourlyRate}
          format={(v) => `$${v.toFixed(2)}/h`}
        />

        <MetricCard
          title="Transactions"
          icon={BarChart3}
          value1={metrics1.transactionCount}
          value2={metrics2.transactionCount}
          format={(v) => v.toString()}
        />

        <MetricCard
          title="Avg per Day"
          icon={Calendar}
          value1={metrics1.avgPerDay}
          value2={metrics2.avgPerDay}
        />

        <MetricCard
          title="Avg per Transaction"
          icon={DollarSign}
          value1={metrics1.avgPerTransaction}
          value2={metrics2.avgPerTransaction}
        />
      </div>

      {/* Top Platforms */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{period1.label} - Top Platform</h4>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">{metrics1.topPlatform}</span>
            <span className="font-bold text-gray-900 dark:text-white">${metrics1.topPlatformAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{period2.label} - Top Platform</h4>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">{metrics2.topPlatform}</span>
            <span className="font-bold text-gray-900 dark:text-white">${metrics2.topPlatformAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
