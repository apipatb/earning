import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_DIR = path.join(process.cwd(), 'logs');

// Define custom log levels
const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

// Define custom log colors
const logColors = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'cyan',
};

winston.addColors(logColors);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({ level, message, timestamp, error, userId, requestId, ...meta }) => {
      let msg = `${timestamp} [${level}]`;

      if (requestId) {
        msg += ` [REQ-ID: ${requestId}]`;
      }

      if (userId) {
        msg += ` [USER-ID: ${userId}]`;
      }

      msg += `: ${message}`;

      if (error) {
        msg += `\n${error}`;
      }

      if (Object.keys(meta).length > 0) {
        msg += `\n${JSON.stringify(meta, null, 2)}`;
      }

      return msg;
    }
  )
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Error file transport
const errorFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: NODE_ENV === 'production' ? jsonFormat : consoleFormat,
});

// Combined file transport
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: NODE_ENV === 'production' ? jsonFormat : consoleFormat,
});

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: {
    service: 'earntrack-backend',
    environment: NODE_ENV,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: NODE_ENV === 'production' ? jsonFormat : consoleFormat,
    }),
    // Error file transport
    errorFileTransport,
    // Combined file transport
    combinedFileTransport,
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'rejections.log'),
    }),
  ],
});

// Export convenience methods
export const logError = (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
  const errorData = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
  logger.error(message, { ...meta, ...errorData });
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

export const logFatal = (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
  const errorData = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
  logger.log('fatal', message, { ...meta, ...errorData });
};

export default logger;
