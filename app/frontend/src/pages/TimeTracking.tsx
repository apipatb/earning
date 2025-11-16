import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Calendar, TrendingUp } from 'lucide-react';
import { notify } from '../store/notification.store';

/**
 * Represents a time tracking entry
 */
interface TimeEntry {
  id: string;
  projectName: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  hourlyRate?: number;
  totalEarned?: number;
  date: string;
}

/**
 * Form data for creating a new time entry
 */
interface TimeEntryFormData {
  projectName: string;
  description: string;
  hourlyRate: string;
}

/**
 * Statistics and aggregated data for time tracking
 */
interface TimeStats {
  todayTotal: number; // in seconds
  weekTotal: number; // in seconds
  totalEarned: number; // in dollars
}

/**
 * Timer state for the current tracking session
 */
interface TimerState {
  isTracking: boolean;
  currentEntry: TimeEntry | null;
  elapsedTime: number; // in seconds
}

/**
 * Safely parses stored time entries from localStorage
 */
function parseTimeEntries(jsonString: string): TimeEntry[] {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is TimeEntry => {
        return (
          typeof entry === 'object' &&
          entry !== null &&
          typeof entry.id === 'string' &&
          typeof entry.projectName === 'string' &&
          typeof entry.description === 'string' &&
          typeof entry.startTime === 'string' &&
          typeof entry.duration === 'number' &&
          typeof entry.date === 'string'
        );
      });
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Safely parses a stored time entry from localStorage
 */
function parseTimeEntry(jsonString: string): TimeEntry | null {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'projectName' in parsed &&
      'description' in parsed &&
      'startTime' in parsed &&
      'duration' in parsed &&
      'date' in parsed &&
      typeof (parsed as Record<string, unknown>).id === 'string' &&
      typeof (parsed as Record<string, unknown>).projectName === 'string' &&
      typeof (parsed as Record<string, unknown>).description === 'string' &&
      typeof (parsed as Record<string, unknown>).startTime === 'string' &&
      typeof (parsed as Record<string, unknown>).duration === 'number' &&
      typeof (parsed as Record<string, unknown>).date === 'string'
    ) {
      return parsed as TimeEntry;
    }
    return null;
  } catch {
    return null;
  }
}

export default function TimeTracking() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const [formData, setFormData] = useState<TimeEntryFormData>({
    projectName: '',
    description: '',
    hourlyRate: '',
  });

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('time_entries');
    if (saved) {
      const parsedEntries = parseTimeEntries(saved);
      setEntries(parsedEntries);
    }

    const savedCurrent = localStorage.getItem('current_time_entry');
    if (savedCurrent) {
      const entry = parseTimeEntry(savedCurrent);
      if (entry) {
        setCurrentEntry(entry);
        setIsTracking(true);
        setFormData({
          projectName: entry.projectName,
          description: entry.description,
          hourlyRate: entry.hourlyRate?.toString() || '',
        });
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTracking && currentEntry) {
      interval = setInterval(() => {
        const start = new Date(currentEntry.startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTracking, currentEntry]);

  const startTracking = (): void => {
    if (!formData.projectName) {
      notify.warning('Missing Project Name', 'Please enter a project name');
      return;
    }

    const entry: TimeEntry = {
      id: Date.now().toString(),
      projectName: formData.projectName,
      description: formData.description,
      startTime: new Date().toISOString(),
      duration: 0,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      date: new Date().toISOString().split('T')[0],
    };

    setCurrentEntry(entry);
    setIsTracking(true);
    setElapsedTime(0);
    localStorage.setItem('current_time_entry', JSON.stringify(entry));
    notify.success('Timer Started', `Tracking time for ${entry.projectName}`);
  };

  const stopTracking = (): void => {
    if (!currentEntry) return;

    const endTime = new Date().toISOString();
    const start = new Date(currentEntry.startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = Math.floor((end - start) / 1000);

    const completedEntry: TimeEntry = {
      ...currentEntry,
      endTime,
      duration,
      totalEarned: currentEntry.hourlyRate
        ? (currentEntry.hourlyRate * duration) / 3600
        : undefined,
    };

    const updated = [completedEntry, ...entries];
    setEntries(updated);
    localStorage.setItem('time_entries', JSON.stringify(updated));
    localStorage.removeItem('current_time_entry');

    setCurrentEntry(null);
    setIsTracking(false);
    setElapsedTime(0);
    setFormData({ projectName: '', description: '', hourlyRate: '' });

    notify.success(
      'Time Logged',
      `Tracked ${formatDuration(duration)} for ${completedEntry.projectName}`
    );
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTodayTotal = (): number => {
    const today = new Date().toISOString().split('T')[0];
    return entries
      .filter((e: TimeEntry): boolean => e.date === today)
      .reduce((sum: number, e: TimeEntry): number => sum + e.duration, 0);
  };

  const getWeekTotal = (): number => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entries
      .filter((e: TimeEntry): boolean => new Date(e.date) >= weekAgo)
      .reduce((sum: number, e: TimeEntry): number => sum + e.duration, 0);
  };

  const getTotalEarned = (): number => {
    return entries.reduce((sum: number, e: TimeEntry): number => sum + (e.totalEarned || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your work hours and earnings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-info rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Today</p>
              <p className="text-2xl font-bold mt-1">{formatDuration(getTodayTotal())}</p>
            </div>
            <Clock className="h-8 w-8 text-white/60" />
          </div>
        </div>

        <div className="bg-gradient-success rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">This Week</p>
              <p className="text-2xl font-bold mt-1">{formatDuration(getWeekTotal())}</p>
            </div>
            <Calendar className="h-8 w-8 text-white/60" />
          </div>
        </div>

        <div className="bg-gradient-warning rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Total Earned</p>
              <p className="text-2xl font-bold mt-1">${getTotalEarned().toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-white/60" />
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isTracking ? 'Tracking Time' : 'Start New Timer'}
        </h2>

        {isTracking ? (
          <div className="text-center py-8">
            <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-4 font-mono">
              {formatDuration(elapsedTime)}
            </div>
            <div className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              {currentEntry?.projectName}
            </div>
            {currentEntry?.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {currentEntry.description}
              </p>
            )}
            <button
              onClick={stopTracking}
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg font-medium"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop Timer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="e.g., Website Redesign"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({ ...formData, description: e.target.value })}
                placeholder="What are you working on?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hourly Rate (Optional)
              </label>
              <input
                type="number"
                value={formData.hourlyRate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({ ...formData, hourlyRate: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <button
              onClick={startTracking}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Timer
            </button>
          </div>
        )}
      </div>

      {/* Recent Entries */}
      <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Entries</h2>

        {entries.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            No time entries yet. Start tracking!
          </p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry: TimeEntry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {entry.projectName}
                  </h3>
                  {entry.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {entry.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{entry.date}</p>
                </div>

                <div className="text-right ml-4">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatDuration(entry.duration)}
                  </p>
                  {entry.totalEarned && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      ${entry.totalEarned.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
