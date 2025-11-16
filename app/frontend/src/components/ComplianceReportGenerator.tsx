import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Shield,
  Database,
  Activity,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { notify } from '../store/notification.store';

interface ComplianceReport {
  id: string;
  reportType: string;
  period: string;
  startDate?: string;
  endDate?: string;
  recordCount: number;
  status: string;
  createdAt: string;
}

interface ComplianceReportsResponse {
  reports: ComplianceReport[];
  total: number;
  hasMore: boolean;
}

export default function ComplianceReportGenerator() {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [reportType, setReportType] = useState('DATA_EXPORT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [reportDetails, setReportDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadReports();
  }, [page]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const offset = (page - 1) * limit;

      const response = await fetch(`/api/v1/compliance/reports?limit=${limit}&offset=${offset}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load compliance reports');
      }

      const data: ComplianceReportsResponse = await response.json();
      setReports(data.reports);
      setTotal(data.total);
    } catch (error) {
      notify.error('Error', 'Failed to load compliance reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (reportType !== 'GDPR' && reportType !== 'DATA_EXPORT' && (!startDate || !endDate)) {
      notify.error('Error', 'Please select start and end dates for this report type');
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const body: any = {
        reportType,
      };

      if (startDate) {
        body.startDate = new Date(startDate).toISOString();
      }
      if (endDate) {
        body.endDate = new Date(endDate).toISOString();
      }

      const response = await fetch('/api/v1/compliance/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to generate compliance report');
      }

      const data = await response.json();
      notify.success('Success', `Compliance report generated successfully (${data.recordCount} records)`);

      // Reset form
      setStartDate('');
      setEndDate('');

      // Reload reports
      setPage(1);
      loadReports();
    } catch (error) {
      notify.error('Error', 'Failed to generate compliance report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportGDPR = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/compliance/data-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export GDPR data');
      }

      const data = await response.json();

      // Download the data as JSON
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success('Success', `Your data has been exported (${data.recordCount} records)`);
    } catch (error) {
      notify.error('Error', 'Failed to export GDPR data');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewReport = async (report: ComplianceReport) => {
    setSelectedReport(report);
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/compliance/reports/${report.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load report details');
      }

      const data = await response.json();
      setReportDetails(data.data);
    } catch (error) {
      notify.error('Error', 'Failed to load report details');
      setSelectedReport(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadReport = (report: ComplianceReport) => {
    if (!reportDetails) return;

    const blob = new Blob([JSON.stringify(reportDetails, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.reportType}-${report.id}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    notify.success('Success', 'Report downloaded successfully');
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'GDPR':
      case 'DATA_EXPORT':
        return <Database className="h-5 w-5" />;
      case 'ACTIVITY':
        return <Activity className="h-5 w-5" />;
      case 'ACCESS_LOG':
        return <Eye className="h-5 w-5" />;
      case 'RETENTION':
        return <Calendar className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'GDPR':
      case 'DATA_EXPORT':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'ACTIVITY':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'ACCESS_LOG':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'RETENTION':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* GDPR Quick Export */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Shield className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-semibold">GDPR Data Export</h3>
            </div>
            <p className="text-sm opacity-90 mb-4">
              Export all your personal data in compliance with GDPR regulations. This includes all
              your earnings, invoices, customers, and activity logs.
            </p>
            <button
              onClick={handleExportGDPR}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Exporting...' : 'Export My Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Generator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Generate Compliance Report
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="DATA_EXPORT">Data Export</option>
              <option value="ACTIVITY">Activity Log</option>
              <option value="ACCESS_LOG">Access Log</option>
              <option value="RETENTION">Retention Policy</option>
              <option value="GDPR">GDPR</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Compliance Reports
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Loading reports...</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No compliance reports generated yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex p-2 rounded-lg mr-2 ${getReportTypeColor(report.reportType)}`}>
                            {getReportTypeIcon(report.reportType)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {report.reportType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {report.period || 'All time'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {report.recordCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          <Eye className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  <span className="inline-flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Compliance Report Details
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedReport.reportType.replace(/_/g, ' ')} - {selectedReport.period}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setReportDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>

              {loadingDetails ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-gray-500 dark:text-gray-400">Loading report details...</div>
                </div>
              ) : reportDetails ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Record Count
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedReport.recordCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Generated
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                          {new Date(selectedReport.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                      Report Data
                    </label>
                    <pre className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto max-h-96">
                      {JSON.stringify(reportDetails, null, 2)}
                    </pre>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleDownloadReport(selectedReport)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download JSON
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReport(null);
                        setReportDetails(null);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
