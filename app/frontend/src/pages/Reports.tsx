import { useState, useEffect } from 'react';
import { Plus, FileText, Edit, Trash2, Calendar, Download, Eye, History, Clock } from 'lucide-react';
import ReportBuilder from '../components/ReportBuilder';
import ReportPreview from '../components/ReportPreview';
import { useReportStore, Report, ReportData } from '../store/reportStore';
import { notify } from '../store/notification.store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const {
    reportConfig,
    previewData,
    setPreviewData,
    setCurrentReport,
    updateReportConfig,
    resetConfig,
  } = useReportStore();

  useEffect(() => {
    loadReports();
  }, [filterType]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/reports${filterType !== 'all' ? `?reportType=${filterType}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReports(response.data);
    } catch (error: any) {
      notify.error('Error', error.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    resetConfig();
    setEditingId(null);
    setShowBuilder(true);
    setShowPreview(false);
  };

  const handleEdit = (report: Report) => {
    setCurrentReport(report);
    updateReportConfig({
      name: report.name,
      description: report.description,
      reportType: report.reportType,
      columns: JSON.parse(report.columns as any),
      filters: JSON.parse(report.filters as any),
      sorting: JSON.parse(report.sorting as any),
      isPublic: report.isPublic,
    });
    setEditingId(report.id);
    setShowBuilder(true);
    setShowPreview(false);
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Create a temporary report or use existing if editing
      let reportId = editingId;

      if (!reportId) {
        const response = await axios.post(
          `${API_URL}/api/v1/reports`,
          reportConfig,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        reportId = response.data.id;
        setEditingId(reportId);
      } else {
        await axios.put(
          `${API_URL}/api/v1/reports/${reportId}`,
          reportConfig,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Fetch report data
      const dataResponse = await axios.get(
        `${API_URL}/api/v1/reports/${reportId}?page=1&limit=1000`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPreviewData(dataResponse.data.data);
      setShowPreview(true);
      notify.success('Success', 'Report generated successfully');
    } catch (error: any) {
      notify.error('Error', error.response?.data?.error || 'Failed to generate report preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (editingId) {
        await axios.put(
          `${API_URL}/api/v1/reports/${editingId}`,
          reportConfig,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        notify.success('Success', 'Report updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/v1/reports`,
          reportConfig,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        notify.success('Success', 'Report created successfully');
      }

      setShowBuilder(false);
      setShowPreview(false);
      loadReports();
      resetConfig();
    } catch (error: any) {
      notify.error('Error', error.response?.data?.error || 'Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/v1/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify.success('Success', 'Report deleted successfully');
      loadReports();
    } catch (error: any) {
      notify.error('Error', error.response?.data?.error || 'Failed to delete report');
    }
  };

  const handleExport = async (reportId: string, format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/reports/${reportId}/export?format=${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const report = reports.find(r => r.id === reportId);
      const filename = `${report?.name || 'report'}.${format}`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      notify.success('Success', 'Report exported successfully');
    } catch (error: any) {
      notify.error('Error', 'Failed to export report');
    }
  };

  const handleSchedule = async (reportId: string) => {
    const frequency = prompt('Enter schedule frequency (DAILY, WEEKLY, or MONTHLY):');
    if (!frequency || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency.toUpperCase())) {
      notify.error('Error', 'Invalid frequency. Use DAILY, WEEKLY, or MONTHLY');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/v1/reports/${reportId}/schedule`,
        { frequency: frequency.toUpperCase(), isActive: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      notify.success('Success', 'Report scheduled successfully');
      loadReports();
    } catch (error: any) {
      notify.error('Error', error.response?.data?.error || 'Failed to schedule report');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (showBuilder || showPreview) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Report' : 'Create New Report'}
              </h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setShowBuilder(false);
                    setShowPreview(false);
                    resetConfig();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                {showPreview && (
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Back to Builder
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={loading || !reportConfig.name}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Update Report' : 'Save Report'}
                </button>
              </div>
            </div>

            {showPreview && previewData ? (
              <ReportPreview
                data={previewData}
                reportName={reportConfig.name || 'Untitled Report'}
                reportId={editingId || undefined}
                onExport={(format) => {
                  if (editingId) {
                    handleExport(editingId, format);
                  }
                }}
              />
            ) : (
              <ReportBuilder onPreview={handlePreview} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Custom Reports</h1>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Report</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Reports</option>
              <option value="EARNINGS">Earnings</option>
              <option value="SALES">Sales</option>
              <option value="EXPENSES">Expenses</option>
              <option value="FINANCIAL">Financial</option>
            </select>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first custom report to track your business metrics
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {report.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {report.reportType.replace('_', ' ')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    report.reportType === 'EARNINGS' ? 'bg-green-100 text-green-800' :
                    report.reportType === 'SALES' ? 'bg-blue-100 text-blue-800' :
                    report.reportType === 'EXPENSES' ? 'bg-red-100 text-red-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {report.reportType}
                  </span>
                </div>

                {report.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {report.description}
                  </p>
                )}

                <div className="flex items-center text-xs text-gray-500 mb-4">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Created {formatDate(report.createdAt)}</span>
                </div>

                {report.schedules && report.schedules.length > 0 && (
                  <div className="flex items-center text-xs text-indigo-600 mb-4">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>
                      Scheduled: {report.schedules[0].frequency}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(report)}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSchedule(report.id)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Schedule"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExport(report.id, 'csv')}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
