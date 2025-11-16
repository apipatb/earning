import { useState, useEffect } from 'react';
import { Shield, Smartphone, Mail, Key, Download, AlertTriangle, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/error';
import Setup2FA from '../components/Setup2FA';

interface TwoFactorMethod {
  type: 'TOTP' | 'SMS' | 'EMAIL';
  isEnabled: boolean;
  verifiedAt: string | null;
  phoneNumber?: string;
  createdAt: string;
}

interface TwoFactorLog {
  id: string;
  method: 'TOTP' | 'SMS' | 'EMAIL';
  status: 'SUCCESS' | 'FAILED';
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function TwoFactor() {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<TwoFactorMethod[]>([]);
  const [logs, setLogs] = useState<TwoFactorLog[]>([]);
  const [setupType, setSetupType] = useState<'TOTP' | 'SMS' | 'EMAIL' | null>(null);
  const [disableType, setDisableType] = useState<'TOTP' | 'SMS' | 'EMAIL' | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadStatus();
    loadLogs();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.get('/auth/2fa/status');
      setMethods(response.data.methods || []);
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await api.get('/auth/2fa/logs?limit=10');
      setLogs(response.data.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableType) return;

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/2fa/disable', {
        type: disableType,
        code: disableCode,
      });

      setSuccess(`${disableType} 2FA disabled successfully`);
      setDisableType(null);
      setDisableCode('');
      await loadStatus();
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async (type: 'TOTP' | 'SMS' | 'EMAIL') => {
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/2fa/backup-codes', { type });
      const codes = response.data.backupCodes;

      // Download backup codes as text file
      const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `earntrack-backup-codes-${type.toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Backup codes regenerated and downloaded');
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'TOTP':
        return <Key className="w-5 h-5" />;
      case 'SMS':
        return <Smartphone className="w-5 h-5" />;
      case 'EMAIL':
        return <Mail className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const getMethodName = (type: string) => {
    switch (type) {
      case 'TOTP':
        return 'Authenticator App';
      case 'SMS':
        return 'SMS';
      case 'EMAIL':
        return 'Email';
      default:
        return type;
    }
  };

  if (loading && methods.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Two-Factor Authentication
        </h1>
        <p className="mt-2 text-gray-600">
          Add an extra layer of security to your account
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <Check className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      {setupType && (
        <Setup2FA
          type={setupType}
          onClose={() => setSetupType(null)}
          onSuccess={() => {
            setSetupType(null);
            loadStatus();
          }}
        />
      )}

      {/* Disable Modal */}
      {disableType && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Disable {getMethodName(disableType)} 2FA
            </h3>
            <form onSubmit={handleDisable}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter verification code to confirm
                </label>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="6-digit code"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDisableType(null);
                    setDisableCode('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Methods */}
      <div className="bg-white shadow rounded-lg divide-y divide-gray-200 mb-8">
        <div className="px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">Authentication Methods</h2>
        </div>

        {/* Authenticator App */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Key className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Authenticator App (TOTP)</h3>
                <p className="text-sm text-gray-500">Use an authenticator app like Google Authenticator</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {methods.find((m) => m.type === 'TOTP')?.isEnabled ? (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Enabled
                  </span>
                  <button
                    onClick={() => handleRegenerateBackupCodes('TOTP')}
                    className="text-sm text-primary hover:text-primary-700"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDisableType('TOTP')}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Disable
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSetupType('TOTP')}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700"
                >
                  Setup
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SMS */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Smartphone className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">SMS Authentication</h3>
                <p className="text-sm text-gray-500">
                  Receive codes via text message
                  {methods.find((m) => m.type === 'SMS')?.phoneNumber &&
                    ` (${methods.find((m) => m.type === 'SMS')?.phoneNumber})`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {methods.find((m) => m.type === 'SMS')?.isEnabled ? (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Enabled
                  </span>
                  <button
                    onClick={() => handleRegenerateBackupCodes('SMS')}
                    className="text-sm text-primary hover:text-primary-700"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDisableType('SMS')}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Disable
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSetupType('SMS')}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700"
                >
                  Setup
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Mail className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Email Authentication</h3>
                <p className="text-sm text-gray-500">Receive codes via email</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {methods.find((m) => m.type === 'EMAIL')?.isEnabled ? (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Enabled
                  </span>
                  <button
                    onClick={() => handleRegenerateBackupCodes('EMAIL')}
                    className="text-sm text-primary hover:text-primary-700"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDisableType('EMAIL')}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Disable
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSetupType('EMAIL')}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700"
                >
                  Setup
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Authentication Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No authentication activity yet
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getMethodIcon(log.method)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getMethodName(log.method)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()} - {log.ipAddress}
                      </p>
                    </div>
                  </div>
                  <div>
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="w-3 h-3 mr-1" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <X className="w-3 h-3 mr-1" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
