import axios, { AxiosError } from 'axios';

/**
 * Type-safe error extraction from API responses
 */
export interface ApiError {
  message: string;
  error?: string;
  status: number;
}

/**
 * Safely extract error information from any thrown value
 * @param error - The error value
 * @returns Standardized error object
 */
export const getErrorMessage = (error: unknown): ApiError => {
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    return {
      message: axiosError.response?.data?.message || axiosError.message || 'An error occurred',
      error: axiosError.response?.data?.error,
      status: axiosError.response?.status || 500,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
    };
  }

  // Handle unknown types
  const message = String(error) || 'An unknown error occurred';
  return {
    message,
    status: 500,
  };
};

/**
 * Check if error is a specific API error
 * @param error - The error to check
 * @param errorText - The error message to match
 * @returns True if error message matches
 */
export const isApiError = (error: unknown, errorText: string): boolean => {
  const apiError = getErrorMessage(error);
  return apiError.message.toLowerCase().includes(errorText.toLowerCase());
};
