import React, { useState } from 'react';
import { useMonitoring } from '../hooks/useMonitoring';
import LiveMetrics from '../components/LiveMetrics';
import TeamStatusWidget from '../components/TeamStatusWidget';
import SLAometer from '../components/SLAometer';
import QueueMonitor from '../components/QueueMonitor';
import {
  ArrowPathIcon,
  SignalIcon,
  SignalSlashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MonitoringDashboard: React.FC = () => {
  const { data, loading, error, connected, refetch } = useMonitoring(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Prepare chart data
  const chatsByHourData = data.performance?.chatsByHour || [];
  const topIssuesData = data.performance?.topIssues || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support Monitoring Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time operational monitoring for support team</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm">
              {connected ? (
                <>
                  <SignalIcon className="w-5 h-5 text-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-700">Live</span>
                </>
              ) : (
                <>
                  <SignalSlashIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Offline</span>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Metrics */}
      <div className="mb-8">
        <LiveMetrics metrics={data.metrics} loading={loading} />
      </div>

      {/* SLA and Queue Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SLAometer slaStatus={data.slaStatus} loading={loading} />
        <QueueMonitor queueStatus={data.queueStatus} loading={loading} />
      </div>

      {/* Team Status */}
      <div className="mb-8">
        <TeamStatusWidget teamMembers={data.teamStatus} loading={loading} />
      </div>

      {/* Performance Charts */}
      {data.performance && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <ChartBarIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chats by Hour */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Chats by Hour</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chatsByHourData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(hour) => `${hour}:00`}
                    formatter={(value) => [`${value} chats`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Issues */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Issues</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topIssuesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ issue, percent }) => `${issue} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {topIssuesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agent Performance */}
          {data.performance.responseTimeByAgent.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Response Times</h3>
              <div className="space-y-4">
                {data.performance.responseTimeByAgent.map((agent, index) => {
                  const maxTime = Math.max(...data.performance!.responseTimeByAgent.map(a => a.avgTime));
                  const percentage = (agent.avgTime / maxTime) * 100;

                  return (
                    <div key={agent.agentId} className="flex items-center">
                      <div className="w-32 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">{agent.agentName}</p>
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              agent.avgTime < 45 ? 'bg-green-500' : agent.avgTime < 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-20 flex-shrink-0 text-right">
                        <span className="text-sm font-semibold text-gray-900">{agent.avgTime}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-1">Total Chats</p>
              <p className="text-3xl font-bold">{data.performance.totalChats}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-1">Total Messages</p>
              <p className="text-3xl font-bold">{data.performance.totalMessages}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-1">First Response</p>
              <p className="text-3xl font-bold">{data.performance.firstResponseTime}s</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-1">Satisfaction</p>
              <p className="text-3xl font-bold">{data.performance.customerSatisfaction}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;
