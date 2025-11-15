import { useState, useEffect } from 'react';
import {
  HardDrive,
  Plus,
  Download,
  RotateCcw,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Database,
  Shield,
  Archive,
  Zap,
} from 'lucide-react';
import { backupAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface BackupItem {
  id: string;
  backupType: string;
  status: string;
  backupSize: number;
  startedAt: string;
  completedAt?: string;
  description?: string;
}

interface RestorePoint {
  id: string;
  timestamp: string;
  status: string;
  description?: string;
}

interface BackupStrategy {
  frequency: string;
  retention: number;
  type: string;
  enabled: boolean;
}

interface BackupCompliance {
  strategyConfigured: boolean;
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  complianceStatus: string;
}

interface DataArchiveItem {
  id: string;
  dataType: string;
  dateRange: string;
  status: string;
  itemsArchived: number;
  archivedAt: string;
}

export default function Backup() {
  const [activeTab, setActiveTab] = useState<'backups' | 'strategy' | 'recovery' | 'archive'>('backups');
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [strategy, setStrategy] = useState<BackupStrategy | null>(null);
  const [compliance, setCompliance] = useState<BackupCompliance | null>(null);
  const [archives, setArchives] = useState<DataArchiveItem[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [showNewBackup, setShowNewBackup] = useState(false);
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [newBackupType, setNewBackupType] = useState('full');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'backups') {
        const data = await backupAPI.getBackups();
        setBackups(data);
      } else if (activeTab === 'strategy') {
        const strat = await backupAPI.getBackupStrategy();
        const comp = await backupAPI.getBackupCompliance();
        setStrategy(strat);
        setCompliance(comp);
      } else if (activeTab === 'recovery') {
        const data = await backupAPI.getBackups();
        setBackups(data);
      } else if (activeTab === 'archive') {
        const data = await backupAPI.getArchives();
        setArchives(data);
      }
    } catch (error) {
      notify.error('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      await backupAPI.createBackup({ backupType: newBackupType });
      notify.success('Success', 'Backup started');
      setShowNewBackup(false);
      setNewBackupType('full');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to create backup');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Delete this backup?')) return;
    try {
      await backupAPI.deleteBackup(backupId);
      setBackups(backups.filter((b) => b.id !== backupId));
      notify.success('Success', 'Backup deleted');
    } catch (error) {
      notify.error('Error', 'Failed to delete backup');
    }
  };

  const handleRestore = async (pointId: string) => {
    if (!confirm('Restore from this point?')) return;
    try {
      await backupAPI.restoreFromPoint(pointId);
      notify.success('Success', 'Recovery started');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to restore');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backup & Recovery</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage backups, recovery, and data archival</p>
        </div>
        {activeTab === 'backups' && (
          <button
            onClick={() => setShowNewBackup(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Backup
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['backups', 'strategy', 'recovery', 'archive'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'backups' && <span className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Backups</span>}
            {tab === 'strategy' && <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Strategy</span>}
            {tab === 'recovery' && <span className="flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Recovery</span>}
            {tab === 'archive' && <span className="flex items-center gap-2"><Archive className="w-4 h-4" /> Archive</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          {/* Backups Tab */}
          {activeTab === 'backups' && (
            <div className="space-y-4">
              {showNewBackup && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Backup</h2>
                  <select
                    value={newBackupType}
                    onChange={(e) => setNewBackupType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="full">Full Backup</option>
                    <option value="incremental">Incremental Backup</option>
                    <option value="differential">Differential Backup</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBackup}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                    >
                      Create Backup
                    </button>
                    <button
                      onClick={() => setShowNewBackup(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Backups List */}
              <div className="space-y-2">
                {backups.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow text-center">
                    <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No backups yet</p>
                  </div>
                ) : (
                  backups.map((backup) => (
                    <div key={backup.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(backup.status)}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                              {backup.backupType} Backup
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {new Date(backup.startedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            backup.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : backup.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {backup.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Size: <span className="font-semibold">{formatBytes(Number(backup.backupSize))}</span>
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors text-sm flex items-center justify-center gap-2">
                          <Download className="w-4 h-4" /> Download
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.id)}
                          className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Strategy Tab */}
          {activeTab === 'strategy' && compliance && (
            <div className="space-y-6">
              {/* Compliance Status */}
              <div
                className={`rounded-lg p-6 shadow ${
                  compliance.complianceStatus === 'compliant'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {compliance.complianceStatus === 'compliant' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                      {compliance.complianceStatus}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {compliance.totalBackups} total backups, {compliance.completedBackups} successful
                    </p>
                  </div>
                </div>
              </div>

              {/* Strategy Configuration */}
              {strategy ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Strategy</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Frequency</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize mt-1">
                        {strategy.frequency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Retention Period</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                        {strategy.retention} days
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Backup Type</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize mt-1">
                        {strategy.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                      <span
                        className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${
                          strategy.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {strategy.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No backup strategy configured</p>
                  <button
                    onClick={() => setShowStrategyForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                  >
                    Create Strategy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recovery Tab */}
          {activeTab === 'recovery' && (
            <div className="space-y-4">
              {backups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow text-center">
                  <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No backups available for recovery</p>
                </div>
              ) : (
                backups.map((backup) => (
                  <div key={backup.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                          {backup.backupType} - {backup.status}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(backup.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {backup.status === 'completed' && (
                      <button
                        onClick={() => handleRestore(backup.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" /> Restore from this backup
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Archive Tab */}
          {activeTab === 'archive' && (
            <div className="grid grid-cols-1 gap-4">
              {archives.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow text-center">
                  <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No archived data</p>
                </div>
              ) : (
                archives.map((archive) => (
                  <div key={archive.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                          {archive.dataType} Archive
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{archive.dateRange}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          archive.status === 'archived'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}
                      >
                        {archive.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Items archived: <span className="font-semibold">{archive.itemsArchived}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
