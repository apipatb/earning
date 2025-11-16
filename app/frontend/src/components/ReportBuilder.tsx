import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, DollarSign, Clock, Users, Plus, Save, Trash2, Eye } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { notify } from '../store/notification.store';

// Data item interfaces for different report types
interface EarningItem {
  id: string;
  date: string;
  amount: number;
  platformId?: string;
  clientId?: string;
  projectName?: string;
  category?: string;
  description?: string;
}

interface ExpenseItem {
  id: string;
  date: string;
  amount: number;
  category?: string;
  description?: string;
}

interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  projectName?: string;
  clientId?: string;
  description?: string;
}

interface Client {
  id: string;
  name: string;
  totalAmount?: number;
  totalEarnings?: number;
  projectCount?: number;
}

// Union type for all report data items
type ReportDataItem = EarningItem | ExpenseItem | TimeEntry | Client;

// Chart data structure
interface ChartDataPoint {
  name: string;
  value: number;
  count: number;
  average: number;
}

// Grouped data structure
interface GroupedDataValue {
  total: number;
  count: number;
  average: number;
}

type GroupedData = Record<string, GroupedDataValue>;

// Date range types
type DateRangeType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ReportType = 'earnings' | 'expenses' | 'time' | 'clients' | 'custom';
type GroupByType = 'day' | 'week' | 'month' | 'project' | 'client' | 'category';
type ChartType = 'bar' | 'line' | 'pie' | 'table';
type ExportFormat = 'csv' | 'json';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  dateRange: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  metrics: string[];
  groupBy: GroupByType;
  chartType: ChartType;
  filters: {
    platforms?: string[];
    clients?: string[];
    projects?: string[];
    categories?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  createdAt: string;
}

interface ReportData {
  summary: {
    totalAmount: number;
    count: number;
    average: number;
    highest: number;
    lowest: number;
  };
  chartData: ChartDataPoint[];
  tableData: ReportDataItem[];
}

interface ReportFormData {
  name: string;
  description: string;
  type: ReportType;
  dateRange: DateRangeType;
  customStartDate: string;
  customEndDate: string;
  metrics: string[];
  groupBy: GroupByType;
  chartType: ChartType;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function ReportBuilder() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

  const [formData, setFormData] = useState<ReportFormData>({
    name: '',
    description: '',
    type: 'earnings',
    dateRange: 'month',
    customStartDate: '',
    customEndDate: '',
    metrics: [],
    groupBy: 'day',
    chartType: 'bar',
  });

  useEffect(() => {
    loadTemplates();
    loadDefaultTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      generateReport(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadTemplates = (): void => {
    const stored = localStorage.getItem('report_templates');
    if (stored) {
      setTemplates(JSON.parse(stored) as ReportTemplate[]);
    }
  };

  const loadDefaultTemplates = (): void => {
    const stored = localStorage.getItem('report_templates');
    if (!stored) {
      const defaultTemplates: ReportTemplate[] = [
        {
          id: 'monthly-earnings',
          name: 'Monthly Earnings Report',
          description: 'Comprehensive monthly earnings breakdown',
          type: 'earnings',
          dateRange: 'month',
          metrics: ['total', 'average', 'count'],
          groupBy: 'day',
          chartType: 'bar',
          filters: {},
          createdAt: new Date().toISOString(),
        },
        {
          id: 'client-summary',
          name: 'Client Summary Report',
          description: 'Earnings breakdown by client',
          type: 'clients',
          dateRange: 'quarter',
          metrics: ['total', 'count'],
          groupBy: 'client',
          chartType: 'pie',
          filters: {},
          createdAt: new Date().toISOString(),
        },
        {
          id: 'platform-analysis',
          name: 'Platform Analysis',
          description: 'Performance comparison across platforms',
          type: 'earnings',
          dateRange: 'month',
          metrics: ['total', 'average'],
          groupBy: 'project',
          chartType: 'bar',
          filters: {},
          createdAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem('report_templates', JSON.stringify(defaultTemplates));
      setTemplates(defaultTemplates);
    }
  };

  const hasDateProperty = (item: ReportDataItem): item is EarningItem | ExpenseItem => {
    return 'date' in item;
  };

  const hasStartTimeProperty = (item: ReportDataItem): item is TimeEntry => {
    return 'startTime' in item;
  };

  const getItemAmount = (item: ReportDataItem): number => {
    if ('amount' in item) {
      return item.amount;
    }
    if ('totalAmount' in item && typeof item.totalAmount === 'number') {
      return item.totalAmount;
    }
    if ('totalEarnings' in item && typeof item.totalEarnings === 'number') {
      return item.totalEarnings;
    }
    return 0;
  };

  const generateReport = (template: ReportTemplate): void => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]') as EarningItem[];
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]') as ExpenseItem[];
    const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]') as TimeEntry[];
    const clients = JSON.parse(localStorage.getItem('clients') || '[]') as Client[];

    // Filter by date range
    const { startDate, endDate } = getDateRange(template.dateRange, template.customStartDate, template.customEndDate);

    let data: ReportDataItem[] = [];

    switch (template.type) {
      case 'earnings':
        data = earnings.filter((e: EarningItem) => {
          const date = new Date(e.date);
          return date >= startDate && date <= endDate;
        });
        break;
      case 'expenses':
        data = expenses.filter((e: ExpenseItem) => {
          const date = new Date(e.date);
          return date >= startDate && date <= endDate;
        });
        break;
      case 'time':
        data = timeEntries.filter((e: TimeEntry) => {
          const date = new Date(e.startTime);
          return date >= startDate && date <= endDate;
        });
        break;
      case 'clients':
        data = clients;
        break;
    }

    // Apply filters
    if (template.filters.minAmount) {
      data = data.filter((item: ReportDataItem) => getItemAmount(item) >= template.filters.minAmount!);
    }
    if (template.filters.maxAmount) {
      data = data.filter((item: ReportDataItem) => getItemAmount(item) <= template.filters.maxAmount!);
    }

    // Calculate summary
    const amounts = data.map((item: ReportDataItem) => getItemAmount(item));
    const summary = {
      totalAmount: amounts.reduce((sum: number, val: number) => sum + val, 0),
      count: data.length,
      average: amounts.length > 0 ? amounts.reduce((sum: number, val: number) => sum + val, 0) / amounts.length : 0,
      highest: amounts.length > 0 ? Math.max(...amounts) : 0,
      lowest: amounts.length > 0 ? Math.min(...amounts) : 0,
    };

    // Group data
    const grouped = groupData(data, template.groupBy, template.type);
    const chartData: ChartDataPoint[] = Object.entries(grouped).map(([key, value]: [string, GroupedDataValue]) => ({
      name: key,
      value: value.total,
      count: value.count,
      average: value.average,
    }));

    setReportData({
      summary,
      chartData,
      tableData: data,
    });
  };

  const getDateRange = (range: DateRangeType, customStart?: string, customEnd?: string): DateRange => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        if (customStart) startDate = new Date(customStart);
        if (customEnd) endDate = new Date(customEnd);
        break;
    }

    return { startDate, endDate };
  };

  const groupData = (data: ReportDataItem[], groupBy: GroupByType, type: ReportType): GroupedData => {
    const grouped: GroupedData = {};

    data.forEach((item: ReportDataItem) => {
      let key: string;

      switch (groupBy) {
        case 'day':
          if (hasDateProperty(item)) {
            key = new Date(item.date).toLocaleDateString();
          } else if (hasStartTimeProperty(item)) {
            key = new Date(item.startTime).toLocaleDateString();
          } else {
            key = 'Unknown';
          }
          break;
        case 'week':
          let weekDate: Date;
          if (hasDateProperty(item)) {
            weekDate = new Date(item.date);
          } else if (hasStartTimeProperty(item)) {
            weekDate = new Date(item.startTime);
          } else {
            key = 'Unknown';
            break;
          }
          const weekStart = new Date(weekDate);
          weekStart.setDate(weekDate.getDate() - weekDate.getDay());
          key = weekStart.toLocaleDateString();
          break;
        case 'month':
          let monthDate: Date;
          if (hasDateProperty(item)) {
            monthDate = new Date(item.date);
          } else if (hasStartTimeProperty(item)) {
            monthDate = new Date(item.startTime);
          } else {
            key = 'Unknown';
            break;
          }
          key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'project':
          if ('platformId' in item && item.platformId) {
            key = item.platformId;
          } else if ('projectName' in item && item.projectName) {
            key = item.projectName;
          } else {
            key = 'Unknown';
          }
          break;
        case 'client':
          if ('clientId' in item && item.clientId) {
            key = item.clientId;
          } else if ('name' in item && item.name) {
            key = item.name;
          } else {
            key = 'Unknown';
          }
          break;
        case 'category':
          if ('category' in item && item.category) {
            key = item.category;
          } else {
            key = 'Uncategorized';
          }
          break;
        default:
          key = 'All';
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, average: 0 };
      }

      const amount = getItemAmount(item);
      grouped[key].total += amount;
      grouped[key].count += 1;
    });

    // Calculate averages
    Object.keys(grouped).forEach(key => {
      grouped[key].average = grouped[key].total / grouped[key].count;
    });

    return grouped;
  };

  const saveTemplate = (): void => {
    if (!formData.name) {
      notify.error('Validation Error', 'Template name is required');
      return;
    }

    const newTemplate: ReportTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      ...formData,
      filters: {},
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
    };

    let updatedTemplates: ReportTemplate[];
    if (editingTemplate) {
      updatedTemplates = templates.map(t => t.id === editingTemplate.id ? newTemplate : t);
      notify.success('Updated', 'Report template updated');
    } else {
      updatedTemplates = [...templates, newTemplate];
      notify.success('Created', 'Report template created');
    }

    localStorage.setItem('report_templates', JSON.stringify(updatedTemplates));
    setTemplates(updatedTemplates);
    resetForm();
  };

  const deleteTemplate = (id: string): void => {
    if (!confirm('Delete this report template?')) return;

    const updatedTemplates = templates.filter(t => t.id !== id);
    localStorage.setItem('report_templates', JSON.stringify(updatedTemplates));
    setTemplates(updatedTemplates);
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null);
      setReportData(null);
    }
    notify.success('Deleted', 'Report template deleted');
  };

  const resetForm = (): void => {
    setFormData({
      name: '',
      description: '',
      type: 'earnings',
      dateRange: 'month',
      customStartDate: '',
      customEndDate: '',
      metrics: [],
      groupBy: 'day',
      chartType: 'bar',
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const exportReport = (format: ExportFormat): void => {
    if (!reportData || !selectedTemplate) return;

    let content = '';
    let filename = `${selectedTemplate.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      // CSV Header
      content = 'Name,Value,Count,Average\n';
      reportData.chartData.forEach((row: ChartDataPoint) => {
        content += `"${row.name}",${row.value},${row.count},${row.average.toFixed(2)}\n`;
      });
      filename += '.csv';
    } else {
      // JSON
      content = JSON.stringify({
        template: selectedTemplate.name,
        generatedAt: new Date().toISOString(),
        summary: reportData.summary,
        data: reportData.chartData,
      }, null, 2);
      filename += '.json';
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    notify.success('Exported', `Report exported as ${format.toUpperCase()}`);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Custom Report Builder</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Create and customize detailed reports
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Template Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Monthly Revenue Report"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ReportType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="earnings">Earnings</option>
                <option value="expenses">Expenses</option>
                <option value="time">Time Tracking</option>
                <option value="clients">Clients</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <select
                value={formData.dateRange}
                onChange={(e) => setFormData({ ...formData, dateRange: e.target.value as DateRangeType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group By
              </label>
              <select
                value={formData.groupBy}
                onChange={(e) => setFormData({ ...formData, groupBy: e.target.value as GroupByType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="project">Project</option>
                <option value="client">Client</option>
                <option value="category">Category</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chart Type
              </label>
              <select
                value={formData.chartType}
                onChange={(e) => setFormData({ ...formData, chartType: e.target.value as ChartType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="table">Table</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={2}
                placeholder="Brief description of this report..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={saveTemplate}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Save className="w-4 h-4 inline mr-2" />
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Report Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedTemplate?.id === template.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {template.name}
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                  {template.type}
                </span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                  {template.dateRange}
                </span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                  {template.chartType}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Display */}
      {selectedTemplate && reportData && (
        <div className="space-y-6">
          {/* Export Buttons */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedTemplate.name}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => exportReport('csv')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => exportReport('json')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Total</div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                ${reportData.summary.totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-700 dark:text-green-300 mb-1">Count</div>
              <div className="text-lg font-bold text-green-900 dark:text-green-100">
                {reportData.summary.count}
              </div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-xs text-purple-700 dark:text-purple-300 mb-1">Average</div>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                ${reportData.summary.average.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-xs text-orange-700 dark:text-orange-300 mb-1">Highest</div>
              <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                ${reportData.summary.highest.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-xs text-red-700 dark:text-red-300 mb-1">Lowest</div>
              <div className="text-lg font-bold text-red-900 dark:text-red-100">
                ${reportData.summary.lowest.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={400}>
              {selectedTemplate.chartType === 'bar' && (
                <BarChart data={reportData.chartData}>
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
                  <Bar dataKey="value" fill="#8b5cf6" name="Amount ($)" />
                  <Bar dataKey="count" fill="#3b82f6" name="Count" />
                </BarChart>
              )}
              {selectedTemplate.chartType === 'line' && (
                <LineChart data={reportData.chartData}>
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
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} name="Amount ($)" />
                  <Line type="monotone" dataKey="average" stroke="#10b981" strokeWidth={2} name="Average ($)" />
                </LineChart>
              )}
              {selectedTemplate.chartType === 'pie' && (
                <PieChart>
                  <Pie
                    data={reportData.chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.chartData.map((entry, index) => (
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
              )}
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          {selectedTemplate.chartType === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Count</th>
                    <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.chartData.map((row: ChartDataPoint, index: number) => (
                    <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{row.name}</td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">${row.value.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{row.count}</td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-white">${row.average.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Report Builder Tips
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Create custom templates for recurring reports you need regularly</li>
          <li>Use different chart types to visualize data in the most meaningful way</li>
          <li>Group data by project, client, or category for detailed breakdowns</li>
          <li>Export reports as CSV or JSON for further analysis in other tools</li>
          <li>Combine date ranges and filters to focus on specific time periods</li>
        </ul>
      </div>
    </div>
  );
}
