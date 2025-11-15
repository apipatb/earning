import { useEffect, useState } from 'react';
import { Activity, TrendingUp, DollarSign, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../store/currency.store';

interface ActivityItem {
  id: string;
  type: 'earning' | 'goal' | 'budget' | 'client' | 'time';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  icon: any;
  color: string;
  bgColor: string;
}

export default function ActivityFeedWidget() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const { currency } = useCurrencyStore();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = () => {
    const allActivities: ActivityItem[] = [];

    // Load recent earnings
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
    earnings.slice(0, 3).forEach((earning: any) => {
      allActivities.push({
        id: earning.id,
        type: 'earning',
        title: 'New Earning Added',
        description: `${earning.platformName} - ${earning.description || 'Earning recorded'}`,
        amount: earning.amount,
        timestamp: earning.date,
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900',
      });
    });

    // Load recent time entries
    const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]');
    timeEntries.slice(0, 2).forEach((entry: any) => {
      if (entry.endTime) {
        allActivities.push({
          id: entry.id,
          type: 'time',
          title: 'Time Entry Completed',
          description: `${entry.projectName} - ${(entry.duration / 3600).toFixed(1)}h`,
          amount: entry.totalEarned,
          timestamp: entry.endTime,
          icon: Clock,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100 dark:bg-purple-900',
        });
      }
    });

    // Load recent goals
    const goals = JSON.parse(localStorage.getItem('savings_goals') || '[]');
    goals.slice(0, 2).forEach((goal: any) => {
      const percentage = (goal.currentAmount / goal.targetAmount) * 100;
      if (percentage >= 100) {
        allActivities.push({
          id: goal.id,
          type: 'goal',
          title: 'Goal Achieved! 🎉',
          description: goal.name,
          amount: goal.targetAmount,
          timestamp: new Date().toISOString(),
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900',
        });
      }
    });

    // Load budget alerts
    const budgets = JSON.parse(localStorage.getItem('budget_categories') || '[]');
    budgets.forEach((budget: any) => {
      const percentage = (budget.spentAmount / budget.plannedAmount) * 100;
      if (percentage >= 90) {
        allActivities.push({
          id: budget.id,
          type: 'budget',
          title: percentage >= 100 ? 'Budget Exceeded!' : 'Budget Alert',
          description: `${budget.name} - ${percentage.toFixed(0)}% used`,
          amount: budget.spentAmount,
          timestamp: new Date().toISOString(),
          icon: AlertCircle,
          color: percentage >= 100 ? 'text-red-600' : 'text-orange-600',
          bgColor: percentage >= 100 ? 'bg-red-100 dark:bg-red-900' : 'bg-orange-100 dark:bg-orange-900',
        });
      }
    });

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setActivities(allActivities.slice(0, 5));
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Recent Activity
        </h3>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View All
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No recent activity</p>
          <p className="text-xs mt-1">Start tracking your earnings!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div
                key={activity.id}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer"
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${activity.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${activity.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                        {activity.description}
                      </p>
                    </div>
                    {activity.amount !== undefined && (
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(activity.amount, currency)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Today</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {activities.filter(a => {
                const activityDate = new Date(a.timestamp).toDateString();
                const today = new Date().toDateString();
                return activityDate === today;
              }).length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Week</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {activities.filter(a => {
                const diffDays = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 86400000);
                return diffDays < 7;
              }).length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {activities.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
