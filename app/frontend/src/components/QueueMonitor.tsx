import React from 'react';
import { QueueStatus } from '../hooks/useMonitoring';
import {
  QueueListIcon,
  ClockIcon,
  ExclamationCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface QueueMonitorProps {
  queueStatus: QueueStatus | null;
  loading?: boolean;
}

const PriorityBadge: React.FC<{ priority: 'low' | 'medium' | 'high' | 'urgent' }> = ({ priority }) => {
  const priorityConfig = {
    low: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: 'Low',
    },
    medium: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Medium',
    },
    high: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'High',
    },
    urgent: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Urgent',
    },
  };

  const config = priorityConfig[priority];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-6 border-b border-gray-200 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-lg">
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
    <div className="p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-lg">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const QueueMonitor: React.FC<QueueMonitorProps> = ({ queueStatus, loading }) => {
  if (loading || !queueStatus) {
    return <LoadingSkeleton />;
  }

  const formatWaitTime = (minutes: number): string => {
    if (minutes < 1) return '< 1m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getWaitTimeColor = (minutes: number): string => {
    if (minutes < 15) return 'text-green-600';
    if (minutes < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Summary */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Queue Monitor</h2>
          {queueStatus.waiting > 10 && (
            <div className="flex items-center text-red-600">
              <ExclamationCircleIcon className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Queue Building Up</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Waiting */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <QueueListIcon className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-900">{queueStatus.waiting}</span>
            </div>
            <p className="text-sm font-medium text-blue-700">Waiting</p>
            <p className="text-xs text-blue-600 mt-1">
              Avg wait: {formatWaitTime(queueStatus.avgWaitTime)}
            </p>
          </div>

          {/* In Progress */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <ClockIcon className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-green-900">{queueStatus.inProgress}</span>
            </div>
            <p className="text-sm font-medium text-green-700">In Progress</p>
            <p className="text-xs text-green-600 mt-1">Being handled</p>
          </div>

          {/* Longest Wait */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <ExclamationCircleIcon className="w-8 h-8 text-red-600" />
              <span className="text-3xl font-bold text-red-900">
                {formatWaitTime(queueStatus.longestWaitTime)}
              </span>
            </div>
            <p className="text-sm font-medium text-red-700">Longest Wait</p>
            <p className="text-xs text-red-600 mt-1">Requires attention</p>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Waiting Tickets</h3>
          <span className="text-sm text-gray-500">
            {queueStatus.queuedTickets.length} of {queueStatus.waiting} shown
          </span>
        </div>

        {queueStatus.queuedTickets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <QueueListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No tickets in queue</p>
            <p className="text-sm text-gray-500 mt-2">All tickets are being handled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queueStatus.queuedTickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${
                  ticket.priority === 'urgent'
                    ? 'border-red-500 bg-red-50'
                    : ticket.priority === 'high'
                    ? 'border-yellow-500 bg-yellow-50'
                    : ticket.priority === 'medium'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">#{index + 1}</span>
                      <h4 className="text-sm font-semibold text-gray-900">{ticket.title}</h4>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center">
                        <UserIcon className="w-3 h-3 mr-1" />
                        <span>{ticket.customerName}</span>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        <span className={getWaitTimeColor(ticket.waitTime)}>
                          Waiting {formatWaitTime(ticket.waitTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <PriorityBadge priority={ticket.priority} />
                </div>

                {/* Progress bar for wait time */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        ticket.waitTime > 60
                          ? 'bg-red-500'
                          : ticket.waitTime > 30
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min((ticket.waitTime / 90) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        {queueStatus.queuedTickets.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus.queuedTickets.filter((t) => t.priority === 'urgent').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Urgent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus.queuedTickets.filter((t) => t.priority === 'high').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">High</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus.queuedTickets.filter((t) => t.priority === 'medium').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Medium</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus.queuedTickets.filter((t) => t.priority === 'low').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Low</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueMonitor;
