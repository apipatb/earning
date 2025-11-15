import { useState } from 'react';
import { Download, FileText, Database, Calendar, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { notify } from '../store/notification.store';

interface ExportOptions {
  includeEarnings: boolean;
  includeExpenses: boolean;
  includeClients: boolean;
  includeTimeEntries: boolean;
  includeInvoices: boolean;
  includeGoals: boolean;
  includeBudgets: boolean;
  includeTemplates: boolean;
  dateRange: 'all' | 'year' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

export default function DataExport() {
  const [options, setOptions] = useState<ExportOptions>({
    includeEarnings: true,
    includeExpenses: true,
    includeClients: true,
    includeTimeEntries: true,
    includeInvoices: true,
    includeGoals: true,
    includeBudgets: true,
    includeTemplates: true,
    dateRange: 'all',
  });

  const [exporting, setExporting] = useState(false);

  const filterByDateRange = (items: any[], dateField: string = 'date') => {
    if (options.dateRange === 'all') return items;

    const now = new Date();
    let startDate = new Date();

    switch (options.dateRange) {
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (options.customStartDate) {
          startDate = new Date(options.customStartDate);
        }
        break;
    }

    const endDate = options.customEndDate ? new Date(options.customEndDate) : now;

    return items.filter((item: any) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const getAllData = () => {
    const data: any = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      application: 'EarnTrack',
    };

    if (options.includeEarnings) {
      const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
      data.earnings = filterByDateRange(earnings, 'date');
    }

    if (options.includeExpenses) {
      const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      data.expenses = filterByDateRange(expenses, 'date');
    }

    if (options.includeClients) {
      data.clients = JSON.parse(localStorage.getItem('clients') || '[]');
    }

    if (options.includeTimeEntries) {
      const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]');
      data.timeEntries = filterByDateRange(timeEntries, 'startTime');
    }

    if (options.includeInvoices) {
      const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
      data.invoices = filterByDateRange(invoices, 'date');
    }

    if (options.includeGoals) {
      data.goals = JSON.parse(localStorage.getItem('goals') || '[]');
    }

    if (options.includeBudgets) {
      data.budgets = JSON.parse(localStorage.getItem('budgets') || '[]');
    }

    if (options.includeTemplates) {
      data.recurringTemplates = JSON.parse(localStorage.getItem('recurring_templates') || '[]');
      data.reportTemplates = JSON.parse(localStorage.getItem('report_templates') || '[]');
    }

    return data;
  };

  const exportAsJSON = () => {
    setExporting(true);
    try {
      const data = getAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earntrack-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success('Export Complete', 'Data exported as JSON successfully');
    } catch (error) {
      notify.error('Export Failed', 'Failed to export data as JSON');
    } finally {
      setExporting(false);
    }
  };

  const exportAsCSV = () => {
    setExporting(true);
    try {
      const data = getAllData();
      let csvContent = '';

      // Export earnings
      if (data.earnings && data.earnings.length > 0) {
        csvContent += 'EARNINGS\n';
        csvContent += 'ID,Amount,Platform ID,Date,Description,Hours,Hourly Rate\n';
        data.earnings.forEach((e: any) => {
          csvContent += `"${e.id}",${e.amount},"${e.platformId}","${e.date}","${e.description || ''}",${e.hours || ''},${e.hourlyRate || ''}\n`;
        });
        csvContent += '\n';
      }

      // Export expenses
      if (data.expenses && data.expenses.length > 0) {
        csvContent += 'EXPENSES\n';
        csvContent += 'ID,Amount,Category,Description,Date,Payment Method,Is Recurring\n';
        data.expenses.forEach((e: any) => {
          csvContent += `"${e.id}",${e.amount},"${e.category}","${e.description}","${e.date}","${e.paymentMethod}",${e.isRecurring}\n`;
        });
        csvContent += '\n';
      }

      // Export clients
      if (data.clients && data.clients.length > 0) {
        csvContent += 'CLIENTS\n';
        csvContent += 'ID,Name,Email,Phone,Company,Hourly Rate,Status,Total Earnings,Projects Count\n';
        data.clients.forEach((c: any) => {
          csvContent += `"${c.id}","${c.name}","${c.email}","${c.phone}","${c.company}",${c.hourlyRate},"${c.status}",${c.totalEarnings},${c.projectsCount}\n`;
        });
        csvContent += '\n';
      }

      // Export time entries
      if (data.timeEntries && data.timeEntries.length > 0) {
        csvContent += 'TIME ENTRIES\n';
        csvContent += 'ID,Description,Project,Start Time,End Time,Duration (seconds),Hourly Rate,Total Amount,Is Billable\n';
        data.timeEntries.forEach((t: any) => {
          csvContent += `"${t.id}","${t.description}","${t.projectName}","${t.startTime}","${t.endTime}",${t.duration},${t.hourlyRate},${t.totalAmount},${t.isBillable}\n`;
        });
        csvContent += '\n';
      }

      // Export invoices
      if (data.invoices && data.invoices.length > 0) {
        csvContent += 'INVOICES\n';
        csvContent += 'ID,Invoice Number,Client Name,Date,Due Date,Subtotal,Tax,Total,Status\n';
        data.invoices.forEach((i: any) => {
          csvContent += `"${i.id}","${i.invoiceNumber}","${i.clientName}","${i.date}","${i.dueDate}",${i.subtotal},${i.tax},${i.total},"${i.status}"\n`;
        });
        csvContent += '\n';
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earntrack-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success('Export Complete', 'Data exported as CSV successfully');
    } catch (error) {
      notify.error('Export Failed', 'Failed to export data as CSV');
    } finally {
      setExporting(false);
    }
  };

  const exportAsExcel = () => {
    // Since we can't actually create Excel files without a library,
    // we'll export as CSV with .xlsx extension which Excel can open
    notify.info('Excel Export', 'Exporting as CSV format (Excel compatible)');
    exportAsCSV();
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const imported = JSON.parse(event.target.result);

          // Confirm before importing
          if (!confirm('This will merge imported data with existing data. Continue?')) {
            return;
          }

          // Import each data type
          if (imported.earnings) {
            const existing = JSON.parse(localStorage.getItem('earnings') || '[]');
            const merged = [...existing, ...imported.earnings];
            localStorage.setItem('earnings', JSON.stringify(merged));
          }

          if (imported.expenses) {
            const existing = JSON.parse(localStorage.getItem('expenses') || '[]');
            const merged = [...existing, ...imported.expenses];
            localStorage.setItem('expenses', JSON.stringify(merged));
          }

          if (imported.clients) {
            const existing = JSON.parse(localStorage.getItem('clients') || '[]');
            const merged = [...existing, ...imported.clients];
            localStorage.setItem('clients', JSON.stringify(merged));
          }

          if (imported.timeEntries) {
            const existing = JSON.parse(localStorage.getItem('time_entries') || '[]');
            const merged = [...existing, ...imported.timeEntries];
            localStorage.setItem('time_entries', JSON.stringify(merged));
          }

          if (imported.invoices) {
            const existing = JSON.parse(localStorage.getItem('invoices') || '[]');
            const merged = [...existing, ...imported.invoices];
            localStorage.setItem('invoices', JSON.stringify(merged));
          }

          notify.success('Import Complete', 'Data imported successfully. Please refresh the page.');
        } catch (error) {
          notify.error('Import Failed', 'Failed to parse JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions({ ...options, [key]: !options[key] });
  };

  const dataCount = (() => {
    let count = 0;
    if (options.includeEarnings) count += JSON.parse(localStorage.getItem('earnings') || '[]').length;
    if (options.includeExpenses) count += JSON.parse(localStorage.getItem('expenses') || '[]').length;
    if (options.includeClients) count += JSON.parse(localStorage.getItem('clients') || '[]').length;
    if (options.includeTimeEntries) count += JSON.parse(localStorage.getItem('time_entries') || '[]').length;
    if (options.includeInvoices) count += JSON.parse(localStorage.getItem('invoices') || '[]').length;
    if (options.includeGoals) count += JSON.parse(localStorage.getItem('goals') || '[]').length;
    return count;
  })();

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Data Export & Import</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Backup and restore your data in multiple formats
            </p>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          What to Export
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeEarnings}
              onChange={() => toggleOption('includeEarnings')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Earnings</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeExpenses}
              onChange={() => toggleOption('includeExpenses')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Expenses</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeClients}
              onChange={() => toggleOption('includeClients')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Clients</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeTimeEntries}
              onChange={() => toggleOption('includeTimeEntries')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Time Entries</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeInvoices}
              onChange={() => toggleOption('includeInvoices')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Invoices</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeGoals}
              onChange={() => toggleOption('includeGoals')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Goals</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeBudgets}
              onChange={() => toggleOption('includeBudgets')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Budgets</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <input
              type="checkbox"
              checked={options.includeTemplates}
              onChange={() => toggleOption('includeTemplates')}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Templates</span>
          </label>
        </div>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Date Range
        </h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={options.dateRange}
            onChange={(e) => setOptions({ ...options, dateRange: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Time</option>
            <option value="year">This Year</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {options.dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={options.customStartDate || ''}
                onChange={(e) => setOptions({ ...options, customStartDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Start date"
              />
              <input
                type="date"
                value={options.customEndDate || ''}
                onChange={(e) => setOptions({ ...options, customEndDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="End date"
              />
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Export Summary
          </h4>
        </div>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Ready to export approximately <strong>{dataCount} records</strong> in the selected format
        </p>
      </div>

      {/* Export Buttons */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Export Format
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={exportAsJSON}
            disabled={exporting || dataCount === 0}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FileText className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">JSON</div>
              <div className="text-xs opacity-90">Complete data structure</div>
            </div>
          </button>

          <button
            onClick={exportAsCSV}
            disabled={exporting || dataCount === 0}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Database className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">CSV</div>
              <div className="text-xs opacity-90">Spreadsheet compatible</div>
            </div>
          </button>

          <button
            onClick={exportAsExcel}
            disabled={exporting || dataCount === 0}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Calendar className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">Excel</div>
              <div className="text-xs opacity-90">Excel compatible CSV</div>
            </div>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Import Data
        </h3>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Important:</strong> Importing will merge new data with existing data.
              Make sure to backup your current data before importing.
            </div>
          </div>
        </div>
        <button
          onClick={importData}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Download className="w-5 h-5 rotate-180" />
          Import from JSON
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Export & Import Tips
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>JSON format preserves all data and structure, ideal for backups</li>
          <li>CSV format is great for importing into spreadsheet applications</li>
          <li>Excel format is CSV optimized for Microsoft Excel</li>
          <li>Regular backups protect against data loss</li>
          <li>Imported data is merged with existing data, not replaced</li>
          <li>Use date ranges to export specific time periods</li>
        </ul>
      </div>
    </div>
  );
}
