import React from 'react';
import { SLAStatus } from '../hooks/useMonitoring';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface SLAometerProps {
  slaStatus: SLAStatus | null;
  loading?: boolean;
}

const CircularProgress: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ percentage, size = 120, strokeWidth = 8, color = '#10b981' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
    <div className="flex items-center justify-center mb-6">
      <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="text-center">
          <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
        </div>
      ))}
    </div>
  </div>
);

export const SLAometer: React.FC<SLAometerProps> = ({ slaStatus, loading }) => {
  if (loading || !slaStatus) {
    return <LoadingSkeleton />;
  }

  const getSLAColor = (percentage: number): string => {
    if (percentage >= 90) return '#10b981'; // green
    if (percentage >= 75) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getSLAGrade = (percentage: number): string => {
    if (percentage >= 95) return 'Excellent';
    if (percentage >= 90) return 'Good';
    if (percentage >= 75) return 'Fair';
    return 'Needs Improvement';
  };

  const slaColor = getSLAColor(slaStatus.slaPercentage);
  const slaGrade = getSLAGrade(slaStatus.slaPercentage);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">SLA Performance</h2>
          <div className="text-sm text-gray-500">
            Target: {slaStatus.targetResolutionTime}min
          </div>
        </div>

        {/* SLA Meter */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <CircularProgress
              percentage={slaStatus.slaPercentage}
              size={160}
              strokeWidth={12}
              color={slaColor}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color: slaColor }}>
                {slaStatus.slaPercentage}%
              </span>
              <span className="text-sm text-gray-600 mt-1">{slaGrade}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">{slaStatus.withinSLA}</p>
            <p className="text-sm text-green-700">Within SLA</p>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-900">{slaStatus.atRisk}</p>
            <p className="text-sm text-yellow-700">At Risk</p>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <XCircleIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-900">{slaStatus.breachedSLA}</p>
            <p className="text-sm text-red-700">Breached</p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 mr-2" />
              <span>Total Tickets</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{slaStatus.totalTickets}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 mr-2" />
              <span>Avg Resolution Time</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {slaStatus.avgResolutionTime}min
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 mr-2" />
              <span>SLA Target</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {slaStatus.targetResolutionTime}min
            </span>
          </div>
        </div>

        {/* Performance Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Performance Breakdown</span>
            <span className="text-xs text-gray-500">{slaStatus.totalTickets} tickets</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="flex h-full">
              {slaStatus.withinSLA > 0 && (
                <div
                  className="bg-green-500 h-full transition-all duration-500"
                  style={{
                    width: `${(slaStatus.withinSLA / slaStatus.totalTickets) * 100}%`,
                  }}
                  title={`${slaStatus.withinSLA} within SLA`}
                ></div>
              )}
              {slaStatus.atRisk > 0 && (
                <div
                  className="bg-yellow-500 h-full transition-all duration-500"
                  style={{
                    width: `${(slaStatus.atRisk / slaStatus.totalTickets) * 100}%`,
                  }}
                  title={`${slaStatus.atRisk} at risk`}
                ></div>
              )}
              {slaStatus.breachedSLA > 0 && (
                <div
                  className="bg-red-500 h-full transition-all duration-500"
                  style={{
                    width: `${(slaStatus.breachedSLA / slaStatus.totalTickets) * 100}%`,
                  }}
                  title={`${slaStatus.breachedSLA} breached`}
                ></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SLAometer;
