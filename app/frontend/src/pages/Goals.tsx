import { useState, useEffect } from 'react';
import { Plus, Target, Edit, Trash2, TrendingUp, Calendar, CheckCircle, XCircle, Download } from 'lucide-react';
import { goalsAPI } from '../lib/api';
import { exportGoalsToCSV } from '../lib/export';
import { notify } from '../store/notification.store';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    deadline: '',
  });

  useEffect(() => {
    loadGoals();
  }, [filterStatus]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await goalsAPI.getGoals(filterStatus === 'all' ? undefined : filterStatus);
      setGoals(data);
    } catch (error) {
      console.error('Failed to load goals:', error);
      notify.error('Error', 'Failed to load goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline || undefined,
      };

      if (editingId) {
        await goalsAPI.updateGoal(editingId, payload);
        notify.success('Goal Updated', 'Your goal has been updated successfully.');
      } else {
        await goalsAPI.createGoal(payload);
        notify.success('Goal Created', `New goal "${formData.title}" has been set!`);
      }

      resetForm();
      loadGoals();
    } catch (error) {
      console.error('Failed to save goal:', error);
      notify.error('Error', 'Failed to save goal. Please try again.');
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await goalsAPI.deleteGoal(id);
      notify.success('Goal Deleted', 'Goal has been removed successfully.');
      loadGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      notify.error('Error', 'Failed to delete goal. Please try again.');
    }
  };

  const handleUpdateProgress = async (id: string) => {
    try {
      await goalsAPI.updateGoalProgress(id);
      notify.success('Progress Updated', 'Goal progress has been refreshed.');
      loadGoals();
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      notify.error('Error', 'Failed to update goal progress. Please try again.');
    }
  };

  const handleStatusChange = async (id: string, status: 'active' | 'completed' | 'cancelled') => {
    try {
      await goalsAPI.updateGoal(id, { status });
      const statusText = status === 'completed' ? 'Congratulations!' : 'Status Updated';
      const message = status === 'completed'
        ? 'You\'ve achieved your goal!'
        : `Goal status changed to ${status}.`;
      notify.success(statusText, message);
      loadGoals();
    } catch (error) {
      console.error('Failed to update goal status:', error);
      notify.error('Error', 'Failed to update goal status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetAmount: '',
      deadline: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalTarget = activeGoals.reduce((sum, g) => sum + Number(g.targetAmount), 0);
  const totalCurrent = activeGoals.reduce((sum, g) => sum + Number(g.currentAmount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading goals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportGoalsToCSV(goals)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={goals.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'active', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 font-medium transition-colors ${
              filterStatus === status
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Active Goals</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{activeGoals.length}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Completed</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{completedGoals.length}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Target</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">${totalTarget.toFixed(2)}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Progress</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">${totalCurrent.toFixed(2)}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Goal' : 'Add New Goal'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Earn $5,000 this month"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="5000.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe your goal and strategy..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update' : 'Add'} Goal
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

      {/* Goals List */}
      <div className="grid grid-cols-1 gap-4">
        {goals.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No goals yet. Click "Add Goal" to get started!</p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = getProgressPercentage(Number(goal.currentAmount), Number(goal.targetAmount));
            const daysLeft = goal.deadline
              ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div key={goal.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(goal.status)}`}>
                        {getStatusIcon(goal.status)}
                        {goal.status}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {goal.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(goal.deadline).toLocaleDateString()}
                            {daysLeft !== null && (
                              <span className={daysLeft < 0 ? 'text-red-600 ml-1' : 'ml-1'}>
                                ({daysLeft < 0 ? 'overdue' : `${daysLeft}d left`})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {goal.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleUpdateProgress(goal.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Update progress from earnings"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      ${Number(goal.currentAmount).toFixed(2)} / ${Number(goal.targetAmount).toFixed(2)}
                    </span>
                    <span className="font-semibold text-blue-600">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        goal.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {goal.status === 'active' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleStatusChange(goal.id, 'completed')}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Mark Complete
                    </button>
                    <button
                      onClick={() => handleStatusChange(goal.id, 'cancelled')}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
