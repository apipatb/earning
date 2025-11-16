import { useState, useEffect } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Users,
  Clock,
  Target,
  Filter,
  Download,
  Plus,
  BarChart3,
  Activity,
} from 'lucide-react';
import FunnelChart from '../components/FunnelChart';
import FunnelMetrics from '../components/FunnelMetrics';
import { funnelAPI } from '../lib/api';

// ============================================================================
// Type Definitions
// ============================================================================

interface FunnelDefinition {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  trackingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    events: number;
  };
}

interface FunnelStep {
  name: string;
  order: number;
  conditions?: Record<string, any>;
}

interface StepAnalysis {
  step: string;
  stepNumber: number;
  totalUsers: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeToNext: number;
  avgTimeFromStart: number;
}

interface DropOffPoint {
  step: string;
  stepNumber: number;
  dropOffCount: number;
  dropOffRate: number;
}

interface FunnelAnalysis {
  funnelId: string;
  funnelName: string;
  totalSessions: number;
  completionRate: number;
  averageTimeToComplete: number;
  steps: StepAnalysis[];
  dropOffPoints: DropOffPoint[];
}

interface CohortData {
  cohortDate: string;
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  avgCompletionTime: number;
}

interface SegmentData {
  segment: string;
  totalUsers: number;
  completionRate: number;
  avgCompletionTime: number;
  topDropOffStep: string;
}

type ViewMode = 'overview' | 'cohort' | 'segment';
type TimeRange = '7d' | '30d' | '90d' | 'custom';

// ============================================================================
// Main Component
// ============================================================================

const FunnelAnalysis = () => {
  const [funnels, setFunnels] = useState<FunnelDefinition[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FunnelAnalysis | null>(null);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [segmentData, setSegmentData] = useState<SegmentData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [segmentBy, setSegmentBy] = useState<string>('browser');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all funnels on mount
  useEffect(() => {
    fetchFunnels();
  }, []);

  // Fetch analysis when funnel or time range changes
  useEffect(() => {
    if (selectedFunnel) {
      fetchAnalysis();
    }
  }, [selectedFunnel, timeRange]);

  // Fetch cohort/segment data when view mode changes
  useEffect(() => {
    if (selectedFunnel && viewMode === 'cohort') {
      fetchCohortAnalysis();
    } else if (selectedFunnel && viewMode === 'segment') {
      fetchSegmentAnalysis();
    }
  }, [selectedFunnel, viewMode, timeRange, segmentBy]);

  const fetchFunnels = async () => {
    try {
      setLoading(true);
      const data = await funnelAPI.getFunnels();
      setFunnels(data);
      if (data.length > 0 && !selectedFunnel) {
        setSelectedFunnel(data[0].id);
      }
    } catch (err) {
      setError('Failed to fetch funnels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!selectedFunnel) return;

    try {
      setLoading(true);
      const { periodStart, periodEnd } = getTimeRangeDates();
      const data = await funnelAPI.getFunnelAnalysis(selectedFunnel, periodStart, periodEnd);
      setAnalysis(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch funnel analysis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCohortAnalysis = async () => {
    if (!selectedFunnel) return;

    try {
      setLoading(true);
      const { periodStart, periodEnd } = getTimeRangeDates();
      const data = await funnelAPI.getCohortAnalysis(selectedFunnel, periodStart, periodEnd, 'day');
      setCohortData(data);
    } catch (err) {
      console.error('Failed to fetch cohort analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSegmentAnalysis = async () => {
    if (!selectedFunnel) return;

    try {
      setLoading(true);
      const { periodStart, periodEnd } = getTimeRangeDates();
      const data = await funnelAPI.getSegmentAnalysis(selectedFunnel, segmentBy, periodStart, periodEnd);
      setSegmentData(data);
    } catch (err) {
      console.error('Failed to fetch segment analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeDates = (): { periodStart: string; periodEnd: string } => {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const exportData = () => {
    if (!analysis) return;

    const csvData = [
      ['Step', 'Users', 'Conversion Rate', 'Drop-off Rate', 'Avg Time to Next'],
      ...analysis.steps.map(step => [
        step.step,
        step.totalUsers.toString(),
        `${step.conversionRate.toFixed(2)}%`,
        `${step.dropOffRate.toFixed(2)}%`,
        formatDuration(step.avgTimeToNext),
      ]),
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funnel-analysis-${selectedFunnel}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const selectedFunnelData = funnels.find(f => f.id === selectedFunnel);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Funnel Analysis
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Track conversion rates, identify drop-off points, and optimize your customer journey
            </p>
          </div>
          <button
            onClick={exportData}
            disabled={!analysis}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Funnel Selector and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Funnel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Funnel
            </label>
            <select
              value={selectedFunnel || ''}
              onChange={(e) => setSelectedFunnel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="overview">Overview</option>
              <option value="cohort">Cohort Analysis</option>
              <option value="segment">Segment Analysis</option>
            </select>
          </div>
        </div>

        {/* Segment selector (only shown in segment view) */}
        {viewMode === 'segment' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Segment By
            </label>
            <select
              value={segmentBy}
              onChange={(e) => setSegmentBy(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="browser">Browser</option>
              <option value="device">Device</option>
              <option value="source">Traffic Source</option>
              <option value="location">Location</option>
            </select>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Overview Mode */}
      {!loading && viewMode === 'overview' && analysis && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Sessions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {analysis.totalSessions.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Completion Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {analysis.completionRate.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg. Completion Time
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {formatDuration(analysis.averageTimeToComplete)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Steps
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {analysis.steps.length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Conversion Funnel
            </h2>
            <FunnelChart steps={analysis.steps} />
          </div>

          {/* Step Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Step-by-Step Metrics
            </h2>
            <FunnelMetrics steps={analysis.steps} />
          </div>

          {/* Drop-off Points */}
          {analysis.dropOffPoints.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Drop-off Points
              </h2>
              <div className="space-y-4">
                {analysis.dropOffPoints.slice(0, 5).map((dropOff, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {dropOff.step}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Step {dropOff.stepNumber + 1}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {dropOff.dropOffRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {dropOff.dropOffCount.toLocaleString()} users
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Cohort Analysis Mode */}
      {!loading && viewMode === 'cohort' && cohortData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cohort Analysis
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cohort Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg. Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {cohortData.map((cohort, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cohort.cohortDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cohort.totalUsers.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {cohort.completedUsers.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">
                        {cohort.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDuration(cohort.avgCompletionTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Segment Analysis Mode */}
      {!loading && viewMode === 'segment' && segmentData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Segment Analysis by {segmentBy}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Segment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg. Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Top Drop-off
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {segmentData.map((segment, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {segment.segment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {segment.totalUsers.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400">
                        {segment.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDuration(segment.avgCompletionTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {segment.topDropOffStep}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && funnels.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Funnels Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first funnel to start tracking conversion rates
          </p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Create Funnel
          </button>
        </div>
      )}
    </div>
  );
};

export default FunnelAnalysis;
