/**
 * Simple structured logger for the application
 * Provides consistent logging across the application
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private format(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      } : undefined,
    };
  }

  private output(entry: LogEntry): void {
    const logStr = JSON.stringify(entry);

    switch (entry.level) {
      case 'error':
        console.error(logStr);
        break;
      case 'warn':
        console.warn(logStr);
        break;
      case 'info':
        console.log(logStr);
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.log(logStr);
        }
        break;
    }
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry = this.format('error', message, context, error);
    this.output(entry);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('warn', message, context);
    this.output(entry);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('info', message, context);
    this.output(entry);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('debug', message, context);
    this.output(entry);
  }
}

export const logger = new Logger();
