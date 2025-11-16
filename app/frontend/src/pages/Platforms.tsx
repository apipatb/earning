import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { platformsAPI, Platform } from '../lib/api';
import { notify } from '../store/notification.store';

export default function Platforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const response = await platformsAPI.getAll();
      setPlatforms(response.data.platforms);
    } catch (error) {
      notify.error('Error', 'Failed to load platforms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this platform?')) return;

    try {
      await platformsAPI.delete(id);
      setPlatforms(platforms.filter((p) => p.id !== id));
      notify.success('Platform Deleted', 'Platform has been removed successfully.');
    } catch (error) {
      notify.error('Error', 'Failed to delete platform. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Platforms</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Platform
        </button>
      </div>

      {/* Active Platforms */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Active ({platforms.filter((p) => p.isActive).length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {platforms
            .filter((p) => p.isActive)
            .map((platform) => (
              <div
                key={platform.id}
                className="bg-white shadow rounded-lg p-6 border-l-4"
                style={{ borderLeftColor: platform.color || '#3b82f6' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {platform.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize mt-1">
                      {platform.category}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-400 hover:text-gray-500">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(platform.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Earned</p>
                    <p className="text-sm font-medium text-gray-900">
                      ${platform.stats.total_earnings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Hours</p>
                    <p className="text-sm font-medium text-gray-900">
                      {platform.stats.total_hours.toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Rate</p>
                    <p className="text-sm font-medium text-gray-900">
                      ${platform.stats.avg_hourly_rate.toFixed(2)}/h
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
        {platforms.filter((p) => p.isActive).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No platforms yet. Add your first one!
          </div>
        )}
      </div>
    </div>
  );
}
