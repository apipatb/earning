import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Link2, BarChart3, Copy } from 'lucide-react';
import { affiliateLinkAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface AffiliateLink {
  id: string;
  name: string;
  description?: string;
  url: string;
  category: string;
  click_count: number;
  earnings: number;
  conversion_rate?: number;
  is_active: boolean;
  created_at: string;
}

export default function AffiliateLinks() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEarningForm, setShowEarningForm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    category: 'tech',
    conversionRate: '',
    isActive: true,
  });

  const [earningData, setEarningData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    loadLinks();
  }, [filterCategory]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const filters = filterCategory !== 'all' ? { category: filterCategory } : {};
      const data = await affiliateLinkAPI.getAffiliateLinks(filters);
      setLinks(data.affiliate_links || []);
    } catch (error) {
      console.error('Failed to load links:', error);
      notify.error('Error', 'Failed to load affiliate links.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        url: formData.url,
        category: formData.category,
        conversionRate: formData.conversionRate ? parseFloat(formData.conversionRate) : undefined,
        isActive: formData.isActive,
      };

      if (editingId) {
        await affiliateLinkAPI.updateAffiliateLink(editingId, payload);
        notify.success('Updated', 'Affiliate link updated successfully.');
      } else {
        await affiliateLinkAPI.createAffiliateLink(payload);
        notify.success('Added', `${formData.name} added successfully.`);
      }

      resetForm();
      loadLinks();
    } catch (error) {
      console.error('Failed to save:', error);
      notify.error('Error', 'Failed to save affiliate link.');
    }
  };

  const handleAddEarning = async (e: React.FormEvent, linkId: string) => {
    e.preventDefault();
    try {
      const payload = {
        amount: parseFloat(earningData.amount),
        date: earningData.date,
        description: earningData.description || undefined,
      };

      await affiliateLinkAPI.addEarning(linkId, payload);
      notify.success('Added', 'Earning recorded successfully.');
      setEarningData({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });
      setShowEarningForm(null);
      loadLinks();
    } catch (error) {
      console.error('Failed to add earning:', error);
      notify.error('Error', 'Failed to record earning.');
    }
  };

  const handleEdit = (link: AffiliateLink) => {
    setEditingId(link.id);
    setFormData({
      name: link.name,
      description: link.description || '',
      url: link.url,
      category: link.category,
      conversionRate: link.conversion_rate?.toString() || '',
      isActive: link.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this affiliate link?')) return;

    try {
      await affiliateLinkAPI.deleteAffiliateLink(id);
      notify.success('Deleted', 'Affiliate link deleted successfully.');
      loadLinks();
    } catch (error) {
      console.error('Failed to delete:', error);
      notify.error('Error', 'Failed to delete affiliate link.');
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    notify.success('Copied', 'Link copied to clipboard.');
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      url: '',
      category: 'tech',
      conversionRate: '',
      isActive: true,
    });
  };

  const totalEarnings = links.reduce((sum, link) => sum + link.earnings, 0);
  const totalClicks = links.reduce((sum, link) => sum + link.click_count, 0);
  const categories = ['all', ...new Set(links.map(link => link.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🔗 Affiliate Link Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track clicks and earnings from your affiliate links</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Earnings</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${totalEarnings.toFixed(2)}</p>
            </div>
            <BarChart3 className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Clicks</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{totalClicks}</p>
            </div>
            <Link2 className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Active Links</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{links.filter(l => l.is_active).length}</p>
            </div>
            <Link2 className="text-purple-600" size={32} />
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
            {editingId ? 'Edit Affiliate Link' : 'Add New Affiliate Link'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Link Name (e.g., AWS Affiliate)"
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
                <option value="tech">Tech</option>
                <option value="finance">Finance</option>
                <option value="products">Products</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </div>

            <input
              type="url"
              placeholder="Affiliate URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Conversion Rate (%)"
                step="0.01"
                value={formData.conversionRate}
                onChange={(e) => setFormData({ ...formData, conversionRate: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <label className="flex items-center gap-2 px-4 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="text-gray-900 dark:text-white">Active</span>
              </label>
            </div>

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

      {/* Links List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : links.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No affiliate links yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{link.name}</h3>
                    {!link.is_active && <span className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-xs rounded">Inactive</span>}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{link.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-white break-all">
                      {link.url.slice(0, 50)}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(link.url)}
                      className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Clicks</p>
                      <p className="font-bold text-gray-900 dark:text-white">{link.click_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Earnings</p>
                      <p className="font-bold text-green-600">${link.earnings.toFixed(2)}</p>
                    </div>
                    {link.conversion_rate && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Conv. Rate</p>
                        <p className="font-bold text-gray-900 dark:text-white">{link.conversion_rate}%</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {showEarningForm === link.id ? (
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded ml-4 w-64">
                      <form onSubmit={(e) => handleAddEarning(e, link.id)} className="space-y-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          step="0.01"
                          value={earningData.amount}
                          onChange={(e) => setEarningData({ ...earningData, amount: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                          required
                        />
                        <input
                          type="date"
                          value={earningData.date}
                          onChange={(e) => setEarningData({ ...earningData, date: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={earningData.description}
                          onChange={(e) => setEarningData({ ...earningData, description: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-sm">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowEarningForm(null)}
                            className="flex-1 px-2 py-1 bg-gray-400 text-white rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowEarningForm(link.id)}
                        className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                        title="Add Earning"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(link)}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
