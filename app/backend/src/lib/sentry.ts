import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express, Request, Response, NextFunction } from 'express';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * This should be called before any other middleware or route handlers
 */
export const initSentry = (app: Express) => {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const traceSampleRate = parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '0.1');

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
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),

      // Express integration for automatic request tracking
      new Tracing.Integrations.Express({ app }),

      // Prisma integration (if needed)
      new Tracing.Integrations.Prisma(),
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

    // Enable debug mode in development
    debug: environment === 'development',

    // Set release version if available
    release: process.env.APP_VERSION,
  });

  console.info(`Sentry initialized for ${environment} environment`);
};

/**
 * Sentry request handler middleware
 * Must be the first middleware on the app
 */
export const sentryRequestHandler = () => {
  return Sentry.Handlers.requestHandler({
    // Include user information in error reports
    user: ['id', 'email', 'username'],

    // Include request body in error reports (be careful with sensitive data)
    request: true,

    // Include IP address
    ip: true,
  });
};

/**
 * Sentry tracing handler middleware
 * Must be after all controllers but before error handlers
 */
export const sentryTracingHandler = () => {
  return Sentry.Handlers.tracingHandler();
};

/**
 * Sentry error handler middleware
 * Must be after all other middleware and routes
 */
export const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      return true;
    },
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
export const captureMessage = (message: string, level: Sentry.Severity = Sentry.Severity.Info) => {
  Sentry.captureMessage(message, level);
};

/**
 * Add breadcrumb for tracking server actions
 */
export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'server-action',
    level: Sentry.Severity.Info,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Middleware to set user context from JWT token
 */
export const sentryUserContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated (assuming user is attached to req by auth middleware)
  if ((req as any).user) {
    const user = (req as any).user;
    setSentryUser({
      id: user.id,
      email: user.email,
      username: user.username || user.name,
    });
  }
  next();
};

export default Sentry;
