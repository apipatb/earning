import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

interface RestorePoint {
  id: string;
  backupId: string;
  timestamp: string;
  description: string;
  metadata: {
    duration?: number;
    size?: number;
  } | null;
  backup: {
    id: string;
    type: string;
    status: string;
    backupSize: number;
    location: string;
  };
}

interface RestoreWizardProps {
  show: boolean;
  onClose?: () => void;
}

const RestoreWizard: React.FC<RestoreWizardProps> = ({ show, onClose }) => {
  const [step, setStep] = useState(1);
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ canRestore: boolean; issues: string[] } | null>(null);
  const [restoreOptions, setRestoreOptions] = useState({
    dryRun: false,
    verifyIntegrity: true,
    restoreDatabase: true,
    restoreFiles: false,
  });
  const [restoreResult, setRestoreResult] = useState<any>(null);

  useEffect(() => {
    if (show) {
      fetchRestorePoints();
    }
  }, [show]);

  const fetchRestorePoints = async () => {
    try {
      setLoading(true);
      const response = await api.get('/restore/points', {
        params: { limit: 50 },
      });
      setRestorePoints(response.data.restorePoints);
      setError(null);
    } catch (err) {
      setError('Failed to fetch restore points');
      console.error('Error fetching restore points:', err);
    } finally {
      setLoading(false);
    }
  };

  const testRestore = async () => {
    if (!selectedPoint) return;

    try {
      setLoading(true);
      const response = await api.get(`/restore/${selectedPoint}/test`);
      setTestResult(response.data);
    } catch (err) {
      setError('Failed to test restore');
      console.error('Error testing restore:', err);
    } finally {
      setLoading(false);
    }
  };

  const performDryRun = async () => {
    if (!selectedPoint) return;

    try {
      setRestoring(true);
      const response = await api.post(`/restore/${selectedPoint}/dry-run`);
      setRestoreResult(response.data.result);
      setStep(4);
    } catch (err) {
      setError('Dry run failed');
      console.error('Error performing dry run:', err);
    } finally {
      setRestoring(false);
    }
  };

  const performRestore = async () => {
    if (!selectedPoint) return;

    if (!restoreOptions.dryRun) {
      const confirmed = confirm(
        'WARNING: This will restore your system from the selected backup. This action cannot be undone. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    try {
      setRestoring(true);
      const response = await api.post(`/restore/${selectedPoint}`, restoreOptions);
      setRestoreResult(response.data.result);
      setStep(4);
    } catch (err) {
      setError('Restore failed');
      console.error('Error performing restore:', err);
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleString();
  };

  const formatBytes = (bytes: number): string => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!show) return null;

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Select Point</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Test</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Configure</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              4
            </div>
            <span className="ml-2 text-sm font-medium">Results</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Select Restore Point */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Select Restore Point</h3>
          <p className="text-sm text-gray-600">
            Choose a restore point to restore your system. Recent backups are shown first.
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {restorePoints.map((point) => (
                <div
                  key={point.id}
                  onClick={() => setSelectedPoint(point.id)}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPoint === point.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{point.description}</h4>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {point.backup.type}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Timestamp:</span> {formatDate(point.timestamp)}
                        </div>
                        <div>
                          <span className="font-medium">Size:</span> {formatBytes(point.backup.backupSize)}
                        </div>
                      </div>
                    </div>
                    {selectedPoint === point.id && (
                      <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                if (selectedPoint) {
                  setStep(2);
                  testRestore();
                }
              }}
              disabled={!selectedPoint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Test Restore */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Restore Capability</h3>
          <p className="text-sm text-gray-600">
            Testing the selected restore point to ensure it can be restored successfully.
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-600">Testing restore capability...</span>
            </div>
          ) : testResult ? (
            <div className="space-y-4">
              {testResult.canRestore ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">Restore Test Passed</h4>
                      <p className="text-sm text-green-700 mt-1">
                        The selected restore point can be restored successfully.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">Restore Test Failed</h4>
                      <div className="mt-2 space-y-1">
                        {testResult.issues.map((issue, idx) => (
                          <p key={idx} className="text-sm text-red-700">
                            • {issue}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!testResult?.canRestore}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configure Restore */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Configure Restore Options</h3>
          <p className="text-sm text-gray-600">
            Choose what you want to restore and how.
          </p>

          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="dryRun"
                checked={restoreOptions.dryRun}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, dryRun: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="dryRun" className="ml-3">
                <span className="text-sm font-medium text-gray-900">Dry Run</span>
                <p className="text-xs text-gray-600">Test the restore without making actual changes</p>
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="restoreDatabase"
                checked={restoreOptions.restoreDatabase}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, restoreDatabase: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="restoreDatabase" className="ml-3">
                <span className="text-sm font-medium text-gray-900">Restore Database</span>
                <p className="text-xs text-gray-600">Restore database from backup</p>
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="restoreFiles"
                checked={restoreOptions.restoreFiles}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, restoreFiles: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="restoreFiles" className="ml-3">
                <span className="text-sm font-medium text-gray-900">Restore Files</span>
                <p className="text-xs text-gray-600">Restore uploaded files and documents</p>
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="verifyIntegrity"
                checked={restoreOptions.verifyIntegrity}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, verifyIntegrity: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="verifyIntegrity" className="ml-3">
                <span className="text-sm font-medium text-gray-900">Verify Integrity</span>
                <p className="text-xs text-gray-600">Verify restore integrity after completion</p>
              </label>
            </div>
          </div>

          {!restoreOptions.dryRun && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This will restore your system and may overwrite existing data. Make sure you have a recent backup before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={restoreOptions.dryRun ? performDryRun : performRestore}
              disabled={restoring}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <PlayIcon className="w-5 h-5" />
              <span>{restoreOptions.dryRun ? 'Run Dry Run' : 'Start Restore'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && restoreResult && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Restore Results</h3>

          {restoreResult.success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">
                    {restoreResult.dryRun ? 'Dry Run Completed Successfully' : 'Restore Completed Successfully'}
                  </h4>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircleIcon className="h-6 w-6 text-red-500" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">
                    {restoreResult.dryRun ? 'Dry Run Failed' : 'Restore Failed'}
                  </h4>
                </div>
              </div>
            </div>
          )}

          {/* Restored Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Restored Items</h4>
            <div className="space-y-2">
              {restoreResult.restoredItems.database !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Database</span>
                  {restoreResult.restoredItems.database ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
              {restoreResult.restoredItems.files !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Files</span>
                  {restoreResult.restoredItems.files ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {restoreResult.errors && restoreResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errors</h4>
              <ul className="space-y-1">
                {restoreResult.errors.map((error: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {restoreResult.warnings && restoreResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {restoreResult.warnings.map((warning: string, idx: number) => (
                  <li key={idx} className="text-sm text-yellow-700">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                setStep(1);
                setRestoreResult(null);
                setSelectedPoint(null);
                if (onClose) onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestoreWizard;
