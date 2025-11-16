import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/typescript-types';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface WebAuthnError {
  message: string;
  code?: string;
}

interface RegistrationResult {
  success: boolean;
  credentialId?: string;
  error?: WebAuthnError;
}

interface AuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  token?: string;
  error?: WebAuthnError;
}

/**
 * Check if WebAuthn is supported in the current browser
 */
export const isWebAuthnSupported = (): boolean => {
  return (
    window?.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
};

/**
 * Check if platform authenticator (like Touch ID, Face ID, Windows Hello) is available
 */
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
};

/**
 * Hook for WebAuthn registration
 */
export const useRegisterWebAuthn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (
    userId: string,
    userName: string,
    userDisplayName: string,
    token: string,
    nickname?: string
  ): Promise<RegistrationResult> => {
    setLoading(true);
    setError(null);

    try {
      // Check if WebAuthn is supported
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      // Step 1: Get registration options from server
      const optionsResponse = await axios.post<{ options: PublicKeyCredentialCreationOptionsJSON }>(
        `${API_URL}/auth/webauthn/register/options`,
        {
          userId,
          userName,
          userDisplayName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const options = optionsResponse.data.options;

      // Step 2: Start registration ceremony
      let registrationResponse: RegistrationResponseJSON;
      try {
        registrationResponse = await startRegistration(options);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Registration was cancelled or timed out');
        }
        throw new Error('Failed to create credential: ' + err.message);
      }

      // Step 3: Verify registration with server
      const verifyResponse = await axios.post<{ verified: boolean; credentialId: string }>(
        `${API_URL}/auth/webauthn/register/verify`,
        {
          userId,
          response: registrationResponse,
          expectedChallenge: options.challenge,
          nickname,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!verifyResponse.data.verified) {
        throw new Error('Failed to verify credential');
      }

      setLoading(false);
      return {
        success: true,
        credentialId: verifyResponse.data.credentialId,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      setLoading(false);
      return {
        success: false,
        error: {
          message: errorMessage,
          code: err.code,
        },
      };
    }
  };

  return {
    register,
    loading,
    error,
  };
};

/**
 * Hook for WebAuthn authentication
 */
export const useAuthenticateWebAuthn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async (userId?: string): Promise<AuthenticationResult> => {
    setLoading(true);
    setError(null);

    try {
      // Check if WebAuthn is supported
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      // Step 1: Get authentication options from server
      const optionsResponse = await axios.post<{ options: PublicKeyCredentialRequestOptionsJSON }>(
        `${API_URL}/auth/webauthn/authenticate/options`,
        {
          userId,
        }
      );

      const options = optionsResponse.data.options;

      // Step 2: Start authentication ceremony
      let authenticationResponse: AuthenticationResponseJSON;
      try {
        authenticationResponse = await startAuthentication(options);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Authentication was cancelled or timed out');
        }
        throw new Error('Failed to authenticate: ' + err.message);
      }

      // Step 3: Verify authentication with server
      const verifyResponse = await axios.post<{
        verified: boolean;
        user: { id: string; email: string; name: string | null };
        token: string;
      }>(`${API_URL}/auth/webauthn/authenticate/verify`, {
        response: authenticationResponse,
        expectedChallenge: options.challenge,
      });

      if (!verifyResponse.data.verified) {
        throw new Error('Failed to verify authentication');
      }

      setLoading(false);
      return {
        success: true,
        user: verifyResponse.data.user,
        token: verifyResponse.data.token,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Authentication failed';
      setError(errorMessage);
      setLoading(false);
      return {
        success: false,
        error: {
          message: errorMessage,
          code: err.code,
        },
      };
    }
  };

  return {
    authenticate,
    loading,
    error,
  };
};

/**
 * Hook for managing WebAuthn credentials
 */
export const useWebAuthnCredentials = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCredentials = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<{
        credentials: Array<{
          id: string;
          nickname: string | null;
          transports: string[];
          createdAt: string;
          lastUsedAt: string | null;
        }>;
      }>(`${API_URL}/auth/webauthn/credentials`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLoading(false);
      return {
        success: true,
        credentials: response.data.credentials,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch credentials';
      setError(errorMessage);
      setLoading(false);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const deleteCredential = async (credentialId: string, token: string) => {
    setLoading(true);
    setError(null);

    try {
      await axios.delete(`${API_URL}/auth/webauthn/credentials/${credentialId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLoading(false);
      return {
        success: true,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete credential';
      setError(errorMessage);
      setLoading(false);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  return {
    getCredentials,
    deleteCredential,
    loading,
    error,
  };
};

/**
 * Get device/browser information for display
 */
export const getDeviceInfo = (): { browser: string; os: string } => {
  const userAgent = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect browser
  if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (userAgent.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (userAgent.indexOf('Safari') > -1) {
    browser = 'Safari';
  } else if (userAgent.indexOf('Edge') > -1) {
    browser = 'Edge';
  }

  // Detect OS
  if (userAgent.indexOf('Win') > -1) {
    os = 'Windows';
  } else if (userAgent.indexOf('Mac') > -1) {
    os = 'macOS';
  } else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (userAgent.indexOf('Android') > -1) {
    os = 'Android';
  } else if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
    os = 'iOS';
  }

  return { browser, os };
};
