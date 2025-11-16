import React from 'react';
import { MonitoringMetrics } from '../hooks/useMonitoring';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  FaceSmileIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface LiveMetricsProps {
  metrics: MonitoringMetrics | null;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600 bg-blue-50',
    green: 'bg-green-500 text-green-600 bg-green-50',
    yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-50',
    red: 'bg-red-500 text-red-600 bg-red-50',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50',
  };

  const [bgColor, textColor, lightBg] = colorClasses[color].split(' ');

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && trendValue && (
            <div className="mt-2 flex items-center text-sm">
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              ) : trend === 'down' ? (
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
              ) : null}
              <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 p-3 rounded-lg ${lightBg}`}>
          <div className={`w-8 h-8 ${textColor}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="w-14 h-14 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    ))}
  </div>
);

export const LiveMetrics: React.FC<LiveMetricsProps> = ({ metrics, loading }) => {
  if (loading || !metrics) {
    return <LoadingSkeleton />;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const resolutionRate = metrics.totalTicketsToday > 0
    ? ((metrics.resolvedToday / metrics.totalTicketsToday) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Live Metrics</h2>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm text-gray-600">Real-time</span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(metrics.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Chats"
          value={metrics.activeChats}
          subtitle={`${metrics.pendingTickets} pending`}
          icon={<ChatBubbleLeftRightIcon className="w-full h-full" />}
          color="blue"
        />

        <MetricCard
          title="Avg Response Time"
          value={formatTime(metrics.avgResponseTime)}
          subtitle="Last 24 hours"
          icon={<ClockIcon className="w-full h-full" />}
          color="purple"
          trend={metrics.avgResponseTime < 60 ? 'down' : metrics.avgResponseTime > 120 ? 'up' : 'neutral'}
          trendValue={metrics.avgResponseTime < 60 ? 'Excellent' : metrics.avgResponseTime < 120 ? 'Good' : 'Needs attention'}
        />

        <MetricCard
          title="Resolved Today"
          value={`${metrics.resolvedToday}/${metrics.totalTicketsToday}`}
          subtitle={`${resolutionRate}% resolution rate`}
          icon={<CheckCircleIcon className="w-full h-full" />}
          color="green"
          trend={parseFloat(resolutionRate) >= 80 ? 'up' : 'down'}
          trendValue={`${resolutionRate}%`}
        />

        <MetricCard
          title="Customer Satisfaction"
          value={`${metrics.customerSatisfaction}%`}
          subtitle={`Avg resolution: ${metrics.avgResolutionTime}m`}
          icon={<FaceSmileIcon className="w-full h-full" />}
          color={metrics.customerSatisfaction >= 90 ? 'green' : metrics.customerSatisfaction >= 75 ? 'yellow' : 'red'}
          trend={metrics.customerSatisfaction >= 90 ? 'up' : metrics.customerSatisfaction >= 75 ? 'neutral' : 'down'}
          trendValue={metrics.customerSatisfaction >= 90 ? 'Excellent' : metrics.customerSatisfaction >= 75 ? 'Good' : 'Below target'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Today's Volume</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{metrics.totalTicketsToday}</span>
            <span className="ml-2 text-sm text-gray-500">tickets</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Resolution Time</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{metrics.avgResolutionTime}</span>
            <span className="ml-2 text-sm text-gray-500">minutes</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Tickets</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{metrics.pendingTickets}</span>
            <span className="ml-2 text-sm text-gray-500">waiting</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  metrics.pendingTickets > 10 ? 'bg-red-500' : metrics.pendingTickets > 5 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((metrics.pendingTickets / 20) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMetrics;
