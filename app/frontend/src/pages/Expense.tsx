import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, TrendingDown, Settings, Zap } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  date: string;
  status: string;
  projectId: string;
}

interface Project {
  id: string;
  projectName: string;
  clientName: string;
  budget: number;
  status: string;
}

interface ExpenseAnalytics {
  period: number;
  totalExpenses: number;
  totalAmount: number;
  avgExpense: number;
  expensesByCategory: any;
}

interface BudgetStatus {
  budgetId: string;
  projectName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: string;
}

export default function Expense() {
  const [activeTab, setActiveTab] = useState('overview');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    categoryId: 'other',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
  });

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
    fetchAnalytics();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/expenses/expenses', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/v1/expenses/projects', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/expenses/analytics', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAnalytics(data);

      const budgetResponse = await fetch('/api/v1/expenses/budgets/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const budgetData = await budgetResponse.json();
      setBudgetStatus(budgetData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const createExpense = async () => {
    try {
      const response = await fetch('/api/v1/expenses/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          projectId: '',
          categoryId: 'other',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
        });
        fetchExpenses();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  const categories = [
    { id: 'salaries', name: 'Salaries' },
    { id: 'office', name: 'Office Supplies' },
    { id: 'utilities', name: 'Utilities' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'software', name: 'Software' },
    { id: 'travel', name: 'Travel' },
    { id: 'meals', name: 'Meals' },
    { id: 'equipment', name: 'Equipment' },
    { id: 'insurance', name: 'Insurance' },
    { id: 'other', name: 'Other' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Expense Management
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="w-5 h-5" />
          New Expense
        </button>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalExpenses}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Spent</p>
            <p className="text-2xl font-bold text-red-600">${analytics.totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Average Expense</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${analytics.avgExpense.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Period</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.period} days</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8 px-6">
            <button
              onClick={() => {
                setActiveTab('overview');
                fetchExpenses();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'overview'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              Expenses
            </button>
            <button
              onClick={() => {
                setActiveTab('projects');
                fetchProjects();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'projects'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Projects
            </button>
            <button
              onClick={() => {
                setActiveTab('budgets');
                fetchAnalytics();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'budgets'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Budgets
            </button>
            <button
              onClick={() => {
                setActiveTab('analytics');
                fetchAnalytics();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'analytics'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Expenses ({expenses.length})
              </h3>
              {loading ? (
                <p className="text-gray-500">Loading expenses...</p>
              ) : expenses.length === 0 ? (
                <p className="text-gray-500">No expenses yet. Add your first expense!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Description
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Category
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr
                          key={expense.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-3 px-4">{expense.description}</td>
                          <td className="py-3 px-4">
                            {categories.find((c) => c.id === expense.categoryId)?.name}
                          </td>
                          <td className="py-3 px-4 font-medium text-red-600">
                            ${expense.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                expense.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {expense.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Projects ({projects.length})
              </h3>
              {projects.length === 0 ? (
                <p className="text-gray-500">No projects yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {project.projectName}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {project.clientName}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            project.status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        Budget: ${project.budget.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'budgets' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Budget Status
              </h3>
              {budgetStatus.length === 0 ? (
                <p className="text-gray-500">No budgets configured.</p>
              ) : (
                <div className="space-y-4">
                  {budgetStatus.map((budget) => (
                    <div key={budget.budgetId} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {budget.projectName}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            budget.status === 'overbudget'
                              ? 'bg-red-100 text-red-800'
                              : budget.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {budget.status}
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full ${
                            budget.percentageUsed > 100
                              ? 'bg-red-600'
                              : budget.percentageUsed > 80
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          Spent: ${budget.spent.toFixed(2)} / ${budget.budgetAmount.toFixed(2)}
                        </span>
                        <span>{budget.percentageUsed.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Expense Analytics
              </h3>
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Top Categories</p>
                    <div className="mt-2 space-y-2">
                      {Object.entries(analytics.expensesByCategory)
                        .slice(0, 3)
                        .map(([category, data]: any) => (
                          <div key={category} className="flex justify-between text-sm">
                            <span>{category}</span>
                            <span className="font-medium">${data.total.toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Summary</p>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Total:</span> ${analytics.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Count:</span> {analytics.totalExpenses}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Average:</span> ${analytics.avgExpense.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading analytics...</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Expense Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Expense</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Expense description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="check">Check</option>
                  <option value="transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createExpense}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
