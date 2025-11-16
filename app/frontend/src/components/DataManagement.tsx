import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  FileJson,
  FileText,
  BarChart3,
  Database,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive,
  Shield,
} from 'lucide-react';
import api from '../lib/api';
import { notify } from '../store/notification.store';

interface Backup {
  id: string;
  filename: string;
  size: number;
  format: string;
  backupType: 'manual' | 'automatic';
  createdAt: string;
  expiresAt: string | null;
  isRestored: boolean;
  restoredAt: string | null;
  lastAction?: string;
  lastActionStatus?: string;
}

interface BackupStatistics {
  totalBackups: number;
  manualBackups: number;
  automaticBackups: number;
  totalSize: number;
  oldestBackupDate: string | null;
  newestBackupDate: string | null;
}

interface ExportFormat {
  name: string;
  icon: React.ReactNode;
  description: string;
  endpoint: string;
  accepts: string;
}

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState<'export' | 'backup' | 'restore'>('export');
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStatistics | null>(null);
  const [selectedDataType, setSelectedDataType] = useState('earnings');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });
  const [showCreateBackup, setShowCreateBackup] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState<string | null>(null);

  const exportFormats: ExportFormat[] = [
    {
      name: 'JSON',
      icon: <FileJson className="w-6 h-6" />,
      description: 'Complete backup in JSON format',
      endpoint: '/export/json',
      accepts: 'application/json',
    },
    {
      name: 'CSV',
      icon: <FileText className="w-6 h-6" />,
      description: 'Data by type in CSV format',
      endpoint: '/export/csv',
      accepts: 'text/csv',
    },
    {
      name: 'Excel',
      icon: <BarChart3 className="w-6 h-6" />,
      description: 'Formatted spreadsheet',
      endpoint: '/export/excel',
      accepts: '.xlsx',
    },
    {
      name: 'PDF Report',
      icon: <Database className="w-6 h-6" />,
      description: 'Professional PDF report',
      endpoint: '/export/pdf',
      accepts: 'application/pdf',
    },
  ];

  const dataTypes = [
    { id: 'earnings', name: 'Earnings' },
    { id: 'invoices', name: 'Invoices' },
    { id: 'customers', name: 'Customers' },
    { id: 'expenses', name: 'Expenses' },
    { id: 'sales', name: 'Sales' },
    { id: 'products', name: 'Products' },
  ];

  const reportTypes = [
    { id: 'summary', name: 'Summary Report' },
    { id: 'earnings', name: 'Earnings Report' },
    { id: 'invoices', name: 'Invoices Report' },
    { id: 'financial', name: 'Financial Report' },
  ];

  useEffect(() => {
    if (activeTab === 'backup' || activeTab === 'restore') {
      loadBackups();
      loadBackupStats();
    }
  }, [activeTab]);

  const loadBackups = async () => {
    try {
      const response = await api.get('/export/backups');
      setBackups(response.data.backups);
    } catch (error) {
      console.error('Failed to load backups:', error);
      notify.error('Error', 'Failed to load backups');
    }
  };

  const loadBackupStats = async () => {
    try {
      const response = await api.get('/export/backups/stats');
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Failed to load backup stats:', error);
    }
  };

  const handleExport = async (format: string) => {
    try {
      setLoading(true);

      let endpoint = '';
      let filename = '';

      if (format === 'json') {
        endpoint = '/export/json';
        filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
      } else if (format === 'csv') {
        endpoint = `/export/csv/${selectedDataType}`;
        filename = `${selectedDataType}_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (format === 'excel') {
        endpoint = `/export/excel/${selectedDataType}`;
        filename = `${selectedDataType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (format === 'pdf') {
        endpoint = `/export/pdf/${selectedDataType}`;
        filename = `report_${selectedDataType}_${new Date().toISOString().split('T')[0]}.pdf`;
      }

      // Add date range if provided
      const params = new URLSearchParams();
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);

      const finalEndpoint = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

      // Download file
      const response = await api.get(finalEndpoint, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);

      notify.success('Success', `Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      notify.error('Error', `Failed to export data as ${format.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await api.post('/export/backup', {});
      notify.success('Success', 'Backup created successfully');
      await loadBackups();
      await loadBackupStats();
      setShowCreateBackup(false);
    } catch (error) {
      console.error('Backup creation failed:', error);
      notify.error('Error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    try {
      setRestoreInProgress(backupId);
      await api.post(`/export/backups/${backupId}/restore`, {});
      notify.success('Success', 'Backup restored successfully');
      await loadBackups();
    } catch (error) {
      console.error('Restore failed:', error);
      notify.error('Error', 'Failed to restore backup');
    } finally {
      setRestoreInProgress(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/export/backups/${backupId}`);
      notify.success('Success', 'Backup deleted');
      await loadBackups();
      await loadBackupStats();
    } catch (error) {
      console.error('Delete failed:', error);
      notify.error('Error', 'Failed to delete backup');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('export')}
          className={`pb-4 px-4 font-medium transition-colors ${
            activeTab === 'export'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          <Download className="w-4 h-4 inline mr-2" />
          Export Data
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-4 px-4 font-medium transition-colors ${
            activeTab === 'backup'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          <Database className="w-4 h-4 inline mr-2" />
          Backups
        </button>
        <button
          onClick={() => setActiveTab('restore')}
          className={`pb-4 px-4 font-medium transition-colors ${
            activeTab === 'restore'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Restore
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Quick Export Formats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportFormats.map((format) => (
              <div
                key={format.name}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-blue-600 dark:text-blue-400">{format.icon}</div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{format.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{format.description}</p>

                {/* Format-specific options */}
                {(format.name === 'CSV' || format.name === 'Excel') && (
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Data Type
                    </label>
                    <select
                      value={selectedDataType}
                      onChange={(e) => setSelectedDataType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    >
                      {dataTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {format.name === 'PDF Report' && (
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Report Type
                    </label>
                    <select
                      value={selectedDataType}
                      onChange={(e) => setSelectedDataType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    >
                      {reportTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Range */}
                {(format.name === 'CSV' || format.name === 'Excel' || format.name === 'JSON') && (
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date Range (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                      />
                      <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleExport(format.name.toLowerCase().split(' ')[0])}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Exporting...' : `Export as ${format.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Backups</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.totalBackups}
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Size</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatFileSize(stats.totalSize)}
                    </p>
                  </div>
                  <HardDrive className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Backup Coverage</p>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Latest: {stats.newestBackupDate ? formatDate(stats.newestBackupDate).split(',')[0] : 'Never'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Oldest: {stats.oldestBackupDate ? formatDate(stats.oldestBackupDate).split(',')[0] : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Backup Button */}
          <button
            onClick={() => setShowCreateBackup(!showCreateBackup)}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Database className="w-5 h-5" />
            Create Manual Backup Now
          </button>

          {/* Backup Information */}
          {showCreateBackup && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Manual Backup</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Creating a backup will save all your data (earnings, invoices, customers, etc.) in a secure format. You can restore from this backup at any time.
                  </p>
                  <button
                    onClick={handleCreateBackup}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {loading ? 'Creating...' : 'Confirm & Create Backup'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backups List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Available Backups</h3>
            {backups.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No backups found. Create one to get started.</p>
              </div>
            ) : (
              backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white break-all">{backup.filename}</h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            backup.backupType === 'automatic'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                        >
                          {backup.backupType === 'automatic' ? 'Auto' : 'Manual'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {formatDate(backup.createdAt)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <span>
                          <HardDrive className="w-3 h-3 inline mr-1" />
                          {formatFileSize(backup.size)}
                        </span>
                        {backup.isRestored && (
                          <span className="text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Restored
                          </span>
                        )}
                        {backup.expiresAt && (
                          <span>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Expires: {formatDate(backup.expiresAt).split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestoreBackup(backup.id)}
                        disabled={restoreInProgress !== null}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {restoreInProgress === backup.id ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        disabled={loading}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Restore Tab */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Restore Data</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Restoring from a backup will replace your current data with the data from the backup. Please ensure you have a recent backup before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Restore List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Select Backup to Restore</h3>
            {backups.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No backups available. Create a backup first.</p>
              </div>
            ) : (
              backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white break-all">{backup.filename}</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Created: {formatDate(backup.createdAt)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <span>
                          <HardDrive className="w-3 h-3 inline mr-1" />
                          {formatFileSize(backup.size)}
                        </span>
                        {backup.isRestored && (
                          <span className="text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Previously restored
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreBackup(backup.id)}
                      disabled={restoreInProgress !== null}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {restoreInProgress === backup.id ? 'Restoring...' : 'Restore This Backup'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
