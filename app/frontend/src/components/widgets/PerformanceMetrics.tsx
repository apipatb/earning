import { useEffect, useState } from 'react';
import { TrendingUp, Award, Target, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../store/currency.store';

interface Metric {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: string;
  icon: any;
  color: string;
  bgColor: string;
  format: (val: number) => string;
}

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const { currency } = useCurrencyStore();

  useEffect(() => {
    calculateMetrics();
  }, []);

  const calculateMetrics = () => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
    const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]');
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');

    // This month vs last month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter earnings
    const currentMonthEarnings = earnings.filter((e: any) => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonthEarnings = earnings.filter((e: any) => {
      const date = new Date(e.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    // Calculate totals
    const currentTotal = currentMonthEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);
    const lastTotal = lastMonthEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);

    // Calculate hours
    const currentHours = timeEntries
      .filter((e: any) => {
        if (!e.endTime) return false;
        const date = new Date(e.endTime);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum: number, e: any) => sum + e.duration / 3600, 0);

    const lastHours = timeEntries
      .filter((e: any) => {
        if (!e.endTime) return false;
        const date = new Date(e.endTime);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      })
      .reduce((sum: number, e: any) => sum + e.duration / 3600, 0);

    // Calculate productivity (earnings per hour)
    const currentProductivity = currentHours > 0 ? currentTotal / currentHours : 0;
    const lastProductivity = lastHours > 0 ? lastTotal / lastHours : 0;

    // Active clients
    const activeClients = clients.filter((c: any) => c.activeProjects > 0).length;

    // Transaction count
    const currentTransactions = currentMonthEarnings.length;
    const lastTransactions = lastMonthEarnings.length;

    const calculatedMetrics: Metric[] = [
      {
        id: 'revenue',
        label: 'Monthly Revenue',
        value: currentTotal,
        previousValue: lastTotal,
        unit: currency,
        icon: TrendingUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        format: (val) => formatCurrency(val, currency),
      },
      {
        id: 'productivity',
        label: 'Productivity Rate',
        value: currentProductivity,
        previousValue: lastProductivity,
        unit: `${currency}/hr`,
        icon: Zap,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900',
        format: (val) => `${formatCurrency(val, currency)}/hr`,
      },
      {
        id: 'transactions',
        label: 'Transactions',
        value: currentTransactions,
        previousValue: lastTransactions,
        unit: 'count',
        icon: Target,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900',
        format: (val) => val.toString(),
      },
      {
        id: 'clients',
        label: 'Active Clients',
        value: activeClients,
        previousValue: activeClients,
        unit: 'count',
        icon: Award,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900',
        format: (val) => val.toString(),
      },
    ];

    setMetrics(calculatedMetrics);
  };

  const getChangePercentage = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          Performance Metrics
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          vs Last Month
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const change = getChangePercentage(metric.value, metric.previousValue);
          const changeColor = getChangeColor(change);

          return (
            <div
              key={metric.id}
              className="group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-md"
            >
              {/* Icon & Label */}
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                {change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${changeColor}`}>
                    {change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    <span>{Math.abs(change).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Value */}
              <div className="mb-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.format(metric.value)}
                </div>
              </div>

              {/* Label */}
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {metric.label}
              </div>

              {/* Previous Value */}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Last: {metric.format(metric.previousValue)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Performance Score */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Performance
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Based on multiple metrics
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const avgChange = metrics.reduce((sum, m) => {
                return sum + getChangePercentage(m.value, m.previousValue);
              }, 0) / metrics.length;

              let score = 'Good';
              let scoreColor = 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';

              if (avgChange < -10) {
                score = 'Needs Attention';
                scoreColor = 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
              } else if (avgChange < 0) {
                score = 'Fair';
                scoreColor = 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900';
              } else if (avgChange > 20) {
                score = 'Excellent';
                scoreColor = 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
              }

              return (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${scoreColor}`}>
                  {score}
                </span>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
