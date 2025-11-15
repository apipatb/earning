import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { analyticsAPI, earningsAPI } from '../lib/api';
import { format } from 'date-fns';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [recentEarnings, setRecentEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, earningsRes] = await Promise.all([
        analyticsAPI.getSummary({ period: 'month' }),
        earningsAPI.getAll({ limit: 5 }),
      ]);
      setSummary(summaryRes.data);
      setRecentEarnings(earningsRes.data.earnings);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Earning
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Earned (This Month)
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  ${summary?.total_earnings?.toFixed(2) || '0.00'}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Hours Worked
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {summary?.total_hours?.toFixed(1) || '0.0'}h
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Avg Hourly Rate
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  ${summary?.avg_hourly_rate?.toFixed(2) || '0.00'}/h
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* By Platform */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Earnings by Platform
        </h2>
        <div className="space-y-3">
          {summary?.by_platform?.map((platform: any) => (
            <div key={platform.platform.id} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: platform.platform.color || '#3b82f6' }}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {platform.platform.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    ${platform.earnings.toFixed(2)} ({platform.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="mt-1 flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${platform.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!summary?.by_platform || summary.by_platform.length === 0) && (
            <p className="text-sm text-gray-500">No earnings data yet</p>
          )}
        </div>
      </div>

      {/* Recent Earnings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Entries</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentEarnings.map((earning) => (
            <li key={earning.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-2 h-2 rounded-full mr-3"
                    style={{ backgroundColor: earning.platform.color || '#3b82f6' }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {earning.platform.name}
                    </p>
                    <p className="text-sm text-gray-500">{earning.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${earning.amount.toFixed(2)}
                  </p>
                  {earning.hours && (
                    <p className="text-sm text-gray-500">
                      {earning.hours}h · ${earning.hourly_rate?.toFixed(2)}/h
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
          {recentEarnings.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-gray-500">
              No earnings yet. Add your first entry!
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
