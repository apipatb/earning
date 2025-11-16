import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useWebAuthnCredentials, isWebAuthnSupported, getDeviceInfo } from '../hooks/useWebAuthn';
import WebAuthnRegister from '../components/WebAuthnRegister';

interface Credential {
  id: string;
  nickname: string | null;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export default function Security() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showRegister, setShowRegister] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { user, token } = useAuthStore();
  const { getCredentials, deleteCredential, loading } = useWebAuthnCredentials();
  const deviceInfo = getDeviceInfo();

  useEffect(() => {
    setWebauthnSupported(isWebAuthnSupported());
    if (token) {
      loadCredentials();
    }
  }, [token]);

  const loadCredentials = async () => {
    if (!token) return;

    const result = await getCredentials(token);
    if (result.success && result.credentials) {
      setCredentials(result.credentials);
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleDelete = async (credentialId: string) => {
    if (!token) return;

    if (!confirm('Are you sure you want to delete this passkey? You will no longer be able to use it to sign in.')) {
      return;
    }

    setError(null);
    const result = await deleteCredential(credentialId, token);

    if (result.success) {
      setSuccessMessage('Passkey deleted successfully');
      await loadCredentials();
      setTimeout(() => setSuccessMessage(null), 3000);
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleRegistrationSuccess = () => {
    setShowRegister(false);
    setSuccessMessage('Passkey registered successfully');
    loadCredentials();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransportIcon = (transports: string[]) => {
    if (transports.includes('internal')) {
      return '🔐'; // Platform authenticator (Touch ID, Face ID, Windows Hello)
    } else if (transports.includes('usb')) {
      return '🔑'; // Security key
    } else if (transports.includes('nfc')) {
      return '📱'; // NFC device
    } else if (transports.includes('ble')) {
      return '🔵'; // Bluetooth device
    }
    return '🔒'; // Generic
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please log in to manage your security settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="mt-2 text-gray-600">Manage your passkeys and security credentials</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {!webauthnSupported && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">WebAuthn Not Supported</h3>
          <p className="text-yellow-800">
            Your browser does not support WebAuthn/FIDO2 passkeys. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Passkeys</h2>
            <p className="text-sm text-gray-600 mt-1">
              Passkeys provide secure, passwordless authentication using your device's biometrics or security key.
            </p>
          </div>
          {webauthnSupported && (
            <button
              onClick={() => setShowRegister(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Add Passkey
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600">Loading credentials...</p>
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No passkeys</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first passkey.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getTransportIcon(credential.transports)}</div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {credential.nickname || 'Unnamed Passkey'}
                      </h4>
                      <div className="mt-1 text-sm text-gray-500 space-y-1">
                        <p>Created: {formatDate(credential.createdAt)}</p>
                        <p>Last used: {formatDate(credential.lastUsedAt)}</p>
                        <p className="text-xs">
                          Type: {credential.transports.includes('internal')
                            ? 'Platform Authenticator'
                            : 'Security Key'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(credential.id)}
                    className="text-red-600 hover:text-red-700 focus:outline-none"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {webauthnSupported && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Device</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Browser:</strong> {deviceInfo.browser}</p>
            <p><strong>Operating System:</strong> {deviceInfo.os}</p>
          </div>
        </div>
      )}

      {showRegister && (
        <WebAuthnRegister
          onSuccess={handleRegistrationSuccess}
          onCancel={() => setShowRegister(false)}
        />
      )}
    </div>
  );
}
