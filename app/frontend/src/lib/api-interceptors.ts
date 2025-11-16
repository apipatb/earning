import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { useNotificationStore } from '../store/notification.store';

/**
 * API Response interface matching backend format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Paginated API Response
 */
export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Request logging configuration
 */
interface RequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

/**
 * Setup API interceptors for request/response handling
 */
export function setupApiInterceptors(apiInstance: AxiosInstance): void {
  /**
   * Request Interceptor
   * - Add authentication token
   * - Add request ID for tracing
   * - Log requests
   */
  apiInstance.interceptors.request.use(
    (config: RequestConfig) => {
      // Add start time for timing
      config.metadata = {
        startTime: Date.now(),
      };

      // Get auth token from store
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Generate and add request ID for tracing
      const requestId = generateRequestId();
      config.headers['X-Request-ID'] = requestId;

      // Log request
      logRequest(config, requestId);

      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  /**
   * Response Interceptor
   * - Handle response transformation
   * - Log responses
   * - Handle specific HTTP errors
   * - Manage authentication errors
   */
  apiInstance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<any>>) => {
      const config = response.config as RequestConfig;
      const duration = config.metadata?.startTime
        ? Date.now() - config.metadata.startTime
        : 0;
      const requestId = (response.config.headers['X-Request-ID'] as string) || 'unknown';

      logResponse(response, duration, requestId);

      // Transform response to extract data
      if (response.data.success) {
        // Return the actual data, not the wrapper
        return response.data.data;
      }

      // If response indicates failure, reject
      return Promise.reject(response.data);
    },
    (error: AxiosError<ApiResponse<any>>) => {
      const requestId = error.config?.headers['X-Request-ID'] as string || 'unknown';
      const config = error.config as RequestConfig;
      const duration = config?.metadata?.startTime
        ? Date.now() - config.metadata.startTime
        : 0;

      logError(error, duration, requestId);

      // Handle specific error statuses
      if (error.response?.status === 401) {
        handleUnauthorized();
      } else if (error.response?.status === 403) {
        handleForbidden(error);
      } else if (error.response?.status === 429) {
        handleRateLimit(error);
      } else if (error.response?.status === 400) {
        handleValidationError(error);
      } else if (error.response?.status === 500) {
        handleServerError(error);
      }

      return Promise.reject(error.response?.data || error);
    }
  );
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Log outgoing request
 */
function logRequest(config: RequestConfig, requestId: string): void {
  const { method, url } = config;
  console.debug('[API Request]', {
    requestId,
    method,
    url,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log successful response
 */
function logResponse(
  response: AxiosResponse<ApiResponse<any>>,
  duration: number,
  requestId: string
): void {
  const { status, config } = response;
  console.debug('[API Response]', {
    requestId,
    method: config.method,
    url: config.url,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log error response
 */
function logError(
  error: AxiosError<ApiResponse<any>>,
  duration: number,
  requestId: string
): void {
  const { status, config } = error.response || { status: 'unknown', config: error.config };
  console.error('[API Error]', {
    requestId,
    method: config?.method,
    url: config?.url,
    status,
    duration: `${duration}ms`,
    errorCode: error.response?.data?.error?.code,
    errorMessage: error.response?.data?.error?.message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle 401 Unauthorized errors
 */
function handleUnauthorized(): void {
  const authStore = useAuthStore.getState();

  // Clear auth state
  authStore.logout();

  // Show notification
  const notificationStore = useNotificationStore.getState();
  notificationStore.addNotification({
    type: 'error',
    message: 'Your session has expired. Please log in again.',
    duration: 5000,
  });

  // Redirect to login
  window.location.href = '/login';
}

/**
 * Handle 403 Forbidden errors
 */
function handleForbidden(error: AxiosError<ApiResponse<any>>): void {
  const notificationStore = useNotificationStore.getState();
  const message = error.response?.data?.error?.message || 'You do not have permission to access this resource.';

  notificationStore.addNotification({
    type: 'error',
    message,
    duration: 5000,
  });
}

/**
 * Handle 429 Rate Limit errors
 */
function handleRateLimit(error: AxiosError<ApiResponse<any>>): void {
  const notificationStore = useNotificationStore.getState();
  const retryAfter = error.response?.headers['retry-after'];
  const message = `Too many requests. ${retryAfter ? `Try again in ${retryAfter}s.` : 'Please try again later.'}`;

  notificationStore.addNotification({
    type: 'warning',
    message,
    duration: 7000,
  });
}

/**
 * Handle 400 Validation errors
 */
function handleValidationError(error: AxiosError<ApiResponse<any>>): void {
  const notificationStore = useNotificationStore.getState();
  const message = error.response?.data?.error?.message || 'Invalid request. Please check your input.';

  notificationStore.addNotification({
    type: 'error',
    message,
    duration: 5000,
  });
}

/**
 * Handle 500 Server errors
 */
function handleServerError(error: AxiosError<ApiResponse<any>>): void {
  const notificationStore = useNotificationStore.getState();
  const message = 'Server error. Please try again later.';

  notificationStore.addNotification({
    type: 'error',
    message,
    duration: 5000,
  });
}

/**
 * Check if response is a paginated response
 */
export function isPaginatedResponse<T>(
  response: any
): response is PaginatedApiResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'pagination' in response &&
    typeof response.pagination === 'object'
  );
}

/**
 * Extract paginated data from response
 */
export function extractPaginationData(response: any): PaginatedApiResponse<any> | null {
  if (isPaginatedResponse(response)) {
    return response;
  }
  return null;
}

export default setupApiInterceptors;
