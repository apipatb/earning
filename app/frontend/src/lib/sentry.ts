import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * This should be called as early as possible in the application lifecycle,
 * before any other imports or initialization code.
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
  const traceSampleRate = parseFloat(import.meta.env.VITE_SENTRY_TRACE_SAMPLE_RATE || '0.1');

  // Only initialize Sentry if DSN is provided
  if (!dsn) {
    console.warn('Sentry DSN not provided. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Set trace sample rate for performance monitoring
    // 1.0 = 100% of transactions, 0.1 = 10% of transactions
    tracesSampleRate: traceSampleRate,

    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      new BrowserTracing({
        // Track user interactions
        tracingOrigins: [
          'localhost',
          /^\//,  // Track all relative URLs
          // Add your production domain here
          /^https:\/\/.*\.earntrack\.app/,
        ],

        // Track fetch and XHR requests
        traceFetch: true,
        traceXHR: true,
      }),
    ],

    // Capture console errors
    beforeSend(event, hint) {
      // Filter out development errors if needed
      if (environment === 'development') {
        console.error('Sentry event:', event, hint);
      }

      // Don't send events in test environment
      if (environment === 'test') {
        return null;
      }

      return event;
    },

    // Automatically capture unhandled promise rejections
    autoSessionTracking: true,

    // Capture breadcrumbs for better context
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs if needed
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }
      return breadcrumb;
    },

    // Enable debug mode in development
    debug: environment === 'development',

    // Set release version if available
    release: import.meta.env.VITE_APP_VERSION,
  });
};

/**
 * Set user context for Sentry error tracking
 * Call this after user authentication
 */
export const setSentryUser = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

/**
 * Clear user context from Sentry
 * Call this on logout
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Manually capture an exception
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('additional_info', context);
  }
  Sentry.captureException(error);
};

/**
 * Manually capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'user-action',
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Start a new transaction for performance monitoring
 */
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({ name, op });
};

export default Sentry;
