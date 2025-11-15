import React, { useState } from 'react';
import { FileText, Download, Clock, BarChart3 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

export const AdvancedReports: React.FC = () => {
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('json');

  // Get analytics dashboard
  const { data: analytics } = useQuery({
    queryKey: ['analyticsDashboard'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/reports/dashboard?period=month');
      return response.data;
    },
  });

  // Get scheduled reports
  const { data: scheduledReports, refetch } = useQuery({
    queryKey: ['scheduledReports'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/reports/scheduled');
      return response.data;
    },
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/v1/reports/generate', {
        startDate,
        endDate,
        format,
      });
      return response.data;
    },
  });

  // Create scheduled report
  const createScheduledMutation = useMutation({
    mutationFn: async (frequency: string) => {
      const response = await axios.post('/api/v1/reports/scheduled', {
        name: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Report`,
        frequency,
        format: 'csv',
        recipients: [],
      });
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Advanced Reports & Analytics</h1>
          <p className="text-xl text-slate-300">
            Generate detailed earnings reports and automated insights
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Generate Report */}
          <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Generate Report
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-slate-300 block mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-600 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-600 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-2">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-600 text-white"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <button
                onClick={() => generateReportMutation.mutate()}
                disabled={generateReportMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-green-600 to-blue-600 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              This Month Summary
            </h2>

            {analytics && (
              <div className="space-y-4">
                <div className="bg-black/20 p-4 rounded-lg">
                  <p className="text-green-100 text-sm">Total Earnings</p>
                  <p className="text-3xl font-bold text-white">
                    ${analytics.summary.totalEarnings.toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 p-3 rounded-lg">
                    <p className="text-green-100 text-xs">Avg Daily</p>
                    <p className="text-xl font-bold text-white">
                      ${analytics.summary.avgDaily.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-lg">
                    <p className="text-green-100 text-xs">Days Tracked</p>
                    <p className="text-xl font-bold text-white">
                      {analytics.summary.daysTracked}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scheduled Reports */}
        <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Scheduled Reports
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {['daily', 'weekly', 'monthly'].map((freq) => (
              <button
                key={freq}
                onClick={() => createScheduledMutation.mutate(freq)}
                disabled={createScheduledMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg capitalize disabled:opacity-50"
              >
                {createScheduledMutation.isPending ? 'Creating...' : `Schedule ${freq}`}
              </button>
            ))}
          </div>

          {scheduledReports && scheduledReports.length > 0 ? (
            <div className="space-y-3">
              {scheduledReports.map((report: any) => (
                <div key={report.id} className="bg-slate-600/50 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{report.name}</p>
                    <p className="text-sm text-slate-400 capitalize">
                      Every {report.frequency}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    report.isActive
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {report.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">No scheduled reports yet</p>
          )}
        </div>

        {/* Top Platforms */}
        {analytics?.topPlatforms && (
          <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-6">Top Platforms</h2>

            <div className="space-y-3">
              {Object.entries(analytics.topPlatforms)
                .slice(0, 5)
                .map(([platform, earnings], index) => (
                  <div key={platform} className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-yellow-400">#{index + 1}</span>
                      <span className="text-white font-semibold">{platform}</span>
                    </div>
                    <span className="text-xl font-bold text-green-400">
                      ${Number(earnings).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedReports;
