/**
 * Safe localStorage utilities with error handling
 */

/**
 * Safely get and parse JSON from localStorage
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist or parsing fails
 * @returns Parsed value or default
 */
export const getStorageJSON = <T = unknown>(key: string, defaultValue: T = [] as T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    // If parsing fails, log and return default
    console.warn(`Failed to parse localStorage key "${key}":`, error instanceof Error ? error.message : String(error));
    return defaultValue;
  }
};

/**
 * Safely set JSON value in localStorage
 * @param key - The localStorage key
 * @param value - The value to store
 * @returns True if successful, false otherwise
 */
export const setStorageJSON = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to set localStorage key "${key}":`, error instanceof Error ? error.message : String(error));
    return false;
  }
};

/**
 * Safely remove item from localStorage
 * @param key - The localStorage key
 * @returns True if successful, false otherwise
 */
export const removeStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove localStorage key "${key}":`, error instanceof Error ? error.message : String(error));
    return false;
  }
};

/**
 * Safely clear all localStorage
 * @returns True if successful, false otherwise
 */
export const clearStorage = (): boolean => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.warn('Failed to clear localStorage:', error instanceof Error ? error.message : String(error));
    return false;
  }
};
