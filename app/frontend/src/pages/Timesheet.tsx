import React, { useState, useEffect } from 'react';
import { Clock, Plus, TrendingUp, Calendar, CheckCircle } from 'lucide-react';

interface TimesheetEntry {
  id: string;
  projectId: string;
  taskDescription: string;
  date: string;
  duration: number;
  billable: boolean;
  status: string;
}

interface Timesheet {
  id: string;
  projectId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  billableHours: number;
  status: string;
}

interface TimeOff {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: string;
}

interface TimeAnalytics {
  period: number;
  totalEntries: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billablePercentage: number;
  avgHoursPerDay: number;
}

export default function Timesheet() {
  const [activeTab, setActiveTab] = useState('entries');
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [analytics, setAnalytics] = useState<TimeAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    taskDescription: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    duration: '',
    billable: true,
  });

  useEffect(() => {
    fetchEntries();
    fetchTimesheets();
    fetchAnalytics();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/timesheets/entries', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheets = async () => {
    try {
      const response = await fetch('/api/v1/timesheets/timesheets', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setTimesheets(data);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/timesheets/analytics', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAnalytics(data);

      const timeOffResponse = await fetch('/api/v1/timesheets/time-off', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const timeOffData = await timeOffResponse.json();
      setTimeOff(timeOffData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const createEntry = async () => {
    try {
      const duration =
        formData.duration ||
        (Math.abs(
          parseInt(formData.endTime.split(':')[0]) -
            parseInt(formData.startTime.split(':')[0])
        ) || 8);

      const response = await fetch('/api/v1/timesheets/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          duration: duration.toString(),
        }),
      });
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          projectId: '',
          taskDescription: '',
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '17:00',
          duration: '',
          billable: true,
        });
        fetchEntries();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Time Tracking
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          Log Time
        </button>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalHours.toFixed(1)}h
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Billable Hours</p>
            <p className="text-2xl font-bold text-green-600">
              {analytics.billableHours.toFixed(1)}h
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Non-Billable</p>
            <p className="text-2xl font-bold text-orange-600">
              {analytics.nonBillableHours.toFixed(1)}h
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Billable %</p>
            <p className="text-2xl font-bold text-blue-600">
              {analytics.billablePercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8 px-6">
            <button
              onClick={() => {
                setActiveTab('entries');
                fetchEntries();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'entries'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Entries
            </button>
            <button
              onClick={() => {
                setActiveTab('timesheets');
                fetchTimesheets();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'timesheets'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Timesheets
            </button>
            <button
              onClick={() => {
                setActiveTab('time-off');
                fetchAnalytics();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'time-off'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Time Off
            </button>
            <button
              onClick={() => {
                setActiveTab('analytics');
                fetchAnalytics();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'analytics'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'entries' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Time Entries ({entries.length})
              </h3>
              {loading ? (
                <p className="text-gray-500">Loading entries...</p>
              ) : entries.length === 0 ? (
                <p className="text-gray-500">No time entries yet. Start logging time!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Task
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Hours
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(0, 10).map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-3 px-4">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white">
                            {entry.taskDescription}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {entry.duration.toFixed(1)}h
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                entry.billable
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {entry.billable ? 'Billable' : 'Non-Billable'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timesheets' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Weekly Timesheets ({timesheets.length})
              </h3>
              {timesheets.length === 0 ? (
                <p className="text-gray-500">No timesheets yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {timesheets.map((ts) => (
                    <div
                      key={ts.id}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {new Date(ts.weekStartDate).toLocaleDateString()} -{' '}
                            {new Date(ts.weekEndDate).toLocaleDateString()}
                          </h4>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            ts.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : ts.status === 'submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {ts.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Total Hours
                          </p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {ts.totalHours.toFixed(1)}h
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Billable Hours
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            {ts.billableHours.toFixed(1)}h
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'time-off' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Time Off ({timeOff.length})
              </h3>
              {timeOff.length === 0 ? (
                <p className="text-gray-500">No time off requests.</p>
              ) : (
                <div className="space-y-3">
                  {timeOff.map((to) => (
                    <div
                      key={to.id}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                          {to.type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(to.startDate).toLocaleDateString()} -{' '}
                          {new Date(to.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {to.duration.toFixed(1)}h
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            to.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {to.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Time Tracking Analytics
              </h3>
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Time Distribution
                    </p>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Billable</span>
                          <span className="font-medium">
                            {analytics.billableHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="w-full bg-gray-300 rounded h-2">
                          <div
                            className="bg-green-500 h-2 rounded"
                            style={{
                              width: `${analytics.billablePercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Non-Billable</span>
                          <span className="font-medium">
                            {analytics.nonBillableHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="w-full bg-gray-300 rounded h-2">
                          <div
                            className="bg-orange-500 h-2 rounded"
                            style={{
                              width: `${100 - analytics.billablePercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Summary (Last {analytics.period} days)
                    </p>
                    <div className="mt-3 space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Entries:</span> {analytics.totalEntries}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Avg/Day:</span>{' '}
                        {analytics.avgHoursPerDay.toFixed(1)}h
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Billable Rate:</span>{' '}
                        {analytics.billablePercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading analytics...</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Log Time Entry
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Description
                </label>
                <input
                  type="text"
                  value={formData.taskDescription}
                  onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="What did you work on?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billable"
                  checked={formData.billable}
                  onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="billable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Billable
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createEntry}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Log Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
