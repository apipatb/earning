import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Plugin {
  pluginId: string;
  name: string;
  description: string;
  category: string;
  version: string;
  downloadCount: number;
  rating: number;
  reviewCount: number;
  price: number;
  publisher: { name: string };
  tags: string[];
}

interface PluginReview {
  id: string;
  rating: number;
  comment: string;
  author: { name: string };
  createdAt: string;
}

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('browse');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<any[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<any | null>(null);
  const [reviews, setReviews] = useState<PluginReview[]>([]);
  const [loading, setLoading] = useState(false);

  // Search and filter
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('downloads');
  const [stats, setStats] = useState<any>(null);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [newPlugin, setNewPlugin] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    category: 'tools',
    documentation: '',
  });

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchPlugins();
      fetchStats();
    } else if (activeTab === 'installed') {
      fetchInstalledPlugins();
    }
  }, [activeTab, search, category, sort]);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/marketplace/plugins', {
        params: { search, category, sort },
      });
      setPlugins(res.data.plugins);
    } catch (error) {
      console.error('Error fetching plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/v1/marketplace/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchInstalledPlugins = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/marketplace/installed');
      setInstalledPlugins(res.data);
    } catch (error) {
      console.error('Error fetching installed plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewPluginDetails = async (pluginId: string) => {
    try {
      const [detailsRes, reviewsRes] = await Promise.all([
        axios.get(`/api/v1/marketplace/plugins/${pluginId}`),
        axios.get(`/api/v1/marketplace/plugins/${pluginId}/reviews`),
      ]);
      setSelectedPlugin(detailsRes.data);
      setReviews(reviewsRes.data.reviews);
    } catch (error) {
      console.error('Error fetching plugin details:', error);
    }
  };

  const installPlugin = async (pluginId: string) => {
    try {
      await axios.post(`/api/v1/marketplace/plugins/${pluginId}/install`);
      alert('Plugin installed successfully!');
      setSelectedPlugin(null);
      fetchInstalledPlugins();
    } catch (error) {
      console.error('Error installing plugin:', error);
      alert('Failed to install plugin');
    }
  };

  const uninstallPlugin = async (pluginId: string) => {
    try {
      await axios.delete(`/api/v1/marketplace/plugins/${pluginId}/uninstall`);
      alert('Plugin uninstalled');
      fetchInstalledPlugins();
    } catch (error) {
      console.error('Error uninstalling plugin:', error);
    }
  };

  const submitReview = async (pluginId: string) => {
    try {
      await axios.post(`/api/v1/marketplace/plugins/${pluginId}/review`, {
        rating,
        comment,
      });
      alert('Review submitted!');
      setRating(5);
      setComment('');
      viewPluginDetails(pluginId);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const publishPlugin = async () => {
    try {
      await axios.post('/api/v1/marketplace/plugins', newPlugin);
      alert('Plugin created! Navigate to My Plugins to publish it.');
      setNewPlugin({ name: '', description: '', version: '1.0.0', category: 'tools', documentation: '' });
    } catch (error) {
      console.error('Error creating plugin:', error);
      alert('Failed to create plugin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Plugin Marketplace</h1>
          <p className="text-gray-400">Discover and install plugins to extend your earnings tracker</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700 flex gap-8">
          {[
            { id: 'browse', label: '🔍 Browse Plugins' },
            { id: 'installed', label: '✅ Installed' },
            { id: 'create', label: '🚀 Create Plugin' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browse Plugins Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Total Plugins</div>
                  <div className="text-3xl font-bold text-blue-400 mt-2">{stats.stats.totalPlugins}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Total Installations</div>
                  <div className="text-3xl font-bold text-green-400 mt-2">{stats.stats.totalInstallations}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Reviews</div>
                  <div className="text-3xl font-bold text-purple-400 mt-2">{stats.stats.totalReviews}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Categories</div>
                  <div className="text-3xl font-bold text-orange-400 mt-2">{stats.stats.uniqueCategories}</div>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search plugins..."
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                  >
                    <option value="">All Categories</option>
                    <option value="automation">Automation</option>
                    <option value="analytics">Analytics</option>
                    <option value="integration">Integration</option>
                    <option value="tools">Tools</option>
                    <option value="widgets">Widgets</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                  >
                    <option value="downloads">Most Downloaded</option>
                    <option value="rating">Highest Rated</option>
                    <option value="recent">Most Recent</option>
                    <option value="trending">Trending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Plugin Grid */}
            {selectedPlugin ? (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedPlugin.plugin.name}</h2>
                    <p className="text-gray-400 mt-2">{selectedPlugin.plugin.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPlugin(null)}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    Back
                  </button>
                </div>

                {/* Plugin Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Rating</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      ⭐ {selectedPlugin.plugin.rating}/5
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Downloads</div>
                    <div className="text-2xl font-bold text-blue-400">{selectedPlugin.stats.downloads}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Version</div>
                    <div className="text-2xl font-bold text-green-400">{selectedPlugin.plugin.version}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Reviews</div>
                    <div className="text-2xl font-bold text-purple-400">{selectedPlugin.stats.reviewCount}</div>
                  </div>
                </div>

                {/* Install Button */}
                <button
                  onClick={() => installPlugin(selectedPlugin.plugin.pluginId)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                >
                  Install Plugin
                </button>

                {/* Reviews Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Reviews ({reviews.length})</h3>

                  {/* Write Review */}
                  <div className="bg-gray-700 rounded p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Your Rating</label>
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded border border-gray-500"
                      >
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>
                            {'⭐'.repeat(r)} {r}/5
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded border border-gray-500 h-20 resize-none"
                      />
                    </div>
                    <button
                      onClick={() => submitReview(selectedPlugin.plugin.pluginId)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Submit Review
                    </button>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-gray-700 rounded p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{review.author.name}</p>
                            <p className="text-sm text-gray-400">⭐ {review.rating}/5</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {review.comment && <p className="text-gray-300 mt-2">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.pluginId}
                    onClick={() => viewPluginDetails(plugin.pluginId)}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 cursor-pointer transition transform hover:scale-105"
                  >
                    <h3 className="text-lg font-bold text-white mb-2">{plugin.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{plugin.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {plugin.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-400">Rating</div>
                        <div className="text-yellow-400 font-semibold">⭐ {plugin.rating}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Downloads</div>
                        <div className="text-blue-400 font-semibold">{plugin.downloadCount}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-500">by {plugin.publisher.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Installed Tab */}
        {activeTab === 'installed' && (
          <div className="space-y-4">
            {installedPlugins.length > 0 ? (
              installedPlugins.map((install) => (
                <div key={install.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{install.plugin.name}</h3>
                      <p className="text-gray-400 text-sm mt-1">{install.plugin.description}</p>
                      <p className="text-xs text-gray-500 mt-2">Version: {install.version}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => uninstallPlugin(install.pluginId)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Uninstall
                      </button>
                      <button
                        className={`px-4 py-2 rounded transition ${
                          install.isActive
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                        } text-white`}
                      >
                        {install.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-12">
                <p>No plugins installed yet</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Browse Plugins
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Plugin Tab */}
        {activeTab === 'create' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Plugin</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plugin Name</label>
                <input
                  type="text"
                  value={newPlugin.name}
                  onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
                  placeholder="e.g., Advanced Report Generator"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newPlugin.description}
                  onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
                  placeholder="Describe what your plugin does..."
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Version</label>
                  <input
                    type="text"
                    value={newPlugin.version}
                    onChange={(e) => setNewPlugin({ ...newPlugin, version: e.target.value })}
                    placeholder="1.0.0"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={newPlugin.category}
                    onChange={(e) => setNewPlugin({ ...newPlugin, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                  >
                    <option value="tools">Tools</option>
                    <option value="automation">Automation</option>
                    <option value="analytics">Analytics</option>
                    <option value="integration">Integration</option>
                    <option value="widgets">Widgets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Documentation</label>
                <textarea
                  value={newPlugin.documentation}
                  onChange={(e) => setNewPlugin({ ...newPlugin, documentation: e.target.value })}
                  placeholder="Provide documentation for your plugin..."
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none h-24 resize-none"
                />
              </div>

              <button
                onClick={publishPlugin}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
              >
                Create Plugin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
