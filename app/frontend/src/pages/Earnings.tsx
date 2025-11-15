import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar, Download } from 'lucide-react';
import { earningsAPI, platformsAPI } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { exportEarningsToCSV } from '../lib/export';

interface Earning {
  id: string;
  date: string;
  hours: number | null;
  amount: number;
  notes: string | null;
  platform: {
    id: string;
    name: string;
    category: string;
    color: string | null;
  };
}

interface Platform {
  id: string;
  name: string;
  category: string;
  color: string | null;
}

export default function Earnings() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const [formData, setFormData] = useState({
    platformId: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    amount: '',
    notes: '',
  });

  const { user } = useAuthStore();

  useEffect(() => {
    loadData();
  }, [filterPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsData, platformsData] = await Promise.all([
        earningsAPI.getEarnings(filterPeriod),
        platformsAPI.getPlatforms(),
      ]);
      setEarnings(earningsData);
      setPlatforms(platformsData.filter((p: Platform) => p.id));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        platformId: formData.platformId,
        date: formData.date,
        hours: formData.hours ? parseFloat(formData.hours) : null,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
      };

      if (editingId) {
        await earningsAPI.updateEarning(editingId, payload);
      } else {
        await earningsAPI.createEarning(payload);
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save earning:', error);
      alert('Failed to save earning. Please try again.');
    }
  };

  const handleEdit = (earning: Earning) => {
    setEditingId(earning.id);
    setFormData({
      platformId: earning.platform.id,
      date: earning.date,
      hours: earning.hours?.toString() || '',
      amount: earning.amount.toString(),
      notes: earning.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this earning?')) return;

    try {
      await earningsAPI.deleteEarning(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete earning:', error);
      alert('Failed to delete earning. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      platformId: '',
      date: new Date().toISOString().split('T')[0],
      hours: '',
      amount: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const totalAmount = earnings.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const totalHours = earnings.reduce((sum, e) => sum + (parseFloat(e.hours?.toString() || '0') || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportEarningsToCSV(earnings)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={earnings.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Earning
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['today', 'week', 'month', 'all'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setFilterPeriod(period)}
            className={`px-4 py-2 font-medium transition-colors ${
              filterPeriod === period
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Earned</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${totalAmount.toFixed(2)}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Hours</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {totalHours.toFixed(1)}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Avg Hourly Rate</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${totalHours > 0 ? (totalAmount / totalHours).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Earning' : 'Add New Earning'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform *
                </label>
                <select
                  required
                  value={formData.platformId}
                  onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select platform</option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours (optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="0.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Add any notes about this earning..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update' : 'Add'} Earning
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Earnings List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No earnings recorded yet. Click "Add Earning" to get started!
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => {
                  const hourlyRate = earning.hours
                    ? (parseFloat(earning.amount.toString()) / parseFloat(earning.hours.toString()))
                    : null;

                  return (
                    <tr key={earning.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(earning.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {earning.platform.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: earning.platform.color }}
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {earning.platform.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ${parseFloat(earning.amount.toString()).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {earning.hours ? parseFloat(earning.hours.toString()).toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hourlyRate ? `$${hourlyRate.toFixed(2)}/hr` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {earning.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(earning)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(earning.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
