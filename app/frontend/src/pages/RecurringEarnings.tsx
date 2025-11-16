import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, Play, Pause, CheckCircle } from 'lucide-react';
import { notify } from '../store/notification.store';
import { FormValidation } from '../lib/validation';

interface RecurringEarning {
  id: string;
  title: string;
  platformName: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  nextOccurrence: string;
  totalGenerated: number;
}

export default function RecurringEarnings() {
  const [earnings, setEarnings] = useState<RecurringEarning[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    platformName: '',
    amount: '',
    frequency: 'monthly' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  useEffect(() => {
    // Load from localStorage for demo
    const saved = localStorage.getItem('recurring_earnings');
    if (saved) {
      setEarnings(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (data: RecurringEarning[]) => {
    localStorage.setItem('recurring_earnings', JSON.stringify(data));
    setEarnings(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.platformName || !formData.amount) {
      notify.warning('Missing Fields', 'Please fill in all required fields');
      return;
    }

    const newEarning: RecurringEarning = {
      id: Date.now().toString(),
      title: formData.title,
      platformName: formData.platformName,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      isActive: true,
      nextOccurrence: calculateNextOccurrence(formData.startDate, formData.frequency),
      totalGenerated: 0,
    };

    saveToStorage([...earnings, newEarning]);
    notify.success('Recurring Earning Created', `Set up recurring earning: ${formData.title}`);

    setFormData({
      title: '',
      platformName: '',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setShowForm(false);
  };

  const calculateNextOccurrence = (startDate: string, frequency: string): string => {
    const date = new Date(startDate);
    const today = new Date();

    while (date < today) {
      switch (frequency) {
        case 'daily':
          date.setDate(date.getDate() + 1);
          break;
        case 'weekly':
          date.setDate(date.getDate() + 7);
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + 1);
          break;
        case 'yearly':
          date.setFullYear(date.getFullYear() + 1);
          break;
      }
    }

    return date.toISOString().split('T')[0];
  };

  const toggleActive = (id: string) => {
    const updated = earnings.map((e) =>
      e.id === id ? { ...e, isActive: !e.isActive } : e
    );
    saveToStorage(updated);
    notify.info('Status Updated', 'Recurring earning status changed');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this recurring earning?')) return;

    const updated = earnings.filter((e) => e.id !== id);
    saveToStorage(updated);
    notify.success('Deleted', 'Recurring earning removed');
  };

  const getFrequencyText = (frequency: string) => {
    const map: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return map[frequency] || frequency;
  };

  const getFrequencyColor = (frequency: string) => {
    const map: Record<string, string> = {
      daily: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      weekly: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      monthly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      yearly: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return map[frequency] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Earnings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Set up automatic recurring income tracking
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            New Recurring Earning
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Monthly Retainer, Subscription"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Platform *
                </label>
                <input
                  type="text"
                  value={formData.platformName}
                  onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                  placeholder="e.g., Upwork, Patreon"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frequency *
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: FormValidation.parseFrequency(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Create Recurring Earning
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {earnings.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Clock className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No recurring earnings yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Set up automated income tracking
            </p>
          </div>
        ) : (
          earnings.map((earning) => (
            <div
              key={earning.id}
              className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {earning.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(earning.frequency)}`}>
                      {getFrequencyText(earning.frequency)}
                    </span>
                    {earning.isActive ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Paused
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {earning.platformName}
                  </p>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Amount</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${earning.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Next Occurrence</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {earning.nextOccurrence}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Total Generated</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${earning.totalGenerated.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(earning.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={earning.isActive ? 'Pause' : 'Resume'}
                  >
                    {earning.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(earning.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
