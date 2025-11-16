import { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import { logDebug, logError } from '../lib/logger';

/**
 * Sanitization middleware to prevent XSS attacks
 * - Removes HTML/script tags from all string inputs
 * - Trims whitespace from strings
 * - Applies to POST/PUT/PATCH requests
 * - Skips file uploads and binary data
 */

// Configure XSS options for stricter sanitization
const xssOptions = {
  whiteList: {}, // Empty whitelist - remove all HTML tags
  stripIgnoreTag: true, // Strip tags not in whitelist
};

/**
 * Recursively sanitize all string properties in an object
 */
export const sanitizeObjectProperties = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Remove XSS, trim whitespace
    return xss(obj, xssOptions).trim();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectProperties(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObjectProperties(obj[key]);
      }
    }
    return sanitized;
  }

  // Return primitives (numbers, booleans, etc.) as-is
  return obj;
};

/**
 * Sanitization middleware
 * Applies to POST, PUT, PATCH requests
 * Skips file uploads and multipart/form-data
 */
export const sanitizationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only sanitize POST, PUT, PATCH requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    // Skip file uploads and multipart/form-data
    if (req.is('multipart/form-data') || req.is('application/octet-stream')) {
      logDebug('Skipping sanitization for file upload', {
        path: req.path,
        contentType: req.get('content-type'),
      });
      return next();
    }

    // Sanitize request body if it exists
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObjectProperties(req.body);
      logDebug('Request body sanitized', {
        path: req.path,
        method: req.method,
      });
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObjectProperties(req.query);
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObjectProperties(req.params);
    }

    next();
  } catch (error) {
    logError('Error in sanitization middleware', error as Error, {
      path: req.path,
      method: req.method,
    });
    // Continue despite error to avoid breaking request flow
    next();
  }
};

export default sanitizationMiddleware;
