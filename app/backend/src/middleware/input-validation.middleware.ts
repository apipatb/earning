import { Request, Response, NextFunction } from 'express';
import { logWarn, logError } from '../lib/logger';
import {
  containsSQLInjectionPattern,
  containsXSSPattern,
  containsCommandInjectionPattern,
} from '../utils/sanitize.util';

/**
 * Input validation middleware to detect and block malicious patterns
 * - Checks for SQL injection patterns
 * - Validates string length limits
 * - Checks for XSS patterns
 * - Checks for command injection patterns
 * - Logs potential attacks
 * - Blocks obvious malicious input
 */

const DEFAULT_MAX_STRING_LENGTH = 10000;
const DEFAULT_MAX_ARRAY_LENGTH = 1000;
const DEFAULT_MAX_OBJECT_DEPTH = 20;

interface AttackDetection {
  type: 'SQL_INJECTION' | 'XSS' | 'COMMAND_INJECTION' | 'LENGTH_VIOLATION' | 'DEPTH_VIOLATION';
  field: string;
  value: string;
  pattern?: string;
}

/**
 * Check if a value contains SQL injection patterns
 */
const checkSQLInjection = (value: any, fieldPath: string = ''): AttackDetection[] => {
  const detections: AttackDetection[] = [];

  if (typeof value === 'string') {
    if (containsSQLInjectionPattern(value)) {
      detections.push({
        type: 'SQL_INJECTION',
        field: fieldPath || 'root',
        value: value.substring(0, 100), // Limit logged value
      });
    }
  }

  return detections;
};

/**
 * Check if a value contains XSS patterns
 */
const checkXSSPatterns = (value: any, fieldPath: string = ''): AttackDetection[] => {
  const detections: AttackDetection[] = [];

  if (typeof value === 'string') {
    if (containsXSSPattern(value)) {
      detections.push({
        type: 'XSS',
        field: fieldPath || 'root',
        value: value.substring(0, 100),
      });
    }
  }

  return detections;
};

/**
 * Check if a value contains command injection patterns
 */
const checkCommandInjection = (value: any, fieldPath: string = ''): AttackDetection[] => {
  const detections: AttackDetection[] = [];

  if (typeof value === 'string') {
    if (containsCommandInjectionPattern(value)) {
      detections.push({
        type: 'COMMAND_INJECTION',
        field: fieldPath || 'root',
        value: value.substring(0, 100),
      });
    }
  }

  return detections;
};

/**
 * Check string length limits
 */
const checkStringLength = (
  value: any,
  fieldPath: string = '',
  maxLength: number = DEFAULT_MAX_STRING_LENGTH
): AttackDetection[] => {
  const detections: AttackDetection[] = [];

  if (typeof value === 'string' && value.length > maxLength) {
    detections.push({
      type: 'LENGTH_VIOLATION',
      field: fieldPath || 'root',
      value: `String exceeds max length of ${maxLength} (actual: ${value.length})`,
    });
  }

  return detections;
};

/**
 * Check array length limits
 */
const checkArrayLength = (
  value: any,
  fieldPath: string = '',
  maxLength: number = DEFAULT_MAX_ARRAY_LENGTH
): AttackDetection[] => {
  const detections: AttackDetection[] = [];

  if (Array.isArray(value) && value.length > maxLength) {
    detections.push({
      type: 'LENGTH_VIOLATION',
      field: fieldPath || 'root',
      value: `Array exceeds max length of ${maxLength} (actual: ${value.length})`,
    });
  }

  return detections;
};

/**
 * Check object depth limits (prevents deeply nested attacks)
 */
const checkObjectDepth = (
  obj: any,
  fieldPath: string = '',
  currentDepth: number = 0,
  maxDepth: number = DEFAULT_MAX_OBJECT_DEPTH
): AttackDetection[] => {
  const detections: AttackDetection[] = [];

  if (currentDepth > maxDepth) {
    detections.push({
      type: 'DEPTH_VIOLATION',
      field: fieldPath || 'root',
      value: `Object nesting exceeds max depth of ${maxDepth}`,
    });
    return detections;
  }

  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const itemPath = `${fieldPath}[${i}]`;
        detections.push(
          ...checkObjectDepth(obj[i], itemPath, currentDepth + 1, maxDepth)
        );
      }
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const itemPath = fieldPath ? `${fieldPath}.${key}` : key;
          detections.push(
            ...checkObjectDepth(obj[key], itemPath, currentDepth + 1, maxDepth)
          );
        }
      }
    }
  }

  return detections;
};

/**
 * Recursively validate all input values
 */
const validateInput = (
  obj: any,
  fieldPath: string = '',
  maxStringLength: number = DEFAULT_MAX_STRING_LENGTH
): AttackDetection[] => {
  const detections: AttackDetection[] = [];

  if (obj === null || obj === undefined) {
    return detections;
  }

  if (typeof obj === 'string') {
    // Check string length
    detections.push(...checkStringLength(obj, fieldPath, maxStringLength));
    // Check for injection patterns
    detections.push(...checkSQLInjection(obj, fieldPath));
    detections.push(...checkXSSPatterns(obj, fieldPath));
    detections.push(...checkCommandInjection(obj, fieldPath));
  } else if (Array.isArray(obj)) {
    // Check array length
    detections.push(...checkArrayLength(obj, fieldPath));
    // Recursively check array items
    for (let i = 0; i < obj.length; i++) {
      const itemPath = `${fieldPath}[${i}]`;
      detections.push(...validateInput(obj[i], itemPath, maxStringLength));
    }
  } else if (typeof obj === 'object') {
    // Recursively check object properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const itemPath = fieldPath ? `${fieldPath}.${key}` : key;
        detections.push(...validateInput(obj[key], itemPath, maxStringLength));
      }
    }
  }

  return detections;
};

/**
 * Input validation middleware
 * Detects and blocks malicious input patterns
 */
export const inputValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip GET requests
    if (req.method === 'GET') {
      return next();
    }

    const detections: AttackDetection[] = [];

    // Check request body
    if (req.body && typeof req.body === 'object') {
      detections.push(...validateInput(req.body, 'body'));
      detections.push(...checkObjectDepth(req.body, 'body'));
    }

    // Check query parameters
    if (req.query && typeof req.query === 'object') {
      detections.push(...validateInput(req.query, 'query'));
    }

    // Check route parameters
    if (req.params && typeof req.params === 'object') {
      detections.push(...validateInput(req.params, 'params'));
    }

    // If any attacks detected, log and block request
    if (detections.length > 0) {
      const requestId = (req as any).requestId || 'unknown';

      logWarn('Potential attack detected in request', {
        requestId,
        path: req.path,
        method: req.method,
        ip: req.ip,
        detections: detections.map((d) => ({
          type: d.type,
          field: d.field,
        })),
        userAgent: req.get('user-agent'),
      });

      // Block the request
      return res.status(400).json({
        error: 'Invalid Input',
        message: 'Request contains potentially malicious content',
        detections: detections.map((d) => ({
          type: d.type,
          field: d.field,
        })),
      });
    }

    next();
  } catch (error) {
    logError('Error in input validation middleware', error as Error, {
      path: req.path,
      method: req.method,
    });
    // Continue despite error to avoid breaking request flow
    next();
  }
};

export default inputValidationMiddleware;
