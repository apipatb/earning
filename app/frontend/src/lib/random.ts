/**
 * Utilities for generating random IDs using cryptographically secure methods
 */

/**
 * Generate a random string ID using crypto API
 * @param length - Length of the random string (default: 16)
 * @returns Cryptographically secure random string
 */
export const generateRandomId = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charLength = chars.length;
  let result = '';

  try {
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % charLength];
    }
  } catch (error) {
    // Fallback for environments without crypto API
    console.warn('crypto API unavailable, using Math.random() fallback');
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * charLength)];
    }
  }

  return result;
};

/**
 * Generate a random numeric string (good for invoice numbers)
 * @param length - Length of the numeric string (default: 4)
 * @returns Cryptographically secure random numeric string
 */
export const generateRandomNumeric = (length: number = 4): string => {
  let result = '';

  try {
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += (randomValues[i] % 10).toString();
    }
  } catch (error) {
    // Fallback for environments without crypto API
    console.warn('crypto API unavailable, using Math.random() fallback');
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
  }

  return result;
};

/**
 * Generate a UUID v4 style string
 * @returns UUID v4 format string
 */
export const generateUUID = (): string => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    // Fallback implementation if randomUUID not available
    console.warn('crypto.randomUUID unavailable, using fallback implementation');
    const chars = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4';
      } else if (i === 19) {
        uuid += chars[(Math.random() * 4) | 8];
      } else {
        uuid += chars[Math.floor(Math.random() * 16)];
      }
    }
    return uuid;
  }
};
