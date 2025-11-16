import { useState } from 'react';
import { X, Key, Smartphone, Mail, Download, AlertTriangle, Check } from 'lucide-react';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/error';

interface Setup2FAProps {
  type: 'TOTP' | 'SMS' | 'EMAIL';
  onClose: () => void;
  onSuccess: () => void;
}

export default function Setup2FA({ type, onClose, onSuccess }: Setup2FAProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TOTP
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');

  // SMS/Email
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  // Verification
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const getIcon = () => {
    switch (type) {
      case 'TOTP':
        return <Key className="w-8 h-8 text-primary" />;
      case 'SMS':
        return <Smartphone className="w-8 h-8 text-primary" />;
      case 'EMAIL':
        return <Mail className="w-8 h-8 text-primary" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'TOTP':
        return 'Setup Authenticator App';
      case 'SMS':
        return 'Setup SMS Authentication';
      case 'EMAIL':
        return 'Setup Email Authentication';
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;

      if (type === 'TOTP') {
        response = await api.post('/auth/2fa/setup/totp', { email });
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setBackupCodes(response.data.backupCodes);
      } else if (type === 'SMS') {
        response = await api.post('/auth/2fa/setup/sms', { phoneNumber });
        setBackupCodes(response.data.backupCodes);
      } else if (type === 'EMAIL') {
        response = await api.post('/auth/2fa/setup/email', { email });
        setBackupCodes(response.data.backupCodes);
      }

      setStep(2);
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/2fa/enable', {
        type,
        code,
      });

      setStep(3);
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `earntrack-backup-codes-${type.toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
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

        {/* Step 1: Setup */}
        {step === 1 && (
          <form onSubmit={handleSetup}>
            {type === 'TOTP' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Set up two-factor authentication using an authenticator app like Google
                  Authenticator, Authy, or 1Password.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
            )}

            {type === 'SMS' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  You'll receive a verification code via SMS whenever you sign in.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (E.164 format)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="+1234567890"
                    required
                    pattern="^\+[1-9]\d{1,14}$"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>
              </div>
            )}

            {type === 'EMAIL' && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  You'll receive a verification code via email whenever you sign in.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Verify */}
        {step === 2 && (
          <form onSubmit={handleVerify}>
            <div className="space-y-4">
              {type === 'TOTP' && qrCode && (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  <div className="flex justify-center mb-4">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 mb-1">
                      Or enter this code manually:
                    </p>
                    <code className="text-sm font-mono text-gray-900">{secret}</code>
                  </div>
                </div>
              )}

              {(type === 'SMS' || type === 'EMAIL') && (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    A verification code has been sent to your {type === 'SMS' ? 'phone' : 'email'}.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-center text-2xl tracking-widest"
                  placeholder="000000"
                  required
                  minLength={6}
                  maxLength={6}
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success & Backup Codes */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Two-Factor Authentication Enabled!
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your account is now more secure.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Save Your Backup Codes
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Store these backup codes in a safe place. You can use them to access
                    your account if you lose access to your 2FA device.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Backup Codes</h4>
                <button
                  onClick={downloadBackupCodes}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary-700"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-white p-2 rounded border border-gray-200 text-center font-mono text-sm"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  downloadBackupCodes();
                  onSuccess();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
