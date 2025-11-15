import { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, Square, Timer, Calendar, DollarSign, TrendingUp, BarChart3, Plus, Edit2, Trash2, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { notify } from '../store/notification.store';

interface TimeEntry {
  id: string;
  description: string;
  projectName: string;
  clientId?: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  hourlyRate: number;
  totalAmount: number;
  tags: string[];
  isBillable: boolean;
  createdAt: string;
}

export default function TimeTrackerPro() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [currentEntry, setCurrentEntry] = useState({
    description: '',
    projectName: '',
    clientId: '',
    hourlyRate: 50,
    tags: '',
    isBillable: true,
  });

  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterBillable, setFilterBillable] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, filterProject, filterBillable, dateRange]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const loadEntries = () => {
    const stored = localStorage.getItem('time_entries');
    if (stored) {
      setEntries(JSON.parse(stored));
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];

    // Filter by project
    if (filterProject !== 'all') {
      filtered = filtered.filter(e => e.projectName === filterProject);
    }

    // Filter by billable status
    if (filterBillable === 'billable') {
      filtered = filtered.filter(e => e.isBillable);
    } else if (filterBillable === 'non-billable') {
      filtered = filtered.filter(e => !e.isBillable);
    }

    // Filter by date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    filtered = filtered.filter(e => {
      const entryDate = new Date(e.startTime);

      switch (dateRange) {
        case 'today':
          return entryDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return entryDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return entryDate >= monthAgo;
        case 'all':
        default:
          return true;
      }
    });

    // Sort by start time (newest first)
    filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    setFilteredEntries(filtered);
  };

  const startTimer = () => {
    if (!currentEntry.description || !currentEntry.projectName) {
      notify.error('Validation Error', 'Description and project name are required');
      return;
    }

    setStartTime(new Date());
    setElapsedTime(0);
    setIsRunning(true);
    notify.success('Timer Started', `Tracking time for: ${currentEntry.description}`);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    notify.info('Timer Paused', 'Timer paused');
  };

  const resumeTimer = () => {
    setIsRunning(true);
    notify.info('Timer Resumed', 'Timer resumed');
  };

  const stopTimer = () => {
    if (!startTime) return;

    const endTime = new Date();
    const duration = elapsedTime;
    const hours = duration / 3600;
    const totalAmount = hours * currentEntry.hourlyRate;

    const newEntry: TimeEntry = {
      id: `time-${Date.now()}`,
      description: currentEntry.description,
      projectName: currentEntry.projectName,
      clientId: currentEntry.clientId || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      hourlyRate: currentEntry.hourlyRate,
      totalAmount,
      tags: currentEntry.tags ? currentEntry.tags.split(',').map(t => t.trim()) : [],
      isBillable: currentEntry.isBillable,
      createdAt: new Date().toISOString(),
    };

    const updatedEntries = [newEntry, ...entries];
    localStorage.setItem('time_entries', JSON.stringify(updatedEntries));
    setEntries(updatedEntries);

    // Reset timer
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setCurrentEntry({
      description: '',
      projectName: '',
      clientId: '',
      hourlyRate: 50,
      tags: '',
      isBillable: true,
    });

    notify.success('Time Logged', `${formatDuration(duration)} logged for ${newEntry.projectName}`);
  };

  const deleteEntry = (id: string) => {
    if (!confirm('Delete this time entry?')) return;

    const updatedEntries = entries.filter(e => e.id !== id);
    localStorage.setItem('time_entries', JSON.stringify(updatedEntries));
    setEntries(updatedEntries);
    notify.success('Deleted', 'Time entry deleted');
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Analytics
  const totalDuration = filteredEntries.reduce((sum, e) => sum + e.duration, 0);
  const totalEarnings = filteredEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const billableTime = filteredEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.duration, 0);
  const billableRate = totalDuration > 0 ? (billableTime / totalDuration) * 100 : 0;

  // Project breakdown
  const projectStats: Record<string, { time: number; earnings: number }> = {};
  filteredEntries.forEach(e => {
    if (!projectStats[e.projectName]) {
      projectStats[e.projectName] = { time: 0, earnings: 0 };
    }
    projectStats[e.projectName].time += e.duration;
    projectStats[e.projectName].earnings += e.totalAmount;
  });

  const projectChartData = Object.entries(projectStats).map(([name, stats]) => ({
    name,
    hours: parseFloat((stats.time / 3600).toFixed(2)),
    earnings: parseFloat(stats.earnings.toFixed(2)),
  }));

  const pieChartData = Object.entries(projectStats).map(([name, stats]) => ({
    name,
    value: parseFloat((stats.time / 3600).toFixed(2)),
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const uniqueProjects = [...new Set(entries.map(e => e.projectName))];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Time Tracker Pro</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Advanced time tracking with project analytics
            </p>
          </div>
        </div>
      </div>

      {/* Timer Section */}
      <div className="mb-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="text-center mb-4">
          <div className="text-6xl font-bold text-orange-900 dark:text-orange-100 mb-2 font-mono">
            {formatDuration(elapsedTime)}
          </div>
          {isRunning && (
            <div className="flex items-center justify-center gap-2 text-sm text-orange-700 dark:text-orange-300">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Recording...
            </div>
          )}
        </div>

        {!isRunning && elapsedTime === 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <input
                type="text"
                value={currentEntry.description}
                onChange={(e) => setCurrentEntry({ ...currentEntry, description: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="What are you working on?"
              />
              <input
                type="text"
                value={currentEntry.projectName}
                onChange={(e) => setCurrentEntry({ ...currentEntry, projectName: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Project name"
              />
              <input
                type="number"
                value={currentEntry.hourlyRate}
                onChange={(e) => setCurrentEntry({ ...currentEntry, hourlyRate: parseFloat(e.target.value) })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Hourly rate"
                step="0.01"
              />
              <input
                type="text"
                value={currentEntry.tags}
                onChange={(e) => setCurrentEntry({ ...currentEntry, tags: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Tags (comma-separated)"
              />
            </div>

            <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={currentEntry.isBillable}
                onChange={(e) => setCurrentEntry({ ...currentEntry, isBillable: e.target.checked })}
                className="w-4 h-4 text-orange-600 rounded"
              />
              Billable time
            </label>

            <button
              onClick={startTimer}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="w-5 h-5" />
              Start Timer
            </button>
          </>
        ) : (
          <div className="flex gap-3">
            {isRunning ? (
              <button
                onClick={pauseTimer}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Pause className="w-5 h-5" />
                Pause
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play className="w-5 h-5" />
                Resume
              </button>
            )}
            <button
              onClick={stopTimer}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Square className="w-5 h-5" />
              Stop & Save
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {(totalDuration / 3600).toFixed(2)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Total Earnings</span>
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            ${totalEarnings.toFixed(2)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Billable %</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {billableRate.toFixed(1)}%
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Projects</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {Object.keys(projectStats).length}
          </p>
        </div>
      </div>

      {/* Charts */}
      {projectChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bar Chart */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Time & Earnings by Project
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="hours" fill="#3b82f6" name="Hours" />
                <Bar dataKey="earnings" fill="#10b981" name="Earnings ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Time Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}h`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>

        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">All Projects</option>
          {uniqueProjects.map(project => (
            <option key={project} value={project}>{project}</option>
          ))}
        </select>

        <select
          value={filterBillable}
          onChange={(e) => setFilterBillable(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">All Time</option>
          <option value="billable">Billable Only</option>
          <option value="non-billable">Non-Billable Only</option>
        </select>
      </div>

      {/* Time Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No time entries</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Start the timer to log your first time entry
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {entry.description}
                    </h4>
                    {entry.isBillable ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-xs font-medium">
                        Billable
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded text-xs font-medium">
                        Non-billable
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mb-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {entry.projectName}
                    </span>
                    <span>
                      {formatDate(entry.startTime)} • {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                    </span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatDuration(entry.duration)}
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${entry.totalAmount.toFixed(2)}
                    </span>
                    <span className="text-xs">
                      ${entry.hourlyRate}/hr
                    </span>
                  </div>

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Time Tracking Tips
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Use descriptive task names for better reporting</li>
          <li>Tag entries to categorize work across multiple projects</li>
          <li>Set accurate hourly rates to track earnings automatically</li>
          <li>Mark non-billable time to calculate true billable rate</li>
          <li>Review weekly reports to optimize your time allocation</li>
        </ul>
      </div>
    </div>
  );
}
