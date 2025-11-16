/**
 * Safe JSON parsing utilities with error handling
 * Prevents crashes from malformed or corrupted JSON data
 */

import { notify } from '../store/notification.store';

/**
 * Safely parse JSON with fallback value
 * @param jsonString - String to parse
 * @param fallback - Value to return if parsing fails
 * @param silent - If true, don't show error notification
 * @returns Parsed object or fallback value
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T, silent = false): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    if (!silent) {
      console.warn(`Failed to parse JSON: ${errorMsg}`, jsonString);
    }
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 * @param obj - Object to stringify
 * @param pretty - Whether to pretty-print (default: false)
 * @returns JSON string or empty string on error
 */
export function safeJsonStringify(obj: unknown, pretty = false): string {
  try {
    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to stringify JSON: ${errorMsg}`);
    notify.error('Error', 'Failed to serialize data');
    return '';
  }
}

/**
 * Parse and validate JSON against expected structure
 * @param jsonString - String to parse
 * @param validator - Function to validate structure
 * @param fallback - Value to return if parsing or validation fails
 * @returns Validated object or fallback value
 */
export function safeJsonParseWithValidator<T>(
  jsonString: string | null | undefined,
  validator: (obj: any) => boolean,
  fallback: T
): T {
  const parsed = safeJsonParse<any>(jsonString, null, true);

  if (parsed === null) {
    return fallback;
  }

  if (!validator(parsed)) {
    console.warn('JSON validation failed for:', jsonString);
    return fallback;
  }

  return parsed as T;
}
