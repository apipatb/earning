import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { getErrorMessage } from '../lib/error';
import { useAuthenticateWebAuthn, isWebAuthnSupported } from '../hooks/useWebAuthn';
import { Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethods, setTwoFactorMethods] = useState<any[]>([]);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { authenticate: authenticateWebAuthn, loading: webauthnLoading } = useAuthenticateWebAuthn();

  useEffect(() => {
    setWebauthnSupported(isWebAuthnSupported());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });

      // Check if 2FA is required
      if (response.data.requiresTwoFactor) {
        setRequires2FA(true);
        setTempToken(response.data.tempToken);
        setTwoFactorMethods(response.data.methods || []);
      } else {
        setAuth(response.data.user, response.data.token);
        navigate('/');
      }
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify 2FA code using temp token
      const response = await api.post('/auth/2fa/verify',
        { code: twoFactorCode },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      if (response.data.success) {
        // Re-login to get full token
        const loginResponse = await authAPI.login({ email, password });
        setAuth(loginResponse.data.user, loginResponse.data.token);
        navigate('/');
      } else {
        setError(response.data.message || 'Invalid verification code');
      }
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');

    try {
      const result = await authenticateWebAuthn();

      if (result.success && result.user && result.token) {
        setAuth(result.user, result.token);
        navigate('/');
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      const error = getErrorMessage(err);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {requires2FA ? 'Two-Factor Authentication' : 'Sign in to EarnTrack'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {requires2FA ? (
              <span className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Enter your verification code
              </span>
            ) : (
              <>
                Or{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary-600"
                >
                  create a new account
                </Link>
              </>
            )}
          </p>
        </div>

        {requires2FA ? (
          <form className="mt-8 space-y-6" onSubmit={handleTwoFactorSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600 mb-4 text-center">
                {twoFactorMethods.find((m) => m.type === 'TOTP') && 'Enter code from your authenticator app'}
                {twoFactorMethods.find((m) => m.type === 'SMS') && ' or check your phone for an SMS code'}
                {twoFactorMethods.find((m) => m.type === 'EMAIL') && ' or check your email for a verification code'}
              </p>

              <label htmlFor="twoFactorCode" className="sr-only">
                Verification Code
              </label>
              <input
                id="twoFactorCode"
                name="twoFactorCode"
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
                minLength={6}
                maxLength={8}
                autoFocus
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFactorCode('');
                  setError('');
                }}
                className="text-sm text-primary hover:text-primary-600"
              >
                Back to login
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          {webauthnSupported && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">Or</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={webauthnLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  {webauthnLoading ? 'Authenticating...' : 'Sign in with Passkey'}
                </button>
              </div>
            </>
          )}
          </form>
        )}
      </div>
    </div>
  );
}
