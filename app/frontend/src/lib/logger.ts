/**
 * Frontend logging utility
 * Matches backend logger interface for consistency
 */

import * as Sentry from '@sentry/react';
import { captureException, captureMessage } from './sentry';

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDev = import.meta.env.DEV;

  private formatLog(level: LogLevel, message: string, context?: any, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    };
  }

  private output(entry: LogEntry) {
    const { timestamp, level, message, context, error } = entry;

    // In development, use colored console output
    if (this.isDev) {
      const styles = {
        debug: 'color: #999',
        info: 'color: #0066cc',
        warn: 'color: #ff9900',
        error: 'color: #cc0000',
      };

      console.log(`%c[${timestamp}] [${level.toUpperCase()}] ${message}`, styles[level]);

      if (context) {
        console.log('Context:', context);
      }
      if (error) {
        console.error('Error:', error);
      }
    } else {
      // In production, send to monitoring service (if configured)
      // Example: Sentry, DataDog, CloudWatch, etc.
      this.sendToMonitoring(entry);
    }
  }

  private sendToMonitoring(entry: LogEntry) {
    // Only send to monitoring if Sentry is configured (DSN present)
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    const monitoringEnabled = import.meta.env.VITE_ENABLE_MONITORING === 'true';

    if (!sentryDsn || !monitoringEnabled) {
      // Fall back to console logging if monitoring is not configured
      console.log(`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`);
      if (entry.context) console.log('Context:', entry.context);
      if (entry.error) console.error('Error:', entry.error);
      return;
    }

    try {
      // Map log levels to Sentry severity levels
      const sentryLevel = this.mapToSentryLevel(entry.level);

      // Set context if available
      if (entry.context) {
        Sentry.setContext('log_context', entry.context);
      }

      // Handle errors differently from regular messages
      if (entry.error) {
        // For errors, capture the full exception with context
        Sentry.withScope((scope) => {
          scope.setLevel(sentryLevel);
          scope.setContext('error_details', {
            message: entry.message,
            timestamp: entry.timestamp,
            ...entry.context,
          });

          // Reconstruct error object if needed
          const error = entry.error instanceof Error
            ? entry.error
            : new Error(entry.error?.message || entry.message);

          captureException(error, entry.context);
        });
      } else {
        // For non-error messages, capture as message
        Sentry.withScope((scope) => {
          scope.setLevel(sentryLevel);
          if (entry.context) {
            scope.setContext('message_context', entry.context);
          }
          captureMessage(entry.message, sentryLevel);
        });
      }

      // Add breadcrumb for tracking the log event
      Sentry.addBreadcrumb({
        category: 'log',
        message: entry.message,
        level: sentryLevel,
        data: entry.context,
        timestamp: new Date(entry.timestamp).getTime() / 1000,
      });
    } catch (error) {
      // If monitoring fails, fall back to console logging
      console.error('Failed to send log to monitoring service:', error);
      console.log(`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`);
      if (entry.context) console.log('Context:', entry.context);
      if (entry.error) console.error('Error:', entry.error);
    }
  }

  /**
   * Map internal log levels to Sentry severity levels
   */
  private mapToSentryLevel(level: LogLevel): Sentry.SeverityLevel {
    const levelMap: Record<LogLevel, Sentry.SeverityLevel> = {
      debug: 'debug',
      info: 'info',
      warn: 'warning',
      error: 'error',
    };
    return levelMap[level];
  }

  debug(message: string, context?: Record<string, any>) {
    this.output(this.formatLog(LOG_LEVELS.DEBUG, message, context));
  }

  info(message: string, context?: Record<string, any>) {
    this.output(this.formatLog(LOG_LEVELS.INFO, message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    this.output(this.formatLog(LOG_LEVELS.WARN, message, context));
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.output(this.formatLog(LOG_LEVELS.ERROR, message, context, error));
  }
}

export const logger = new Logger();
