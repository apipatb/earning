import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import BackupStatus from '../components/BackupStatus';
import RestoreWizard from '../components/RestoreWizard';
import api from '../services/api';

interface BackupStats {
  total: number;
  successful: number;
  failed: number;
  running: number;
  totalSize: number;
  lastBackup: {
    id: string;
    type: string;
    status: string;
    startTime: string;
    backupSize: number;
  } | null;
}

interface BackupSchedule {
  id: string;
  frequency: string;
  time: string;
  isEnabled: boolean;
  backupType: string;
  lastRun: string | null;
  nextRun: string | null;
}

const DisasterRecovery: React.FC = () => {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'backups' | 'restore' | 'schedules'>('overview');
  const [showRestoreWizard, setShowRestoreWizard] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, schedulesRes] = await Promise.all([
        api.get('/backup/stats'),
        api.get('/backup/schedule'),
      ]);
      setStats(statsRes.data);
      setSchedules(schedulesRes.data.schedules);
      setError(null);
    } catch (err) {
      setError('Failed to fetch backup data');
      console.error('Error fetching backup data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (type: 'FULL' | 'INCREMENTAL') => {
    try {
      setCreating(true);
      await api.post('/backup/now', {
        type,
        compress: true,
        includeFiles: true,
        retention: 30,
      });
      await fetchData();
      alert('Backup started successfully!');
    } catch (err) {
      alert('Failed to start backup');
      console.error('Error creating backup:', err);
    } finally {
      setCreating(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string | null): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backup & Disaster Recovery</h1>
            <p className="text-gray-600 mt-1">Manage backups, restore points, and disaster recovery</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleCreateBackup('INCREMENTAL')}
              disabled={creating}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <CloudArrowUpIcon className="w-5 h-5" />
              <span>Incremental Backup</span>
            </button>
            <button
              onClick={() => handleCreateBackup('FULL')}
              disabled={creating}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <ShieldCheckIcon className="w-5 h-5" />
              <span>Full Backup</span>
            </button>
            <button
              onClick={fetchData}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('backups')}
              className={`${
                activeTab === 'backups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Backup History
            </button>
            <button
              onClick={() => setActiveTab('restore')}
              className={`${
                activeTab === 'restore'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Restore Points
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`${
                activeTab === 'schedules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Schedules
            </button>
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Backups</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <DocumentDuplicateIcon className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.successful}</p>
                </div>
                <CheckCircleIcon className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
                </div>
                <XCircleIcon className="w-12 h-12 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Size</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {formatBytes(stats.totalSize)}
                  </p>
                </div>
                <CloudArrowUpIcon className="w-12 h-12 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Last Backup */}
          {stats.lastBackup && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Last Backup</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="text-base font-medium text-gray-900">{stats.lastBackup.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      stats.lastBackup.status === 'SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : stats.lastBackup.status === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {stats.lastBackup.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Size</p>
                  <p className="text-base font-medium text-gray-900">
                    {formatBytes(stats.lastBackup.backupSize)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-base font-medium text-gray-900">
                    {formatDate(stats.lastBackup.startTime)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowRestoreWizard(true)}
                className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Start Restore</span>
              </button>
              <button
                onClick={() => setActiveTab('schedules')}
                className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                <ClockIcon className="w-5 h-5" />
                <span>Manage Schedules</span>
              </button>
              <button
                onClick={() => setActiveTab('backups')}
                className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
                <span>View History</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backups Tab */}
      {activeTab === 'backups' && <BackupStatus />}

      {/* Restore Tab */}
      {activeTab === 'restore' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Restore Points</h2>
            <button
              onClick={() => setShowRestoreWizard(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlayIcon className="w-5 h-5" />
              <span>Start Restore</span>
            </button>
          </div>
          <RestoreWizard show={true} />
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Backup Schedules</h2>
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-base font-medium text-gray-900">
                        {schedule.frequency} {schedule.backupType} Backup
                      </h3>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          schedule.isEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {schedule.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Schedule Time</p>
                        <p className="text-sm font-medium text-gray-900">{schedule.time}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Run</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(schedule.lastRun)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Next Run</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(schedule.nextRun)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restore Wizard Modal */}
      {showRestoreWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Restore Wizard</h2>
                <button
                  onClick={() => setShowRestoreWizard(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              <RestoreWizard show={true} onClose={() => setShowRestoreWizard(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisasterRecovery;
