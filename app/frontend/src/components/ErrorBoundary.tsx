import React, { ReactNode, ErrorInfo } from 'react';
import { notify } from '../store/notification.store';
import { logger } from '../lib/logger';
import { captureException } from '../lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React component errors and prevents app crashes
 * Implements error logging, Sentry reporting, and user-friendly error UI
 *
 * Features:
 * - Catches JavaScript errors in child components
 * - Displays user-friendly error UI
 * - Logs errors to console and Sentry
 * - Shows error details and stack trace in development mode only
 * - Provides "Try Again" button to recover from error state
 * - Includes contact support link
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Store error info for display
    this.setState({ errorInfo });

    // Log error details to console and monitoring service
    logger.error('React Error Boundary caught error:', error, {
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Send error to Sentry for tracking and monitoring
    try {
      captureException(error, {
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    } catch (sentryError) {
      console.error('Failed to report error to Sentry:', sentryError);
    }

    // Notify user (only in production to avoid duplicate dev notifications)
    if (!import.meta.env.DEV) {
      notify.error(
        'Something went wrong',
        'We encountered an unexpected error. Our team has been notified.',
        'error'
      );
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleContactSupport = () => {
    // Open support email or redirect to support page
    const subject = encodeURIComponent('Error Report - EarnTrack Application');
    const body = encodeURIComponent(
      `I encountered an error in the application.\n\n` +
      `Error: ${this.state.error?.message || 'Unknown error'}\n` +
      `Time: ${new Date().toISOString()}\n\n` +
      `Please provide additional details about what you were doing when the error occurred:`
    );
    window.location.href = `mailto:support@earntrack.app?subject=${subject}&body=${body}`;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const { error, errorInfo } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header with warning icon */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 rounded-full p-4">
                  <svg
                    className="w-16 h-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-center mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-center text-white/90 text-lg">
                Don't worry, we're on it
              </p>
            </div>

            {/* Error message */}
            <div className="p-8">
              <div className="text-center mb-8">
                <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                  The application encountered an unexpected error.
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Our team has been automatically notified and will investigate the issue.
                </p>
              </div>

              {/* Error details (development only) */}
              {isDev && error && (
                <div className="mb-6 space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2 uppercase tracking-wide">
                      Error Details (Development Mode Only)
                    </h3>
                    <div className="space-y-3">
                      {/* Error name and message */}
                      <div>
                        <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">
                          Error Type:
                        </p>
                        <p className="text-sm font-mono text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                          {error.name}: {error.message}
                        </p>
                      </div>

                      {/* Stack trace */}
                      {error.stack && (
                        <div>
                          <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">
                            Stack Trace:
                          </p>
                          <pre className="text-xs font-mono text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/40 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto border border-red-200 dark:border-red-800">
                            {error.stack}
                          </pre>
                        </div>
                      )}

                      {/* Component stack */}
                      {errorInfo?.componentStack && (
                        <div>
                          <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">
                            Component Stack:
                          </p>
                          <pre className="text-xs font-mono text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/40 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto border border-red-200 dark:border-red-800">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={this.resetError}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again
                  </span>
                </button>

                <button
                  onClick={this.handleContactSupport}
                  className="px-8 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Contact Support
                  </span>
                </button>
              </div>

              {/* Additional help text */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  If the problem persists, please contact our support team with details about what you were doing when this error occurred.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return Wrapped;
}
