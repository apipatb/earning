import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../store/currency.store';

interface BudgetCategory {
  id: string;
  name: string;
  plannedAmount: number;
  spentAmount: number;
  color: string;
}

export default function BudgetOverviewWidget() {
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const { currency } = useCurrencyStore();

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('budget_categories');
    if (saved) {
      const data = JSON.parse(saved);
      setBudgets(data.slice(0, 4)); // Show only top 4
    }
  }, []);

  const getTotalBudget = () => budgets.reduce((sum, b) => sum + b.plannedAmount, 0);
  const getTotalSpent = () => budgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const getPercentage = (spent: number, planned: number) => {
    if (planned === 0) return 0;
    return (spent / planned) * 100;
  };

  const totalPercentage = getPercentage(getTotalSpent(), getTotalBudget());

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Budget Overview
        </h3>
        <Link
          to="/budget"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No budgets set yet</p>
          <Link
            to="/budget"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
          >
            Create your first budget
          </Link>
        </div>
      ) : (
        <>
          {/* Total Budget Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Budget</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(getTotalBudget(), currency)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Spent</span>
              <span className={`text-sm font-semibold ${
                totalPercentage >= 100 ? 'text-red-600 dark:text-red-400' :
                totalPercentage >= 80 ? 'text-orange-600 dark:text-orange-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {formatCurrency(getTotalSpent(), currency)} ({totalPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  totalPercentage >= 100 ? 'bg-red-600' :
                  totalPercentage >= 80 ? 'bg-orange-500' :
                  'bg-gradient-to-r from-purple-600 to-pink-600'
                }`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Budget Categories */}
          <div className="space-y-3">
            {budgets.map((budget) => {
              const percentage = getPercentage(budget.spentAmount, budget.plannedAmount);
              const isOverBudget = percentage >= 100;
              const isNearLimit = percentage >= 80 && percentage < 100;

              return (
                <div key={budget.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: budget.color }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {budget.name}
                      </span>
                      {isOverBudget && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {formatCurrency(budget.spentAmount, currency)} / {formatCurrency(budget.plannedAmount, currency)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isOverBudget ? 'bg-red-600' :
                        isNearLimit ? 'bg-orange-500' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
