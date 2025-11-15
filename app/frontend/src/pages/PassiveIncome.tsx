import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Trash2, Edit, Download, Wallet } from 'lucide-react';
import { passiveIncomeAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface PassiveIncome {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  source?: string;
  frequency: string;
  notes?: string;
}

export default function PassiveIncomeTracker() {
  const [incomes, setIncomes] = useState<PassiveIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    category: 'dividend',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    frequency: 'one_time',
    notes: '',
  });

  useEffect(() => {
    loadIncomes();
  }, [filterCategory]);

  const loadIncomes = async () => {
    try {
      setLoading(true);
      const filters = filterCategory !== 'all' ? { category: filterCategory } : {};
      const data = await passiveIncomeAPI.getPassiveIncomes(filters);
      setIncomes(data.passive_incomes || []);
    } catch (error) {
      console.error('Failed to load passive incomes:', error);
      notify.error('Error', 'Failed to load passive incomes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: formData.date,
        source: formData.source || undefined,
        frequency: formData.frequency,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await passiveIncomeAPI.updatePassiveIncome(editingId, payload);
        notify.success('Updated', 'Passive income updated successfully.');
      } else {
        await passiveIncomeAPI.createPassiveIncome(payload);
        notify.success('Added', `${formData.name} added successfully.`);
      }

      resetForm();
      loadIncomes();
    } catch (error) {
      console.error('Failed to save:', error);
      notify.error('Error', 'Failed to save passive income.');
    }
  };

  const handleEdit = (income: PassiveIncome) => {
    setEditingId(income.id);
    setFormData({
      name: income.name,
      category: income.category,
      amount: income.amount.toString(),
      date: income.date,
      source: income.source || '',
      frequency: income.frequency,
      notes: income.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this passive income record?')) return;

    try {
      await passiveIncomeAPI.deletePassiveIncome(id);
      notify.success('Deleted', 'Passive income deleted successfully.');
      loadIncomes();
    } catch (error) {
      console.error('Failed to delete:', error);
      notify.error('Error', 'Failed to delete passive income.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      category: 'dividend',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      source: '',
      frequency: 'one_time',
      notes: '',
    });
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const categories = ['all', ...new Set(incomes.map(inc => inc.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💰 Passive Income Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track dividends, interest, royalties & more</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus size={20} />
          Add Income Source
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Passive Income</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">${totalIncome.toFixed(2)}</p>
            </div>
            <Wallet className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Sources</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{incomes.length}</p>
            </div>
            <TrendingUp className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Monthly Average</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">${(totalIncome / 12).toFixed(2)}</p>
            </div>
            <TrendingUp className="text-purple-600" size={32} />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-lg transition ${
              filterCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Passive Income' : 'Add New Income Source'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Name (e.g., Dividend Income)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="dividend">Dividend</option>
                <option value="interest">Interest</option>
                <option value="rental">Rental</option>
                <option value="ad_revenue">Ad Revenue</option>
                <option value="royalty">Royalty</option>
                <option value="investment">Investment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Amount"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Source (e.g., Vanguard, YouTube)"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="one_time">One Time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Income List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : incomes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No passive income sources yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incomes.map((income) => (
            <div key={income.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{income.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {income.source} • {income.category} • {income.frequency}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{income.notes}</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">Received: {income.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">${income.amount.toFixed(2)}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEdit(income)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
