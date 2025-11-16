import xss from 'xss';

/**
 * Utility functions for sanitizing different types of inputs
 * - sanitizeString: Basic XSS and whitespace removal
 * - sanitizeEmail: Email validation and normalization
 * - sanitizeUrl: URL validation
 * - sanitizeObject: Recursive object sanitization
 */

// XSS configuration
const xssOptions = {
  whiteList: {}, // Empty whitelist - removes all HTML tags
  stripIgnoreTag: true, // Strip tags that are not in whitelist
};

/**
 * Sanitize a single string value
 * Removes XSS attempts and trims whitespace
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (str: string | null | undefined): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  // Remove XSS attempts
  let sanitized = xss(str, xssOptions);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  return sanitized;
};

/**
 * Sanitize an email address
 * Validates format and normalizes
 * @param email - Email to sanitize
 * @returns Normalized email or empty string if invalid
 */
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Basic sanitization
  let sanitized = sanitizeString(email);

  // More strict email validation pattern
  // Allows: alphanumeric, dot, hyphen, underscore in local part
  // Domain: alphanumeric, dot, hyphen
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  // Normalize to lowercase
  sanitized = sanitized.toLowerCase();

  // Limit length (RFC 5321)
  if (sanitized.length > 254) {
    return '';
  }

  return sanitized;
};

/**
 * Sanitize a URL
 * Validates format and prevents dangerous protocols
 * @param url - URL to sanitize
 * @returns Valid URL or empty string if invalid
 */
export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Basic sanitization
  let sanitized = sanitizeString(url);

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = sanitized.toLowerCase();

  if (dangerousProtocols.some((protocol) => lowerUrl.startsWith(protocol))) {
    return '';
  }

  // Validate URL format
  try {
    // Allow relative URLs or valid absolute URLs
    if (sanitized.startsWith('/') || sanitized.startsWith('http')) {
      if (sanitized.startsWith('http')) {
        new URL(sanitized); // Will throw if invalid
      }
      return sanitized;
    }

    // For relative URLs, basic validation
    if (/^[a-zA-Z0-9._\-/?#&=+%]*$/.test(sanitized)) {
      return sanitized;
    }

    return '';
  } catch {
    return '';
  }
};

/**
 * Sanitize a phone number
 * Removes non-numeric characters except +, -, (), spaces
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export const sanitizePhone = (phone: string | null | undefined): string => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove XSS first
  let sanitized = sanitizeString(phone);

  // Keep only valid phone characters
  sanitized = sanitized.replace(/[^\d+\-().\s]/g, '');

  // Limit length
  if (sanitized.length > 20) {
    return '';
  }

  return sanitized;
};

/**
 * Sanitize an object recursively
 * Applies appropriate sanitization based on data types
 * @param obj - Object to sanitize
 * @param schema - Optional schema defining field types
 * @returns Sanitized object
 */
export const sanitizeObject = (
  obj: any,
  schema?: Record<string, 'string' | 'email' | 'url' | 'phone' | 'number' | 'boolean' | 'any'>
): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, schema));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const fieldType = schema?.[key];

        // Apply appropriate sanitization based on schema or value type
        if (fieldType === 'email' || key.toLowerCase().includes('email')) {
          sanitized[key] = sanitizeEmail(value);
        } else if (fieldType === 'url' || key.toLowerCase().includes('url')) {
          sanitized[key] = sanitizeUrl(value);
        } else if (fieldType === 'phone' || key.toLowerCase().includes('phone')) {
          sanitized[key] = sanitizePhone(value);
        } else if (fieldType === 'number' || typeof value === 'number') {
          // Keep numbers as-is, but validate they're actual numbers
          sanitized[key] = typeof value === 'number' ? value : 0;
        } else if (fieldType === 'boolean' || typeof value === 'boolean') {
          sanitized[key] = Boolean(value);
        } else if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object') {
          // Recursively sanitize nested objects
          sanitized[key] = sanitizeObject(value, schema);
        } else {
          // Keep primitives as-is
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  // Return primitives as-is
  return obj;
};

/**
 * Validate and sanitize a length-constrained string
 * @param str - String to validate
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @returns Sanitized string or null if invalid
 */
export const validateStringLength = (
  str: string | null | undefined,
  minLength: number = 1,
  maxLength: number = 1000
): string | null => {
  const sanitized = sanitizeString(str);

  if (sanitized.length < minLength || sanitized.length > maxLength) {
    return null;
  }

  return sanitized;
};

/**
 * Check if input contains potential SQL injection patterns
 * @param input - Input to check
 * @returns True if suspicious patterns detected
 */
export const containsSQLInjectionPattern = (input: string | null | undefined): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /(;|'|"|`)/,
    /(\bOR\b.*=|AND\b.*=)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
};

/**
 * Check if input contains potential XSS patterns
 * @param input - Input to check
 * @returns True if suspicious patterns detected
 */
export const containsXSSPattern = (input: string | null | undefined): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Common XSS patterns
  const xssPatterns = [
    /<script[^>]*>|<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onload=
    /<iframe|<frame|<embed|<object/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
};

/**
 * Check if input contains potential command injection patterns
 * @param input - Input to check
 * @returns True if suspicious patterns detected
 */
export const containsCommandInjectionPattern = (input: string | null | undefined): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Common command injection patterns
  const commandPatterns = [
    /[;&|`$(){}[\]<>\\]/,
    /\$\{.*\}/,
    /\$\(.*\)/,
    /`.*`/,
  ];

  return commandPatterns.some((pattern) => pattern.test(input));
};

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhone,
  sanitizeObject,
  validateStringLength,
  containsSQLInjectionPattern,
  containsXSSPattern,
  containsCommandInjectionPattern,
};
