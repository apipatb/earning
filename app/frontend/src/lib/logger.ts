/**
 * Frontend logging utility
 * Matches backend logger interface for consistency
 */

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
    // TODO: Implement monitoring service integration
    // Example: Sentry.captureMessage(entry.message, entry.level);
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
