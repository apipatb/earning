import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar, Download, Upload, FileDown } from 'lucide-react';
import { earningsAPI, platformsAPI } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { exportEarningsToCSV } from '../lib/export';
import { notify } from '../store/notification.store';
import { parseCSV, downloadCSVTemplate, CSVEarning } from '../lib/csvImport';
import { useFormValidation } from '../hooks/useFormValidation';
import { validateRequired, validateAmount, validateDateRange, validatePositiveNumber } from '../lib/form-validation';
import { FormInput, FormSelect, FormTextarea, FormErrorBlock } from '../components/FormError';

interface Earning {
  id: string;
  date: string;
  hours: number | null;
  amount: number;
  notes: string | null;
  platform: {
    id: string;
    name: string;
    category: string;
    color: string | null;
  };
}

interface Platform {
  id: string;
  name: string;
  category: string;
  color: string | null;
}

export default function Earnings() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<CSVEarning[] | null>(null);

  const { user } = useAuthStore();

  const initialFormData = {
    platformId: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    amount: '',
    notes: '',
  };

  const { values: formData, errors, touched, handleChange, handleBlur, handleSubmit, resetForm: resetFormValidation, setFieldValue } = useFormValidation(
    initialFormData,
    {
      validators: {
        platformId: validateRequired,
        date: (fieldName, value) => {
          const required = validateRequired(value);
          if (!required.isValid) return required;
          return validateDateRange(value, '1900-01-01', new Date().toISOString().split('T')[0]);
        },
        amount: validateAmount,
        hours: (fieldName, value) => {
          if (!value) return { isValid: true }; // Optional field
          return validatePositiveNumber(value);
        },
      },
      validateOnBlur: true,
      validateOnChange: false,
      validateOnSubmit: true,
    }
  );

  useEffect(() => {
    loadData();
  }, [filterPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsData, platformsData] = await Promise.all([
        earningsAPI.getEarnings(filterPeriod),
        platformsAPI.getPlatforms(),
      ]);
      setEarnings(earningsData);
      setPlatforms(platformsData.filter((p: Platform) => p.id));
    } catch (error) {
      console.error('Failed to load data:', error);
      notify.error('Error', 'Failed to load earnings data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onFormSubmit = async (values: Record<string, any>) => {
    try {
      const payload = {
        platformId: values.platformId,
        date: values.date,
        hours: values.hours ? parseFloat(values.hours) : null,
        amount: parseFloat(values.amount),
        notes: values.notes || null,
      };

      if (editingId) {
        await earningsAPI.updateEarning(editingId, payload);
        notify.success('Earning Updated', 'Your earning has been updated successfully.');
      } else {
        await earningsAPI.createEarning(payload);
        notify.success('Earning Added', `Successfully added $${values.amount} to your earnings!`);
      }

      resetFormComplete();
      loadData();
    } catch (error) {
      console.error('Failed to save earning:', error);
      notify.error('Error', 'Failed to save earning. Please try again.');
    }
  };

  const handleEdit = (earning: Earning) => {
    setEditingId(earning.id);
    setFieldValue('platformId', earning.platform.id);
    setFieldValue('date', earning.date);
    setFieldValue('hours', earning.hours?.toString() || '');
    setFieldValue('amount', earning.amount.toString());
    setFieldValue('notes', earning.notes || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this earning?')) return;

    try {
      await earningsAPI.deleteEarning(id);
      notify.success('Earning Deleted', 'Earning has been removed successfully.');
      loadData();
    } catch (error) {
      console.error('Failed to delete earning:', error);
      notify.error('Error', 'Failed to delete earning. Please try again.');
    }
  };

  const resetFormComplete = () => {
    resetFormValidation();
    setEditingId(null);
    setShowForm(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);

      if (!result.success) {
        notify.error('Import Failed', result.errors?.[0] || 'Failed to parse CSV file');
        if (result.errors && result.errors.length > 1) {
          result.errors.slice(1, 3).forEach(err => {
            notify.warning('Import Error', err);
          });
        }
        return;
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          notify.warning('Import Warning', warning);
        });
      }

      setImportPreview(result.data || []);
      notify.success('CSV Parsed', `Found ${result.data?.length || 0} earnings to import`);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImport = async () => {
    if (!importPreview || importPreview.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of importPreview) {
      try {
        // Find or create platform
        let platform = platforms.find(
          p => p.name.toLowerCase() === item.platformName.toLowerCase()
        );

        if (!platform) {
          // Create new platform
          const response = await platformsAPI.create({
            name: item.platformName,
            category: 'freelance',
            isActive: true,
          });
          platform = response.data.platform;
          setPlatforms([...platforms, platform]);
        }

        // Create earning
        await earningsAPI.createEarning({
          platformId: platform.id,
          date: item.date,
          amount: item.amount,
          hours: item.hours || null,
          notes: item.notes || null,
        });

        successCount++;
      } catch (error) {
        console.error('Failed to import earning:', error);
        errorCount++;
      }
    }

    setImporting(false);
    setImportPreview(null);
    setShowImportModal(false);

    if (successCount > 0) {
      notify.success(
        'Import Complete',
        `Successfully imported ${successCount} earnings${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      );
      loadData();
    } else {
      notify.error('Import Failed', 'No earnings were imported');
    }
  };

  const totalAmount = earnings.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const totalHours = earnings.reduce((sum, e) => sum + (parseFloat(e.hours?.toString() || '0') || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportEarningsToCSV(earnings)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors dark:bg-green-500 dark:hover:bg-green-600"
            disabled={earnings.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add Earning
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['today', 'week', 'month', 'all'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setFilterPeriod(period)}
            className={`px-4 py-2 font-medium transition-colors ${
              filterPeriod === period
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Earned</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${totalAmount.toFixed(2)}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Hours</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {totalHours.toFixed(1)}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Avg Hourly Rate</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${totalHours > 0 ? (totalAmount / totalHours).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Earning' : 'Add New Earning'}
          </h2>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Platform"
                name="platformId"
                value={formData.platformId}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.platformId?.message}
                touched={touched.platformId}
                required
                placeholder="Select platform"
                options={platforms.map((p) => ({ value: p.id, label: p.name }))}
              />

              <FormInput
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.date?.message}
                touched={touched.date}
                required
              />

              <FormInput
                label="Amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.amount?.message}
                touched={touched.amount}
                required
              />

              <FormInput
                label="Hours"
                name="hours"
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={formData.hours}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.hours?.message}
                touched={touched.hours}
                helperText="(Optional)"
              />
            </div>

            <FormTextarea
              label="Notes"
              name="notes"
              placeholder="Add any notes about this earning..."
              value={formData.notes}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.notes?.message}
              touched={touched.notes}
              rows={3}
              helperText="(Optional)"
            />

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={Object.values(errors).some((e) => e !== undefined) && Object.keys(touched).length > 0}
              >
                {editingId ? 'Update' : 'Add'} Earning
              </button>
              <button
                type="button"
                onClick={resetFormComplete}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Earnings List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No earnings recorded yet. Click "Add Earning" to get started!
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => {
                  const hourlyRate = earning.hours
                    ? (parseFloat(earning.amount.toString()) / parseFloat(earning.hours.toString()))
                    : null;

                  return (
                    <tr key={earning.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(earning.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {earning.platform.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: earning.platform.color }}
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {earning.platform.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ${parseFloat(earning.amount.toString()).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {earning.hours ? parseFloat(earning.hours.toString()).toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hourlyRate ? `$${hourlyRate.toFixed(2)}/hr` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {earning.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(earning)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(earning.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Import Earnings from CSV</h2>

              {!importPreview ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">CSV Format Requirements</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      Your CSV file must include the following columns:
                    </p>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                      <li><strong>platform</strong> - Name of the platform (e.g., "Upwork", "Fiverr")</li>
                      <li><strong>date</strong> - Date in YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY format</li>
                      <li><strong>amount</strong> - Earning amount (numbers only, no currency symbols)</li>
                      <li><strong>hours</strong> - (Optional) Hours worked</li>
                      <li><strong>notes</strong> - (Optional) Additional notes</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      onClick={downloadCSVTemplate}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <FileDown className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      Select CSV File
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Found <strong>{importPreview.length}</strong> earnings ready to import
                    </p>
                  </div>

                  <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Platform</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {importPreview.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.platformName}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.date}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">${item.amount.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">{item.hours || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> If a platform doesn't exist, it will be automatically created.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={importing}
                >
                  Cancel
                </button>
                {importPreview && (
                  <button
                    onClick={() => setImportPreview(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    disabled={importing}
                  >
                    Choose Different File
                  </button>
                )}
                {importPreview && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : `Import ${importPreview.length} Earnings`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
