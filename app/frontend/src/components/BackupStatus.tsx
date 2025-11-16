import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

interface Backup {
  id: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string | null;
  backupSize: number | null;
  location: string;
  retention: number;
  error: string | null;
  metadata: {
    databaseSize?: number;
    fileCount?: number;
    compressedSize?: number;
  } | null;
  restorePoints: Array<{
    id: string;
    timestamp: string;
    description: string;
  }>;
}

const BackupStatus: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'running'>('all');

  useEffect(() => {
    fetchBackups();
  }, [currentPage]);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/backup/jobs', {
        params: {
          page: currentPage,
          limit: 20,
        },
      });
      setBackups(response.data.backups);
      setTotalPages(response.data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to fetch backups');
      console.error('Error fetching backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }

    try {
      await api.delete(`/backup/jobs/${id}`);
      await fetchBackups();
    } catch (err) {
      alert('Failed to delete backup');
      console.error('Error deleting backup:', err);
    }
  };

  const formatBytes = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (start: string, end: string | null): string => {
    if (!end) return 'In progress...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'RUNNING':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBackups = backups.filter((backup) => {
    if (filter === 'all') return true;
    return backup.status.toLowerCase() === filter.toLowerCase();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium text-sm ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Backups
        </button>
        <button
          onClick={() => setFilter('success')}
          className={`px-4 py-2 font-medium text-sm ${
            filter === 'success'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Successful
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`px-4 py-2 font-medium text-sm ${
            filter === 'failed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Failed
        </button>
        <button
          onClick={() => setFilter('running')}
          className={`px-4 py-2 font-medium text-sm ${
            filter === 'running'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Running
        </button>
      </div>

      {/* Backups List */}
      <div className="space-y-4">
        {filteredBackups.map((backup) => (
          <div key={backup.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getStatusIcon(backup.status)}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {backup.type} Backup
                  </h3>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      backup.status
                    )}`}
                  >
                    {backup.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Started</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(backup.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDuration(backup.startTime, backup.endTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Size</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatBytes(backup.backupSize)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Retention</p>
                    <p className="text-sm font-medium text-gray-900">{backup.retention} days</p>
                  </div>
                </div>

                {backup.metadata && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    {backup.metadata.databaseSize !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600">Database Size</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatBytes(backup.metadata.databaseSize)}
                        </p>
                      </div>
                    )}
                    {backup.metadata.fileCount !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600">Files</p>
                        <p className="text-sm font-medium text-gray-900">
                          {backup.metadata.fileCount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {backup.metadata.compressedSize !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600">Compressed</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatBytes(backup.metadata.compressedSize)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {backup.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-800">
                      <strong>Error:</strong> {backup.error}
                    </p>
                  </div>
                )}

                {backup.restorePoints.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Restore Points ({backup.restorePoints.length})
                    </p>
                    <div className="space-y-1">
                      {backup.restorePoints.slice(0, 3).map((point) => (
                        <div
                          key={point.id}
                          className="text-xs text-gray-700 bg-blue-50 rounded px-2 py-1"
                        >
                          {formatDate(point.timestamp)} - {point.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 ml-4">
                {backup.status === 'SUCCESS' && (
                  <button
                    title="Download"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <CloudArrowDownIcon className="w-5 h-5" />
                  </button>
                )}
                {backup.status !== 'RUNNING' && (
                  <button
                    onClick={() => handleDelete(backup.id)}
                    title="Delete"
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredBackups.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No backups found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default BackupStatus;
