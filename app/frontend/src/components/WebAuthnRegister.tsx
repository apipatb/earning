import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useRegisterWebAuthn, getDeviceInfo } from '../hooks/useWebAuthn';

interface WebAuthnRegisterProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function WebAuthnRegister({ onSuccess, onCancel }: WebAuthnRegisterProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'registering' | 'success'>('input');

  const { user, token } = useAuthStore();
  const { register, loading } = useRegisterWebAuthn();
  const deviceInfo = getDeviceInfo();

  const handleRegister = async () => {
    if (!user || !token) {
      setError('User not authenticated');
      return;
    }

    setError(null);
    setStep('registering');

    const credentialNickname = nickname.trim() || `${deviceInfo.browser} on ${deviceInfo.os}`;

    const result = await register(
      user.id,
      user.email,
      user.name || user.email,
      token,
      credentialNickname
    );

    if (result.success) {
      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } else if (result.error) {
      setError(result.error.message);
      setStep('input');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {step === 'input' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Passkey</h3>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                You'll be prompted to verify your identity using your device's biometric authentication
                (Face ID, Touch ID, Windows Hello) or a security key.
              </p>

              <div className="mb-4">
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                  Nickname (optional)
                </label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={`${deviceInfo.browser} on ${deviceInfo.os}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Give this passkey a name to help you identify it later
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Current Device:</p>
                    <p>{deviceInfo.browser} on {deviceInfo.os}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {step === 'registering' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Setting up passkey...</h3>
            <p className="text-sm text-gray-600">
              Please follow the prompts on your device to complete the setup.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Passkey Added!</h3>
            <p className="text-sm text-gray-600">
              You can now use this passkey to sign in to your account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
