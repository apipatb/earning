import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TrendData {
  period: string;
  totalEarnings: number;
  count: number;
  averageEarning: number;
  growth: number;
}

interface PlatformStats {
  platformId: string;
  platformName: string;
  totalEarnings: number;
  count: number;
  percentageOfTotal: number;
  averageEarning: number;
}

interface GoalAnalysis {
  goalId: string;
  type: string;
  targetAmount: number;
  currentTotal: number;
  progress: number;
  isOnTrack: boolean;
  remaining: number;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  value: number;
  percentage?: number;
  direction?: string;
}

export default function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('trends');
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStats[]>([]);
  const [goals, setGoals] = useState<GoalAnalysis[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [segmentation, setSegmentation] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [trendPeriod, setTrendPeriod] = useState('month');
  const [months, setMonths] = useState(12);
  const [segmentType, setSegmentType] = useState('platform');
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, trendPeriod, months, segmentType]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'trends') {
        const res = await axios.get(`/api/v1/analytics-advanced/trends?period=${trendPeriod}&months=${months}`);
        setTrends(res.data);
      } else if (activeTab === 'platforms') {
        const res = await axios.get(`/api/v1/analytics-advanced/platforms?months=${months}`);
        setPlatforms(res.data);
      } else if (activeTab === 'goals') {
        const res = await axios.get('/api/v1/analytics-advanced/goals');
        setGoals(res.data);
      } else if (activeTab === 'insights') {
        const res = await axios.get('/api/v1/analytics-advanced/insights');
        setInsights(res.data.insights);
      } else if (activeTab === 'segmentation') {
        const res = await axios.get(`/api/v1/analytics-advanced/segmentation?months=${months}&segment=${segmentType}`);
        setSegmentation(res.data);
      } else if (activeTab === 'dashboards') {
        const res = await axios.get('/api/v1/analytics-advanced/dashboards');
        setDashboards(res.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDashboard = async () => {
    try {
      if (!newDashboard.name.trim()) {
        alert('Please enter a dashboard name');
        return;
      }

      await axios.post('/api/v1/analytics-advanced/dashboards', newDashboard);
      setNewDashboard({ name: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating dashboard:', error);
      alert('Failed to create dashboard');
    }
  };

  const deleteDashboard = async (dashboardId: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    try {
      await axios.delete(`/api/v1/analytics-advanced/dashboards/${dashboardId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      alert('Failed to delete dashboard');
    }
  };

  const exportAnalytics = async (format: string) => {
    try {
      const res = await axios.get(`/api/v1/analytics-advanced/export?format=${format}&months=${months}`, {
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics-${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
      } else {
        const dataStr = JSON.stringify(res.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics-${new Date().toISOString()}.json`);
        document.body.appendChild(link);
        link.click();
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Failed to export analytics');
    }
  };

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportAnalytics('json')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportAnalytics('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8 overflow-x-auto">
          {[
            { id: 'trends', label: 'Trends' },
            { id: 'platforms', label: 'Platform Analysis' },
            { id: 'goals', label: 'Goal Progress' },
            { id: 'insights', label: 'Insights' },
            { id: 'segmentation', label: 'Revenue Segmentation' },
            { id: 'dashboards', label: 'Dashboards' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <select
              value={trendPeriod}
              onChange={(e) => setTrendPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Period</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Total Earnings</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Count</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Average</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {trends.map((trend, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{trend.period}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">${trend.totalEarnings.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{trend.count}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">${trend.averageEarning.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded font-medium ${trend.growth > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {trend.growth > 0 ? '+' : ''}{trend.growth.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform Analysis Tab */}
      {activeTab === 'platforms' && (
        <div className="space-y-6">
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((platform) => (
              <div key={platform.platformId} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{platform.platformName}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Earnings</span>
                    <span className="font-medium text-gray-900 dark:text-white">${platform.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Percentage</span>
                    <span className="font-medium text-gray-900 dark:text-white">{platform.percentageOfTotal.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Average</span>
                    <span className="font-medium text-gray-900 dark:text-white">${platform.averageEarning.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Entries</span>
                    <span className="font-medium text-gray-900 dark:text-white">{platform.count}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${platform.percentageOfTotal}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal Progress Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No active goals</div>
          ) : (
            goals.map((goal) => (
              <div key={goal.goalId} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{goal.type} Goal</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Target: ${goal.targetAmount.toFixed(2)}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      goal.isOnTrack
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {goal.isOnTrack ? 'On Track' : 'Behind'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Current: ${goal.currentTotal.toFixed(2)}</span>
                    <span className="text-gray-600 dark:text-gray-400">Remaining: ${goal.remaining.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        goal.progress >= 100
                          ? 'bg-green-600'
                          : goal.progress >= 75
                          ? 'bg-blue-600'
                          : goal.progress >= 50
                          ? 'bg-yellow-600'
                          : 'bg-orange-600'
                      }`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <div className="text-right text-sm font-medium text-gray-900 dark:text-white">
                    {goal.earnedPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{insight.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{insight.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {insight.type === 'consistency' ? insight.value.toFixed(0) : insight.value.toFixed(2)}
                  {insight.type === 'consistency' ? '%' : ''}
                </span>
                {insight.direction && (
                  <span className={insight.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {insight.direction === 'up' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Segmentation Tab */}
      {activeTab === 'segmentation' && segmentation && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <select
              value={segmentType}
              onChange={(e) => setSegmentType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="platform">By Platform</option>
              <option value="category">By Category</option>
              <option value="daily">By Date</option>
            </select>
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Total Revenue: ${segmentation.totalRevenue.toFixed(2)}
            </h3>
            <div className="space-y-3">
              {segmentation.segmentation.map((seg: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{seg.segment}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ${seg.revenue.toFixed(2)} ({seg.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${seg.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dashboards Tab */}
      {activeTab === 'dashboards' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Custom Dashboard</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  value={newDashboard.name}
                  onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Monthly Summary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDashboard.description}
                  onChange={(e) => setNewDashboard({ ...newDashboard, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <button
                onClick={createDashboard}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Dashboard
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Dashboards</h2>
            {dashboards.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No dashboards created yet</div>
            ) : (
              dashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-start"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{dashboard.name}</h3>
                    {dashboard.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{dashboard.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteDashboard(dashboard.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
