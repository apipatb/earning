import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Edit2, Trash2, Play, Pause, Calendar, DollarSign, Clock, Save, X } from 'lucide-react';
import { notify } from '../store/notification.store';

interface RecurringTemplate {
  id: string;
  name: string;
  description: string;
  amount: number;
  platformId: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  startDate: string;
  endDate?: string;
  isActive: boolean;
  lastGenerated?: string;
  nextScheduled: string;
  tags: string[];
  notes: string;
  autoApply: boolean;
  createdAt: string;
}

export default function RecurringTemplates() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RecurringTemplate>>({
    name: '',
    description: '',
    amount: 0,
    platformId: '',
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: new Date().toISOString().split('T')[0],
    isActive: true,
    tags: [],
    notes: '',
    autoApply: false,
  });

  useEffect(() => {
    loadTemplates();
    loadPlatforms();
    checkAndGenerateEarnings();
  }, []);

  const loadTemplates = () => {
    const stored = localStorage.getItem('recurring_templates');
    if (stored) {
      setTemplates(JSON.parse(stored));
    }
  };

  const loadPlatforms = () => {
    const stored = localStorage.getItem('platforms');
    if (stored) {
      setPlatforms(JSON.parse(stored));
    }
  };

  const saveTemplates = (newTemplates: RecurringTemplate[]) => {
    localStorage.setItem('recurring_templates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const calculateNextScheduled = (template: Partial<RecurringTemplate>, fromDate?: Date): string => {
    const start = fromDate || new Date(template.startDate || new Date());
    const next = new Date(start);

    switch (template.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        if (template.dayOfMonth) {
          next.setDate(template.dayOfMonth);
        }
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next.toISOString().split('T')[0];
  };

  const handleCreate = () => {
    if (!formData.name || !formData.platformId || !formData.amount) {
      notify.warning('Missing Fields', 'Please fill in all required fields');
      return;
    }

    const newTemplate: RecurringTemplate = {
      id: `template-${Date.now()}`,
      name: formData.name!,
      description: formData.description || '',
      amount: formData.amount!,
      platformId: formData.platformId!,
      frequency: formData.frequency!,
      dayOfWeek: formData.dayOfWeek,
      dayOfMonth: formData.dayOfMonth,
      startDate: formData.startDate!,
      endDate: formData.endDate,
      isActive: formData.isActive!,
      tags: formData.tags || [],
      notes: formData.notes || '',
      autoApply: formData.autoApply || false,
      nextScheduled: calculateNextScheduled(formData),
      createdAt: new Date().toISOString(),
    };

    saveTemplates([...templates, newTemplate]);
    resetForm();
    notify.success('Created', 'Recurring template created successfully');
  };

  const handleUpdate = () => {
    if (!editingId) return;

    const updated = templates.map(t =>
      t.id === editingId
        ? {
            ...t,
            ...formData,
            nextScheduled: calculateNextScheduled(formData),
          }
        : t
    );

    saveTemplates(updated);
    resetForm();
    notify.success('Updated', 'Template updated successfully');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    saveTemplates(templates.filter(t => t.id !== id));
    notify.success('Deleted', 'Template deleted');
  };

  const toggleActive = (id: string) => {
    const updated = templates.map(t =>
      t.id === id ? { ...t, isActive: !t.isActive } : t
    );
    saveTemplates(updated);
  };

  const generateEarning = (template: RecurringTemplate) => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');

    const newEarning = {
      id: `earning-${Date.now()}`,
      amount: template.amount,
      platformId: template.platformId,
      date: template.nextScheduled,
      description: `${template.name} (Auto-generated)`,
      notes: template.notes,
      tags: template.tags,
      isRecurring: true,
      templateId: template.id,
      createdAt: new Date().toISOString(),
    };

    earnings.push(newEarning);
    localStorage.setItem('earnings', JSON.stringify(earnings));

    // Update template
    const updated = templates.map(t =>
      t.id === template.id
        ? {
            ...t,
            lastGenerated: template.nextScheduled,
            nextScheduled: calculateNextScheduled(t, new Date(template.nextScheduled)),
          }
        : t
    );

    saveTemplates(updated);
    notify.success('Generated', `Earning of $${template.amount} added from template`);
  };

  const checkAndGenerateEarnings = () => {
    const today = new Date().toISOString().split('T')[0];

    templates.forEach(template => {
      if (template.isActive && template.autoApply && template.nextScheduled <= today) {
        generateEarning(template);
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: 0,
      platformId: '',
      frequency: 'monthly',
      dayOfMonth: 1,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
      tags: [],
      notes: '',
      autoApply: false,
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (template: RecurringTemplate) => {
    setFormData(template);
    setEditingId(template.id);
    setIsCreating(true);
  };

  const getFrequencyLabel = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
            <RefreshCw className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recurring Templates</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Automate regular earnings with templates
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Template List */}
      {!isCreating && templates.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Templates Yet</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Create recurring templates for regular earnings
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Create First Template
          </button>
        </div>
      ) : !isCreating ? (
        <div className="space-y-3">
          {templates.map(template => {
            const platform = platforms.find(p => p.id === template.platformId);

            return (
              <div
                key={template.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        template.isActive
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {template.isActive ? 'Active' : 'Paused'}
                      </span>
                      {template.autoApply && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          Auto
                        </span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white font-medium">
                          ${template.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {getFrequencyLabel(template.frequency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Next: {new Date(template.nextScheduled).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {platform?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleActive(template.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={template.isActive ? 'Pause' : 'Activate'}
                    >
                      {template.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => generateEarning(template)}
                      className="p-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                      title="Generate Now"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(template)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Create/Edit Form */
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Template' : 'New Template'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Monthly Retainer"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Platform *
              </label>
              <select
                value={formData.platformId}
                onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select platform...</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

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
                Frequency *
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Day of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.autoApply}
                  onChange={(e) => setFormData({ ...formData, autoApply: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Auto-generate earnings</span>
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update' : 'Create'} Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
