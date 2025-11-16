import { Clock, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface SLAIndicatorProps {
  createdAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  slaResponseTime?: number; // in minutes
  slaResolveTime?: number; // in minutes
  slaBreach: boolean;
  compact?: boolean;
}

export default function SLAIndicator({
  createdAt,
  firstResponseAt,
  resolvedAt,
  slaResponseTime,
  slaResolveTime,
  slaBreach,
  compact = false,
}: SLAIndicatorProps) {
  const calculateElapsedTime = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    return Math.floor((endTime - startTime) / (1000 * 60)); // in minutes
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  };

  const getProgressPercentage = (elapsed: number, sla: number) => {
    return Math.min((elapsed / sla) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (isCompleted: boolean, isBreach: boolean) => {
    if (isCompleted && !isBreach) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (isBreach) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    } else {
      return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  // Calculate times
  const responseElapsed = calculateElapsedTime(createdAt, firstResponseAt);
  const resolveElapsed = calculateElapsedTime(createdAt, resolvedAt);

  // Calculate progress percentages
  const responseProgress = slaResponseTime ? getProgressPercentage(responseElapsed, slaResponseTime) : 0;
  const resolveProgress = slaResolveTime ? getProgressPercentage(resolveElapsed, slaResolveTime) : 0;

  // Determine if SLAs are met
  const responseCompleted = !!firstResponseAt;
  const resolveCompleted = !!resolvedAt;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {slaBreach ? (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Breach</span>
          </div>
        ) : resolveCompleted ? (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Met</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">
              {slaResolveTime && `${Math.floor(((slaResolveTime - resolveElapsed) / slaResolveTime) * 100)}%`}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Response Time SLA */}
      {slaResponseTime && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {getStatusIcon(responseCompleted, slaBreach && !responseCompleted)}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Time</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(responseElapsed)} / {formatTime(slaResponseTime)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                responseCompleted ? 'bg-green-500' : getProgressColor(responseProgress)
              }`}
              style={{ width: `${responseCompleted ? 100 : responseProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Resolution Time SLA */}
      {slaResolveTime && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {getStatusIcon(resolveCompleted, slaBreach && !resolveCompleted)}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resolution Time</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(resolveElapsed)} / {formatTime(slaResolveTime)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                resolveCompleted ? 'bg-green-500' : getProgressColor(resolveProgress)
              }`}
              style={{ width: `${resolveCompleted ? 100 : resolveProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* SLA Breach Warning */}
      {slaBreach && !resolveCompleted && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-700 dark:text-red-300">SLA targets exceeded</span>
        </div>
      )}
    </div>
  );
}
