/**
 * Frontend validation utilities
 */

/**
 * Safely parse a string value to a specific enum type
 * @param value - The string value to parse
 * @param allowedValues - Array of allowed enum values
 * @param defaultValue - Default value if validation fails
 * @returns Valid enum value or default
 */
export const parseEnumValue = <T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
  defaultValue: T
): T => {
  if (!value) {
    return defaultValue;
  }

  if (allowedValues.includes(value as T)) {
    return value as T;
  }

  return defaultValue;
};

/**
 * Safely parse form input values to specific types
 */
export const FormValidation = {
  /**
   * Parse date format enum
   */
  parseDateFormat: (value: string | undefined): 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' => {
    return parseEnumValue(value, ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const, 'YYYY-MM-DD');
  },

  /**
   * Parse time format enum
   */
  parseTimeFormat: (value: string | undefined): '12h' | '24h' => {
    return parseEnumValue(value, ['12h', '24h'] as const, '24h');
  },

  /**
   * Parse week start day enum
   */
  parseWeekStartDay: (value: string | undefined): 'sunday' | 'monday' => {
    return parseEnumValue(value, ['sunday', 'monday'] as const, 'monday');
  },

  /**
   * Parse number separator enum (includes space)
   */
  parseNumberSeparator: (value: string | undefined): ',' | '.' | ' ' => {
    return parseEnumValue(value, [',', '.', ' '] as const, '.');
  },

  /**
   * Parse decimal separator enum
   */
  parseDecimalSeparator: (value: string | undefined): '.' | ',' => {
    return parseEnumValue(value, ['.', ','] as const, '.');
  },

  /**
   * Parse chart type enum
   */
  parseChartType: (value: string | undefined): 'bar' | 'line' | 'area' => {
    return parseEnumValue(value, ['bar', 'line', 'area'] as const, 'bar');
  },

  /**
   * Parse boolean from string
   */
  parseBoolean: (value: string | undefined, defaultValue: boolean = false): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return defaultValue;
  },

  /**
   * Parse number from string
   */
  parseNumber: (value: string | undefined, defaultValue: number = 0, min?: number, max?: number): number => {
    if (!value) return defaultValue;

    const parsed = parseFloat(value);

    if (isNaN(parsed)) {
      return defaultValue;
    }

    if (min !== undefined && parsed < min) {
      return min;
    }

    if (max !== undefined && parsed > max) {
      return max;
    }

    return parsed;
  },
};
