import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, FileSpreadsheet, Printer, BarChart3, TrendingDown, PieChart, ArrowRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import { analyticsAPI, earningsAPI, salesAPI, expensesAPI, invoicesAPI, customersAPI } from '../lib/api';
import { useCurrency } from '../hooks/useCurrency';
import { exportToCSV, exportDateRangeToCSV } from '../lib/export';
import { notify } from '../store/notification.store';
import { FormValidation } from '../lib/validation';

interface MonthlyReport {
  month: string;
  totalEarnings: number;
  totalHours: number;
  avgHourlyRate: number;
  transactionCount: number;
}

interface BusinessMetrics {
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  invoiceTotal: number;
  invoicePaid: number;
  invoicePending: number;
  customerCount: number;
  topCustomer: { name: string; value: number } | null;
}

interface ChartData {
  name: string;
  revenue?: number;
  expenses?: number;
  profit?: number;
  invoices?: number;
  paid?: number;
  pending?: number;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'annual' | 'business'>('business');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics>({
    revenue: 0,
    expenses: 0,
    profit: 0,
    profitMargin: 0,
    invoiceTotal: 0,
    invoicePaid: 0,
    invoicePending: 0,
    customerCount: 0,
    topCustomer: null,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadReportData();
  }, [reportType, selectedYear, selectedMonth, startDate, endDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      if (reportType === 'business') {
        await loadBusinessMetrics();
      } else {
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
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      notify.error('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessMetrics = async () => {
    try {
      // Load sales/revenue data
      const salesData = await salesAPI.getAll({ startDate, endDate });
      const totalRevenue = Array.isArray(salesData) ? salesData.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) : 0;

      // Load expenses data
      const expensesData = await expensesAPI.getAll({ startDate, endDate });
      const totalExpenses = Array.isArray(expensesData) ? expensesData.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) : 0;

      // Load invoices data
      const invoicesData = await invoicesAPI.getAll({ startDate, endDate });
      const invoiceTotal = Array.isArray(invoicesData) ? invoicesData.reduce((sum: number, i: any) => sum + (i.total || 0), 0) : 0;
      const invoicePaid = Array.isArray(invoicesData) ? invoicesData.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + (i.total || 0), 0) : 0;
      const invoicePending = invoiceTotal - invoicePaid;

      // Load customers data
      const customersData = await customersAPI.getAll();
      const customerCount = Array.isArray(customersData) ? customersData.length : 0;
      const topCustomer = Array.isArray(customersData) && customersData.length > 0
        ? { name: customersData[0].name, value: customersData[0].totalPurchases || 0 }
        : null;

      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      setBusinessMetrics({
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit,
        profitMargin,
        invoiceTotal,
        invoicePaid,
        invoicePending,
        customerCount,
        topCustomer,
      });

      // Generate chart data
      generateChartData(salesData, expensesData, invoicesData);
    } catch (error) {
      console.error('Failed to load business metrics:', error);
    }
  };

  const generateChartData = (salesData: any[], expensesData: any[], invoicesData: any[]) => {
    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data: { [key: string]: ChartData } = {};

    months.forEach(month => {
      data[month] = { name: month };
    });

    // Aggregate sales by month
    if (Array.isArray(salesData)) {
      salesData.forEach((sale: any) => {
        const date = new Date(sale.createdAt || new Date());
        const month = months[date.getMonth()];
        if (data[month]) {
          data[month].revenue = (data[month].revenue || 0) + (sale.amount || 0);
        }
      });
    }

    // Aggregate expenses by month
    if (Array.isArray(expensesData)) {
      expensesData.forEach((expense: any) => {
        const date = new Date(expense.createdAt || new Date());
        const month = months[date.getMonth()];
        if (data[month]) {
          data[month].expenses = (data[month].expenses || 0) + (expense.amount || 0);
        }
      });
    }

    // Calculate profit
    Object.keys(data).forEach(month => {
      data[month].profit = (data[month].revenue || 0) - (data[month].expenses || 0);
    });

    setChartData(Object.values(data));
  };

  const generatePrintableReport = () => {
    // window.print() is generally safe but guard against undefined window
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = margin;

      // Title
      pdf.setFontSize(18);
      pdf.text('Financial Report', margin, yPosition);
      yPosition += 10;

      // Date range
      pdf.setFontSize(10);
      pdf.text(`Report Period: ${startDate} to ${endDate}`, margin, yPosition);
      yPosition += 8;

      if (reportType === 'business') {
        // Business metrics
        pdf.setFontSize(12);
        pdf.text('Business Summary', margin, yPosition);
        yPosition += 8;

        const summaryData = [
          ['Metric', 'Amount'],
          ['Total Revenue', formatCurrency(businessMetrics.revenue)],
          ['Total Expenses', formatCurrency(businessMetrics.expenses)],
          ['Net Profit', formatCurrency(businessMetrics.profit)],
          ['Profit Margin', `${businessMetrics.profitMargin.toFixed(2)}%`],
          ['Invoice Total', formatCurrency(businessMetrics.invoiceTotal)],
          ['Paid Invoices', formatCurrency(businessMetrics.invoicePaid)],
          ['Pending Invoices', formatCurrency(businessMetrics.invoicePending)],
          ['Total Customers', businessMetrics.customerCount.toString()],
        ];

        const tableY = yPosition;
        let tableRowY = tableY;
        const cellHeight = 6;
        const col1Width = 50;
        const col2Width = 40;

        summaryData.forEach((row, index) => {
          if (index === 0) {
            pdf.setFillColor(240, 240, 240);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
          } else {
            pdf.setFont(undefined, 'normal');
          }
          pdf.text(row[0], margin, tableRowY + 4);
          pdf.text(row[1], margin + col1Width, tableRowY + 4);
          tableRowY += cellHeight;
        });

        yPosition = tableRowY + 10;
      } else {
        // Earnings report
        pdf.setFontSize(12);
        pdf.text('Earnings Breakdown', margin, yPosition);
        yPosition += 8;

        const totalEarnings = monthlyReports.reduce((sum, r) => sum + r.totalEarnings, 0);
        const totalHours = monthlyReports.reduce((sum, r) => sum + r.totalHours, 0);
        const totalTransactions = monthlyReports.reduce((sum, r) => sum + r.transactionCount, 0);

        const summaryData = [
          ['Metric', 'Amount'],
          ['Total Earnings', formatCurrency(totalEarnings)],
          ['Total Hours', totalHours.toFixed(1)],
          ['Avg Hourly Rate', formatCurrency(totalHours > 0 ? totalEarnings / totalHours : 0)],
          ['Total Transactions', totalTransactions.toString()],
        ];

        const tableY = yPosition;
        let tableRowY = tableY;
        const cellHeight = 6;

        summaryData.forEach((row, index) => {
          if (index === 0) {
            pdf.setFillColor(240, 240, 240);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
          } else {
            pdf.setFont(undefined, 'normal');
          }
          pdf.text(row[0], margin, tableRowY + 4);
          pdf.text(row[1], margin + 50, tableRowY + 4);
          tableRowY += cellHeight;
        });

        yPosition = tableRowY + 10;
      }

      // Footer
      pdf.setFontSize(8);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);

      pdf.save(`report-${startDate}-to-${endDate}.pdf`);
      notify.success('Export Complete', 'Report has been exported to PDF');
    } catch (error) {
      notify.error('Export Failed', 'Failed to export report as PDF');
      console.error('PDF export error:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      // Create CSV content that Excel can open
      let csvContent = 'Financial Report\n';
      csvContent += `Period: ${startDate} to ${endDate}\n\n`;

      if (reportType === 'business') {
        csvContent += 'Business Summary\n';
        csvContent += 'Metric,Amount\n';
        csvContent += `Total Revenue,${businessMetrics.revenue.toFixed(2)}\n`;
        csvContent += `Total Expenses,${businessMetrics.expenses.toFixed(2)}\n`;
        csvContent += `Net Profit,${businessMetrics.profit.toFixed(2)}\n`;
        csvContent += `Profit Margin,${businessMetrics.profitMargin.toFixed(2)}%\n`;
        csvContent += `Invoice Total,${businessMetrics.invoiceTotal.toFixed(2)}\n`;
        csvContent += `Paid Invoices,${businessMetrics.invoicePaid.toFixed(2)}\n`;
        csvContent += `Pending Invoices,${businessMetrics.invoicePending.toFixed(2)}\n`;
        csvContent += `Total Customers,${businessMetrics.customerCount}\n`;
      } else {
        csvContent += 'Earnings Breakdown\n';
        csvContent += 'Period,Total Earnings,Hours Worked,Avg Rate,Transactions\n';
        monthlyReports.forEach(report => {
          csvContent += `${report.month},${report.totalEarnings.toFixed(2)},${report.totalHours.toFixed(1)},${report.avgHourlyRate.toFixed(2)},${report.transactionCount}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${startDate}-to-${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify.success('Export Complete', 'Report has been exported to Excel');
    } catch (error) {
      notify.error('Export Failed', 'Failed to export report to Excel');
      console.error('Excel export error:', error);
    }
  };

  const handleExportJSON = () => {
    const reportData = reportType === 'business' ? {
      reportType,
      period: { startDate, endDate },
      summary: businessMetrics,
      chartData,
      generatedAt: new Date().toISOString(),
    } : {
      reportType,
      year: selectedYear,
      month: reportType === 'monthly' ? selectedMonth : null,
      summary: {
        totalEarnings: monthlyReports.reduce((sum, r) => sum + r.totalEarnings, 0),
        totalHours: monthlyReports.reduce((sum, r) => sum + r.totalHours, 0),
        totalTransactions: monthlyReports.reduce((sum, r) => sum + r.transactionCount, 0),
      },
      breakdown: monthlyReports,
      generatedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${reportType}-${startDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success('Export Complete', 'Report has been exported to JSON');
  };

  const handleExportCSV = () => {
    if (reportType === 'business') {
      handleExportExcel();
    } else {
      const exportData = monthlyReports.map(report => ({
        Period: report.month,
        'Total Earnings': report.totalEarnings.toFixed(2),
        'Hours Worked': report.totalHours.toFixed(1),
        'Avg Hourly Rate': report.avgHourlyRate.toFixed(2),
        Transactions: report.transactionCount,
      }));

      const filename = `report-${reportType}-${selectedYear}`;
      exportToCSV(exportData, filename);
      notify.success('Export Complete', 'Report has been exported to CSV');
    }
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
        <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {reportType === 'business' ? 'Business analytics and performance metrics' : 'Comprehensive earnings and performance reports'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button
            onClick={generatePrintableReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(FormValidation.parseReportType(e.target.value) as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="business">Business Report</option>
              <option value="monthly">Monthly Earnings</option>
              <option value="annual">Annual Earnings</option>
            </select>
          </div>

          {reportType === 'business' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Report Summary */}
      {reportType === 'business' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Total Revenue</div>
                <div className="mt-2 text-3xl font-bold">
                  {formatCurrency(businessMetrics.revenue)}
                </div>
              </div>
              <TrendingUp className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Total Expenses</div>
                <div className="mt-2 text-3xl font-bold">
                  {formatCurrency(businessMetrics.expenses)}
                </div>
              </div>
              <TrendingDown className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className={`bg-gradient-to-br ${businessMetrics.profit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white shadow-lg rounded-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Net Profit</div>
                <div className="mt-2 text-3xl font-bold">
                  {formatCurrency(businessMetrics.profit)}
                </div>
              </div>
              <ArrowRight className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg rounded-lg p-6">
            <div className="text-sm font-medium opacity-90">Profit Margin</div>
            <div className="mt-2 text-3xl font-bold">
              {businessMetrics.profitMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Business Charts */}
      {reportType === 'business' && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Expenses Chart */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Revenue vs Expenses
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Trend Chart */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Profit Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Invoice Status */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Invoice Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie data={[
                { name: 'Paid', value: businessMetrics.invoicePaid, fill: '#10b981' },
                { name: 'Pending', value: businessMetrics.invoicePending, fill: '#f59e0b' },
              ]}>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats for Business */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Invoices</span>
                <span className="font-bold text-gray-900 dark:text-white">{businessMetrics.invoiceTotal > 0 ? formatCurrency(businessMetrics.invoiceTotal) : 'No invoices'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Customers</span>
                <span className="font-bold text-gray-900 dark:text-white">{businessMetrics.customerCount}</span>
              </div>
              {businessMetrics.topCustomer && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Top Customer</span>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{businessMetrics.topCustomer.name}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(businessMetrics.topCustomer.value)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report Table */}
      {reportType !== 'business' && (
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
      )}

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
