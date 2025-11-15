import { useEffect, useState } from 'react';
import { Plus, Settings, X, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { analyticsAPI, earningsAPI } from '../lib/api';
import { format } from 'date-fns';
import { useWidgetStore } from '../store/widget.store';
import { notify } from '../store/notification.store';
import BudgetOverviewWidget from '../components/widgets/BudgetOverviewWidget';
import UpcomingGoalsWidget from '../components/widgets/UpcomingGoalsWidget';
import ActivityFeedWidget from '../components/widgets/ActivityFeedWidget';
import EarningsHeatmap from '../components/widgets/EarningsHeatmap';
import PerformanceMetrics from '../components/widgets/PerformanceMetrics';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [recentEarnings, setRecentEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const { widgets, toggleWidget, resetToDefault } = useWidgetStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, earningsRes] = await Promise.all([
        analyticsAPI.getSummary({ period: 'month' }),
        earningsAPI.getAll({ limit: 5 }),
      ]);
      setSummary(summaryRes.data);
      setRecentEarnings(earningsRes.data.earnings);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const isWidgetEnabled = (widgetId: string) => {
    return widgets.find((w) => w.id === widgetId)?.enabled ?? true;
  };

  const handleResetWidgets = () => {
    resetToDefault();
    notify.success('Widgets Reset', 'Dashboard widgets have been reset to default');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWidgetSettings(!showWidgetSettings)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </button>
        </div>
      </div>

      {/* Widget Settings Panel */}
      {showWidgetSettings && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customize Dashboard</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Show or hide widgets on your dashboard
              </p>
            </div>
            <button
              onClick={() => setShowWidgetSettings(false)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {widgets.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                  widget.enabled
                    ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">{widget.title}</span>
                {widget.enabled ? (
                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleResetWidgets}
              className="inline-flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {isWidgetEnabled('quick-stats') && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Earned (This Month)
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  ${summary?.total_earnings?.toFixed(2) || '0.00'}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Hours Worked
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {summary?.total_hours?.toFixed(1) || '0.0'}h
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Avg Hourly Rate
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  ${summary?.avg_hourly_rate?.toFixed(2) || '0.00'}/h
                </dd>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* By Platform */}
      {isWidgetEnabled('top-platforms') && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Earnings by Platform
          </h2>
        <div className="space-y-3">
          {summary?.by_platform?.map((platform: any) => (
            <div key={platform.platform.id} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: platform.platform.color || '#3b82f6' }}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {platform.platform.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    ${platform.earnings.toFixed(2)} ({platform.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="mt-1 flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${platform.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!summary?.by_platform || summary.by_platform.length === 0) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No earnings data yet</p>
          )}
        </div>
        </div>
      )}

      {/* Budget & Goals Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetOverviewWidget />
        <UpcomingGoalsWidget />
      </div>

      {/* Performance & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceMetrics />
        <ActivityFeedWidget />
      </div>

      {/* Earnings Heatmap */}
      <EarningsHeatmap />

      {/* Recent Earnings */}
      {isWidgetEnabled('recent-earnings') && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Entries</h2>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentEarnings.map((earning) => (
            <li key={earning.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-2 h-2 rounded-full mr-3"
                    style={{ backgroundColor: earning.platform.color || '#3b82f6' }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {earning.platform.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{earning.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${earning.amount.toFixed(2)}
                  </p>
                  {earning.hours && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {earning.hours}h · ${earning.hourly_rate?.toFixed(2)}/h
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
          {recentEarnings.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No earnings yet. Add your first entry!
            </li>
          )}
        </ul>
        </div>
      )}
    </div>
  );
}
