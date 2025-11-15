import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, TrendingUp, AlertCircle, CheckCircle, PiggyBank, Wallet } from 'lucide-react';
import { notify } from '../store/notification.store';
import { useCurrencyStore } from '../store/currency.store';
import { formatCurrency } from '../lib/currency';

interface BudgetCategory {
  id: string;
  name: string;
  plannedAmount: number;
  spentAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  color: string;
  description?: string;
  startDate: string;
  endDate: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  description?: string;
}

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
];

export default function BudgetPlanning() {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetCategory | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const { currency } = useCurrencyStore();

  const [budgetFormData, setBudgetFormData] = useState({
    name: '',
    plannedAmount: '',
    period: 'monthly' as const,
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const [savingsFormData, setSavingsFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    priority: 'medium' as const,
    description: '',
  });

  useEffect(() => {
    // Load from localStorage
    const savedBudgets = localStorage.getItem('budget_categories');
    const savedGoals = localStorage.getItem('savings_goals');

    if (savedBudgets) {
      setBudgetCategories(JSON.parse(savedBudgets));
    }
    if (savedGoals) {
      setSavingsGoals(JSON.parse(savedGoals));
    }
  }, []);

  const saveBudgets = (data: BudgetCategory[]) => {
    localStorage.setItem('budget_categories', JSON.stringify(data));
    setBudgetCategories(data);
  };

  const saveGoals = (data: SavingsGoal[]) => {
    localStorage.setItem('savings_goals', JSON.stringify(data));
    setSavingsGoals(data);
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!budgetFormData.name || !budgetFormData.plannedAmount) {
      notify.warning('Missing Fields', 'Please fill in all required fields');
      return;
    }

    if (editingBudget) {
      const updated = budgetCategories.map((cat) =>
        cat.id === editingBudget.id
          ? {
              ...cat,
              name: budgetFormData.name,
              plannedAmount: parseFloat(budgetFormData.plannedAmount),
              period: budgetFormData.period,
              description: budgetFormData.description,
              startDate: budgetFormData.startDate,
              endDate: budgetFormData.endDate || calculateEndDate(budgetFormData.startDate, budgetFormData.period),
            }
          : cat
      );
      saveBudgets(updated);
      notify.success('Budget Updated', 'Budget category has been updated');
      setEditingBudget(null);
    } else {
      const newBudget: BudgetCategory = {
        id: Date.now().toString(),
        name: budgetFormData.name,
        plannedAmount: parseFloat(budgetFormData.plannedAmount),
        spentAmount: 0,
        period: budgetFormData.period,
        color: CATEGORY_COLORS[budgetCategories.length % CATEGORY_COLORS.length],
        description: budgetFormData.description,
        startDate: budgetFormData.startDate,
        endDate: budgetFormData.endDate || calculateEndDate(budgetFormData.startDate, budgetFormData.period),
      };
      saveBudgets([...budgetCategories, newBudget]);
      notify.success('Budget Created', `Created budget for ${budgetFormData.name}`);
    }

    resetBudgetForm();
  };

  const handleSavingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!savingsFormData.name || !savingsFormData.targetAmount || !savingsFormData.deadline) {
      notify.warning('Missing Fields', 'Please fill in all required fields');
      return;
    }

    if (editingGoal) {
      const updated = savingsGoals.map((goal) =>
        goal.id === editingGoal.id
          ? {
              ...goal,
              name: savingsFormData.name,
              targetAmount: parseFloat(savingsFormData.targetAmount),
              currentAmount: parseFloat(savingsFormData.currentAmount || '0'),
              deadline: savingsFormData.deadline,
              priority: savingsFormData.priority,
              description: savingsFormData.description,
            }
          : goal
      );
      saveGoals(updated);
      notify.success('Goal Updated', 'Savings goal has been updated');
      setEditingGoal(null);
    } else {
      const newGoal: SavingsGoal = {
        id: Date.now().toString(),
        name: savingsFormData.name,
        targetAmount: parseFloat(savingsFormData.targetAmount),
        currentAmount: parseFloat(savingsFormData.currentAmount || '0'),
        deadline: savingsFormData.deadline,
        priority: savingsFormData.priority,
        description: savingsFormData.description,
      };
      saveGoals([...savingsGoals, newGoal]);
      notify.success('Goal Created', `Created savings goal: ${savingsFormData.name}`);
    }

    resetSavingsForm();
  };

  const calculateEndDate = (startDate: string, period: string): string => {
    const date = new Date(startDate);
    switch (period) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  const resetBudgetForm = () => {
    setBudgetFormData({
      name: '',
      plannedAmount: '',
      period: 'monthly',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setShowBudgetForm(false);
  };

  const resetSavingsForm = () => {
    setSavingsFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      priority: 'medium',
      description: '',
    });
    setShowSavingsForm(false);
  };

  const handleEditBudget = (budget: BudgetCategory) => {
    setEditingBudget(budget);
    setBudgetFormData({
      name: budget.name,
      plannedAmount: budget.plannedAmount.toString(),
      period: budget.period,
      description: budget.description || '',
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    setShowBudgetForm(true);
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setSavingsFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      priority: goal.priority,
      description: goal.description || '',
    });
    setShowSavingsForm(true);
  };

  const handleDeleteBudget = (id: string) => {
    if (!confirm('Delete this budget category?')) return;
    saveBudgets(budgetCategories.filter((cat) => cat.id !== id));
    notify.success('Deleted', 'Budget category removed');
  };

  const handleDeleteGoal = (id: string) => {
    if (!confirm('Delete this savings goal?')) return;
    saveGoals(savingsGoals.filter((goal) => goal.id !== id));
    notify.success('Deleted', 'Savings goal removed');
  };

  const getTotalPlanned = () => budgetCategories.reduce((sum, cat) => sum + cat.plannedAmount, 0);
  const getTotalSpent = () => budgetCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
  const getTotalSavings = () => savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const getTotalSavingsTarget = () => savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);

  const getPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return (current / target) * 100;
  };

  const getBudgetStatus = (category: BudgetCategory) => {
    const percentage = getPercentage(category.spentAmount, category.plannedAmount);
    if (percentage >= 100) return { text: 'Over Budget', color: 'text-red-600 dark:text-red-400', icon: AlertCircle };
    if (percentage >= 80) return { text: 'Near Limit', color: 'text-orange-600 dark:text-orange-400', icon: AlertCircle };
    return { text: 'On Track', color: 'text-green-600 dark:text-green-400', icon: CheckCircle };
  };

  const getPriorityColor = (priority: string) => {
    const map: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return map[priority] || map.medium;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Planning</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your budgets and savings goals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-info rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Total Budget</div>
            <Wallet className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(getTotalPlanned(), currency)}</div>
          <div className="text-xs opacity-90 mt-1">Planned for this period</div>
        </div>

        <div className="bg-gradient-warning rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Total Spent</div>
            <TrendingUp className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(getTotalSpent(), currency)}</div>
          <div className="text-xs opacity-90 mt-1">
            {getPercentage(getTotalSpent(), getTotalPlanned()).toFixed(1)}% of budget
          </div>
        </div>

        <div className="bg-gradient-success rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Total Savings</div>
            <PiggyBank className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(getTotalSavings(), currency)}</div>
          <div className="text-xs opacity-90 mt-1">
            {getPercentage(getTotalSavings(), getTotalSavingsTarget()).toFixed(1)}% of goal
          </div>
        </div>

        <div className="bg-gradient-primary rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Active Goals</div>
            <Target className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{savingsGoals.length}</div>
          <div className="text-xs opacity-90 mt-1">Savings objectives</div>
        </div>
      </div>

      {/* Budget Categories Section */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Categories</h2>
          <button
            onClick={() => {
              setEditingBudget(null);
              resetBudgetForm();
              setShowBudgetForm(!showBudgetForm);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Budget
          </button>
        </div>

        {/* Budget Form */}
        {showBudgetForm && (
          <form onSubmit={handleBudgetSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-fade-in-up">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              {editingBudget ? 'Edit Budget Category' : 'New Budget Category'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={budgetFormData.name}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, name: e.target.value })}
                  placeholder="e.g., Marketing, Operations"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planned Amount *
                </label>
                <input
                  type="number"
                  value={budgetFormData.plannedAmount}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, plannedAmount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Period *
                </label>
                <select
                  value={budgetFormData.period}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, period: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={budgetFormData.startDate}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={budgetFormData.description}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, description: e.target.value })}
                  placeholder="Budget notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowBudgetForm(false);
                  setEditingBudget(null);
                  resetBudgetForm();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {editingBudget ? 'Update Budget' : 'Create Budget'}
              </button>
            </div>
          </form>
        )}

        {/* Budget List */}
        <div className="space-y-4">
          {budgetCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No budget categories yet. Create one to get started!
            </div>
          ) : (
            budgetCategories.map((category) => {
              const status = getBudgetStatus(category);
              const percentage = getPercentage(category.spentAmount, category.plannedAmount);
              const StatusIcon = status.icon;

              return (
                <div
                  key={category.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {category.name}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                          {category.period}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {category.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditBudget(category)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(category.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Planned</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(category.plannedAmount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Spent</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(category.spentAmount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Remaining</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(category.plannedAmount - category.spentAmount, currency)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          percentage >= 100
                            ? 'bg-red-600'
                            : percentage >= 80
                            ? 'bg-orange-500'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Savings Goals Section */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Savings Goals</h2>
          <button
            onClick={() => {
              setEditingGoal(null);
              resetSavingsForm();
              setShowSavingsForm(!showSavingsForm);
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </button>
        </div>

        {/* Savings Form */}
        {showSavingsForm && (
          <form onSubmit={handleSavingsSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-fade-in-up">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  value={savingsFormData.name}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, name: e.target.value })}
                  placeholder="e.g., Emergency Fund, New Equipment"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Amount *
                </label>
                <input
                  type="number"
                  value={savingsFormData.targetAmount}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, targetAmount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Amount
                </label>
                <input
                  type="number"
                  value={savingsFormData.currentAmount}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, currentAmount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline *
                </label>
                <input
                  type="date"
                  value={savingsFormData.deadline}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={savingsFormData.priority}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={savingsFormData.description}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, description: e.target.value })}
                  placeholder="Goal notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowSavingsForm(false);
                  setEditingGoal(null);
                  resetSavingsForm();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
        )}

        {/* Savings Goals List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savingsGoals.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
              No savings goals yet. Create one to start saving!
            </div>
          ) : (
            savingsGoals.map((goal) => {
              const percentage = getPercentage(goal.currentAmount, goal.targetAmount);
              const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={goal.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {goal.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                          {goal.priority}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Current</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(goal.currentAmount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Target</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(goal.targetAmount, currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {daysLeft > 0 ? (
                      <span>{daysLeft} days until deadline</span>
                    ) : daysLeft === 0 ? (
                      <span className="text-orange-600 dark:text-orange-400 font-medium">Deadline is today!</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Deadline passed {Math.abs(daysLeft)} days ago
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
