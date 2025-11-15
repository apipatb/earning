import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Briefcase, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { opportunityAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface Opportunity {
  id: string;
  title: string;
  description?: string;
  platform: string;
  category: string;
  estimated_pay?: number;
  difficulty: string;
  deadline?: string;
  url?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: 'upwork',
    category: 'writing',
    estimatedPay: '',
    difficulty: 'medium',
    deadline: '',
    url: '',
    status: 'new',
    notes: '',
  });

  useEffect(() => {
    loadOpportunities();
  }, [filterStatus]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const filters = filterStatus !== 'all' ? { status: filterStatus } : {};
      const data = await opportunityAPI.getOpportunities(filters);
      setOpportunities(data.opportunities || []);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
      notify.error('Error', 'Failed to load opportunities.');
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
        platform: formData.platform,
        category: formData.category,
        estimatedPay: formData.estimatedPay ? parseFloat(formData.estimatedPay) : undefined,
        difficulty: formData.difficulty,
        deadline: formData.deadline || undefined,
        url: formData.url || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await opportunityAPI.updateOpportunity(editingId, payload);
        notify.success('Updated', 'Opportunity updated successfully.');
      } else {
        await opportunityAPI.createOpportunity(payload);
        notify.success('Added', `${formData.title} added successfully.`);
      }

      resetForm();
      loadOpportunities();
    } catch (error) {
      console.error('Failed to save:', error);
      notify.error('Error', 'Failed to save opportunity.');
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setEditingId(opportunity.id);
    setFormData({
      title: opportunity.title,
      description: opportunity.description || '',
      platform: opportunity.platform,
      category: opportunity.category,
      estimatedPay: opportunity.estimated_pay?.toString() || '',
      difficulty: opportunity.difficulty,
      deadline: opportunity.deadline || '',
      url: opportunity.url || '',
      status: opportunity.status,
      notes: opportunity.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this opportunity?')) return;

    try {
      await opportunityAPI.deleteOpportunity(id);
      notify.success('Deleted', 'Opportunity deleted successfully.');
      loadOpportunities();
    } catch (error) {
      console.error('Failed to delete:', error);
      notify.error('Error', 'Failed to delete opportunity.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      platform: 'upwork',
      category: 'writing',
      estimatedPay: '',
      difficulty: 'medium',
      deadline: '',
      url: '',
      status: 'new',
      notes: '',
    });
  };

  const totalEstimatedEarnings = opportunities.reduce((sum, opp) => sum + (opp.estimated_pay || 0), 0);
  const statuses = ['all', ...new Set(opportunities.map(opp => opp.status))];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <CheckCircle className="text-green-600" size={20} />;
      case 'rejected': return <AlertCircle className="text-red-600" size={20} />;
      case 'applied': return <Target className="text-blue-600" size={20} />;
      default: return <Briefcase className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💼 Gig Opportunities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track job opportunities from freelance platforms</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <Plus size={20} />
          New Opportunity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Opportunities</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{opportunities.length}</p>
            </div>
            <Briefcase className="text-gray-600" size={32} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Potential Earnings</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${totalEstimatedEarnings.toFixed(2)}</p>
            </div>
            <Target className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Applied</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {opportunities.filter(o => o.status === 'applied').length}
              </p>
            </div>
            <Target className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Won</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {opportunities.filter(o => o.status === 'won').length}
              </p>
            </div>
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
              filterStatus === status
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Opportunity' : 'Add New Opportunity'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Job Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />

            <textarea
              placeholder="Job Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="upwork">Upwork</option>
                <option value="fiverr">Fiverr</option>
                <option value="freelancer">Freelancer</option>
                <option value="toptal">Toptal</option>
                <option value="guru">Guru</option>
                <option value="other">Other</option>
              </select>

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="writing">Writing</option>
                <option value="design">Design</option>
                <option value="coding">Coding</option>
                <option value="marketing">Marketing</option>
                <option value="video">Video</option>
                <option value="other">Other</option>
              </select>

              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="new">New</option>
                <option value="interested">Interested</option>
                <option value="applied">Applied</option>
                <option value="won">Won</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="number"
                placeholder="Estimated Pay ($)"
                step="0.01"
                value={formData.estimatedPay}
                onChange={(e) => setFormData({ ...formData, estimatedPay: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <input
              type="url"
              placeholder="Job URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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

      {/* Opportunities List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No opportunities yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(opp.status)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{opp.title}</h3>
                    <span className={`px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded font-semibold ${getDifficultyColor(opp.difficulty)}`}>
                      {opp.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{opp.description}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                      <span className="ml-1 font-semibold text-gray-900 dark:text-white">{opp.platform}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Category:</span>
                      <span className="ml-1 font-semibold text-gray-900 dark:text-white">{opp.category}</span>
                    </div>
                    {opp.estimated_pay && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Est. Pay:</span>
                        <span className="ml-1 font-bold text-green-600">${opp.estimated_pay.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  {opp.deadline && (
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Deadline: {opp.deadline}</p>
                  )}
                  {opp.notes && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">Note: {opp.notes}</p>
                  )}
                  {opp.url && (
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                    >
                      View Opportunity →
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(opp)}
                    className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(opp.id)}
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
