import React from 'react';
import { TeamMemberStatus } from '../hooks/useMonitoring';
import {
  UserCircleIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface TeamStatusWidgetProps {
  teamMembers: TeamMemberStatus[];
  loading?: boolean;
}

const StatusBadge: React.FC<{ status: TeamMemberStatus['status'] }> = ({ status }) => {
  const statusConfig = {
    online: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
      label: 'Online',
    },
    busy: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
      label: 'Busy',
    },
    away: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
      label: 'Away',
    },
    offline: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
      label: 'Offline',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <div className={`w-2 h-2 rounded-full ${config.dot} mr-1.5 animate-pulse`}></div>
      {config.label}
    </div>
  );
};

const TeamMemberCard: React.FC<{ member: TeamMemberStatus }> = ({ member }) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getLastActivityText = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {member.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{member.name}</h4>
            <p className="text-xs text-gray-500">{member.email}</p>
          </div>
        </div>
        <StatusBadge status={member.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center">
          <div className="flex items-center justify-center text-blue-600 mb-1">
            <ChatBubbleLeftIcon className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-gray-900">{member.activeChats}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center text-green-600 mb-1">
            <ChatBubbleLeftIcon className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-gray-900">{member.totalChatsToday}</p>
          <p className="text-xs text-gray-500">Today</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center text-purple-600 mb-1">
            <ClockIcon className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-gray-900">{formatTime(member.avgResponseTime)}</p>
          <p className="text-xs text-gray-500">Avg Time</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Last active: <span className="text-gray-700 font-medium">{getLastActivityText(member.lastActivity)}</span>
        </p>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[1, 2, 3].map((j) => (
            <div key={j} className="text-center">
              <div className="h-4 bg-gray-200 rounded w-4 mx-auto mb-1"></div>
              <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const TeamStatusWidget: React.FC<TeamStatusWidgetProps> = ({ teamMembers, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Team Status</h2>
        <LoadingSkeleton />
      </div>
    );
  }

  const statusCounts = teamMembers.reduce(
    (acc, member) => {
      acc[member.status]++;
      return acc;
    },
    { online: 0, busy: 0, away: 0, offline: 0 }
  );

  const totalActiveChats = teamMembers.reduce((sum, member) => sum + member.activeChats, 0);
  const avgResponseTime = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((sum, member) => sum + member.avgResponseTime, 0) / teamMembers.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Team Status</h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            <span className="text-gray-600">{statusCounts.online} Online</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
            <span className="text-gray-600">{statusCounts.busy} Busy</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
            <span className="text-gray-600">{statusCounts.away} Away</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <UserCircleIcon className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{teamMembers.length}</span>
          </div>
          <p className="text-sm opacity-90">Total Team Members</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <ChatBubbleLeftIcon className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{totalActiveChats}</span>
          </div>
          <p className="text-sm opacity-90">Total Active Chats</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{avgResponseTime}s</span>
          </div>
          <p className="text-sm opacity-90">Team Avg Response</p>
        </div>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <UserCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No team members found</p>
          <p className="text-sm text-gray-500 mt-2">Team members will appear here when they come online</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers
            .sort((a, b) => {
              // Sort by status priority: online > busy > away > offline
              const statusPriority = { online: 4, busy: 3, away: 2, offline: 1 };
              return statusPriority[b.status] - statusPriority[a.status];
            })
            .map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
        </div>
      )}
    </div>
  );
};

export default TeamStatusWidget;
