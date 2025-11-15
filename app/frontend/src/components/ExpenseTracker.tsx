import { useState, useEffect } from 'react';
import { TrendingDown, Plus, Edit2, Trash2, Tag, Calendar, DollarSign, PieChart, Filter } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  isRecurring: boolean;
  tags: string[];
  receipt?: string;
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Software & Tools',
  'Marketing',
  'Equipment',
  'Travel',
  'Meals & Entertainment',
  'Professional Services',
  'Insurance',
  'Rent & Utilities',
  'Training & Education',
  'Other',
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#6366f1', '#14b8a6', '#84cc16', '#64748b'];

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<Expense>>({
    amount: 0,
    category: EXPENSE_CATEGORIES[0],
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'credit_card',
    isRecurring: false,
    tags: [],
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    const stored = localStorage.getItem('expenses');
    if (stored) {
      setExpenses(JSON.parse(stored));
    }
  };

  const saveExpenses = (newExpenses: Expense[]) => {
    localStorage.setItem('expenses', JSON.stringify(newExpenses));
    setExpenses(newExpenses);
  };

  const handleCreate = () => {
    if (!formData.amount || !formData.description) {
      alert('Please fill amount and description');
      return;
    }

    const newExpense: Expense = {
      id: `expense-${Date.now()}`,
      amount: formData.amount!,
      category: formData.category!,
      description: formData.description!,
      date: formData.date!,
      paymentMethod: formData.paymentMethod!,
      isRecurring: formData.isRecurring!,
      tags: formData.tags || [],
      createdAt: new Date().toISOString(),
    };

    saveExpenses([newExpense, ...expenses]);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingId) return;

    const updated = expenses.map(exp =>
      exp.id === editingId ? { ...exp, ...formData } : exp
    );

    saveExpenses(updated);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this expense?')) {
      saveExpenses(expenses.filter(exp => exp.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      category: EXPENSE_CATEGORIES[0],
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'credit_card',
      isRecurring: false,
      tags: [],
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (expense: Expense) => {
    setFormData(expense);
    setEditingId(expense.id);
    setIsCreating(true);
  };

  // Calculate statistics
  const filteredExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
  })).filter(item => item.value > 0);

  const monthlyExpenses = expenses.filter(e => {
    const expDate = new Date(e.date);
    const now = new Date();
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + e.amount, 0);

  const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
  const monthlyEarnings = earnings.filter((e: any) => {
    const earnDate = new Date(e.date);
    const now = new Date();
    return earnDate.getMonth() === now.getMonth() && earnDate.getFullYear() === now.getFullYear();
  }).reduce((sum: number, e: any) => sum + e.amount, 0);

  const profitMargin = monthlyEarnings > 0 ? ((monthlyEarnings - monthlyExpenses) / monthlyEarnings) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg">
            <TrendingDown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Expense Tracker</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Track and categorize your business expenses
            </p>
          </div>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            ${totalExpenses.toFixed(2)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">This Month</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            ${monthlyExpenses.toFixed(2)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Profit Margin</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {profitMargin.toFixed(1)}%
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Categories</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {expensesByCategory.length}
          </p>
        </div>
      </div>

      {/* Pie Chart */}
      {expensesByCategory.length > 0 && !isCreating && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RePieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isCreating ? (
        <>
          {/* Filter */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expense List */}
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Expenses Yet</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Start tracking your business expenses
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Plus className="w-4 h-4" />
                  Add First Expense
                </button>
              </div>
            ) : (
              filteredExpenses.map(expense => (
                <div
                  key={expense.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {expense.description}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {expense.category}
                        </span>
                        {expense.isRecurring && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            Recurring
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Date:</span>
                          <span className="ml-1 text-gray-900 dark:text-white">
                            {new Date(expense.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                          <span className="ml-1 text-gray-900 dark:text-white capitalize">
                            {expense.paymentMethod.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                          <span className="ml-1 font-semibold text-red-600 dark:text-red-400">
                            -${expense.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {expense.tags && expense.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {expense.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => startEdit(expense)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Create/Edit Form */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Recurring Expense</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              {editingId ? 'Update' : 'Add'} Expense
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
