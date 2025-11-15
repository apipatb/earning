import { useEffect, useState } from 'react';
import { Target, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../store/currency.store';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
}

export default function UpcomingGoalsWidget() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const { currency } = useCurrencyStore();

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('savings_goals');
    if (saved) {
      const data = JSON.parse(saved);
      // Sort by deadline and show only top 3
      const sorted = data
        .filter((g: SavingsGoal) => {
          const progress = (g.currentAmount / g.targetAmount) * 100;
          return progress < 100; // Only show incomplete goals
        })
        .sort((a: SavingsGoal, b: SavingsGoal) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        )
        .slice(0, 3);
      setGoals(sorted);
    }
  }, []);

  const getPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return (current / target) * 100;
  };

  const getDaysUntil = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getPriorityColor = (priority: string) => {
    const map: Record<string, string> = {
      low: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900',
      medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900',
      high: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900',
    };
    return map[priority] || map.medium;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
          Upcoming Goals
        </h3>
        <Link
          to="/budget"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">All goals completed!</p>
          <Link
            to="/budget"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
          >
            Set new goals
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const percentage = getPercentage(goal.currentAmount, goal.targetAmount);
            const daysLeft = getDaysUntil(goal.deadline);
            const isUrgent = daysLeft <= 7 && daysLeft >= 0;
            const isPastDue = daysLeft < 0;

            return (
              <div
                key={goal.id}
                className="group p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {goal.name}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(goal.priority)}`}>
                        {goal.priority.toUpperCase()}
                      </span>
                      {isUrgent && !isPastDue && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {daysLeft} days left
                        </span>
                      )}
                      {isPastDue && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{formatCurrency(goal.currentAmount, currency)}</span>
                    <span>{formatCurrency(goal.targetAmount, currency)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{formatCurrency(goal.targetAmount - goal.currentAmount, currency)} to go</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(goal.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
