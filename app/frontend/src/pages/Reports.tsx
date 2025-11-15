import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { analyticsAPI, earningsAPI } from '../lib/api';
import { useCurrency } from '../hooks/useCurrency';

interface MonthlyReport {
  month: string;
  totalEarnings: number;
  totalHours: number;
  avgHourlyRate: number;
  transactionCount: number;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'annual'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadReportData();
  }, [reportType, selectedYear, selectedMonth]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      // In real app, fetch from specific reports endpoint
      const period = reportType === 'monthly' ? 'month' : 'year';
      const data = await analyticsAPI.getAnalytics(period);

      // Mock monthly breakdown
      setMonthlyReports([
        {
          month: 'January',
          totalEarnings: 3500,
          totalHours: 140,
          avgHourlyRate: 25,
          transactionCount: 28,
        },
        {
          month: 'February',
          totalEarnings: 4200,
          totalHours: 160,
          avgHourlyRate: 26.25,
          transactionCount: 32,
        },
        {
          month: 'March',
          totalEarnings: 3800,
          totalHours: 150,
          avgHourlyRate: 25.33,
          transactionCount: 30,
        },
      ]);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePrintableReport = () => {
    window.print();
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const totalEarnings = monthlyReports.reduce((sum, r) => sum + r.totalEarnings, 0);
  const totalHours = monthlyReports.reduce((sum, r) => sum + r.totalHours, 0);
  const totalTransactions = monthlyReports.reduce((sum, r) => sum + r.transactionCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <button
          onClick={generatePrintableReport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="monthly">Monthly Report</option>
              <option value="annual">Annual Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {reportType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium opacity-90">Total Earnings</div>
              <div className="mt-2 text-3xl font-bold">
                {formatCurrency(totalEarnings)}
              </div>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg rounded-lg p-6">
          <div className="text-sm font-medium opacity-90">Total Hours</div>
          <div className="mt-2 text-3xl font-bold">{totalHours}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg rounded-lg p-6">
          <div className="text-sm font-medium opacity-90">Avg Rate</div>
          <div className="mt-2 text-3xl font-bold">
            {formatCurrency(totalHours > 0 ? totalEarnings / totalHours : 0)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg rounded-lg p-6">
          <div className="text-sm font-medium opacity-90">Transactions</div>
          <div className="mt-2 text-3xl font-bold">{totalTransactions}</div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {reportType === 'monthly' ? 'Monthly' : 'Annual'} Earnings Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Hours Worked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Avg Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Transactions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {monthlyReports.map((report, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {report.month}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(report.totalEarnings)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {report.totalHours.toFixed(1)} hrs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(report.avgHourlyRate)}/hr
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {report.transactionCount}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                  {formatCurrency(totalEarnings)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                  {totalHours.toFixed(1)} hrs
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalHours > 0 ? totalEarnings / totalHours : 0)}/hr
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                  {totalTransactions}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Report Footer */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-start gap-2">
          <FileText className="w-5 h-5 text-gray-400 mt-1" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">Report Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All amounts shown in selected currency</li>
              <li>Report generated on {new Date().toLocaleDateString()}</li>
              <li>For tax purposes, please consult with your accountant</li>
              <li>This report includes all earnings from recorded platforms</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
