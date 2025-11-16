import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, TrendingDown, DollarSign } from 'lucide-react';
import { expensesAPI, Expense, ExpenseData, ExpenseSummary, ProfitMargin } from '../lib/api';
import { notify } from '../store/notification.store';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [profitData, setProfitData] = useState<ProfitMargin | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExpenseData>({
    category: '',
    description: '',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    vendor: '',
    isTaxDeductible: false,
    notes: '',
  });

  const expenseCategories = ['Utilities', 'Supplies', 'Rent', 'Transportation', 'Equipment', 'Software', 'Other'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expRes, summRes, profRes] = await Promise.all([
        expensesAPI.getAll(),
        expensesAPI.getSummary(),
        expensesAPI.getProfitMargin(),
      ]);
      setExpenses(expRes.expenses);
      setSummary(summRes);
      setProfitData(profRes);
    } catch (error) {
      notify.error('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.description || formData.amount <= 0) {
      notify.error('Validation Error', 'All fields are required');
      return;
    }

    try {
      if (editingId) {
        await expensesAPI.update(editingId, formData);
        setExpenses(expenses.map((e) => (e.id === editingId ? { ...e, ...formData } : e)));
        notify.success('Success', 'Expense updated');
      } else {
        const response = await expensesAPI.create(formData);
        setExpenses([response.expense, ...expenses]);
        notify.success('Success', 'Expense added');
      }
      resetForm();
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to save expense');
    }
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
      vendor: expense.vendor || '',
      isTaxDeductible: expense.isTaxDeductible,
      notes: expense.notes || '',
    });
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expensesAPI.delete(id);
      setExpenses(expenses.filter((e) => e.id !== id));
      notify.success('Expense Deleted', 'Expense has been removed');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      vendor: '',
      isTaxDeductible: false,
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Expense Tracking</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Profit Summary */}
      {profitData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Revenue</p>
            <p className="mt-2 text-3xl font-extrabold text-green-600">${profitData.financials.revenue.toFixed(2)}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Expenses</p>
            <p className="mt-2 text-3xl font-extrabold text-red-600">${profitData.financials.expenses.toFixed(2)}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Net Profit</p>
            <p
              className={`mt-2 text-3xl font-extrabold ${
                profitData.financials.profit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ${profitData.financials.profit.toFixed(2)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Profit Margin</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">
              {parseFloat(profitData.financials.profit_margin_percent).toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Expense Summary */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="mt-2 text-3xl font-extrabold text-red-600">${summary.summary.total_expenses.toFixed(2)}</p>
            <p className="mt-2 text-xs text-gray-500">{summary.summary.expense_count} items</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Tax Deductible</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">${summary.summary.tax_deductible.toFixed(2)}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Non-Deductible</p>
            <p className="mt-2 text-3xl font-extrabold text-orange-600">
              ${summary.summary.non_deductible.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">Select category</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expense Date</label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex items-center pt-7">
                <input
                  type="checkbox"
                  checked={formData.isTaxDeductible}
                  onChange={(e) => setFormData({ ...formData, isTaxDeductible: e.target.checked })}
                  className="h-4 w-4 text-primary"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">Tax Deductible</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                {editingId ? 'Update' : 'Add'} Expense
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Expenses</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductible</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{expense.vendor || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    ${expense.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {expense.isTaxDeductible ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button onClick={() => handleEdit(expense)} className="text-blue-600 hover:text-blue-900">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(expense.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <TrendingDown className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No expenses recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
