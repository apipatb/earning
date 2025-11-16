/**
 * Safely parse pagination limit parameter
 * @param limit - The limit value from query params
 * @param defaultLimit - Default limit if parsing fails (default: 100)
 * @param maxLimit - Maximum allowed limit (default: 1000)
 * @returns Safe limit value
 */
export const parseLimitParam = (limit: string | undefined, defaultLimit = 100, maxLimit = 1000): number => {
  if (!limit) return defaultLimit;

  const parsed = parseInt(limit, 10);

  // Check if parsed value is valid number
  if (isNaN(parsed) || parsed < 1) {
    return defaultLimit;
  }

  // Enforce maximum limit
  if (parsed > maxLimit) {
    return maxLimit;
  }

  return parsed;
};

/**
 * Safely parse pagination offset parameter
 * @param offset - The offset value from query params
 * @param defaultOffset - Default offset if parsing fails (default: 0)
 * @returns Safe offset value
 */
export const parseOffsetParam = (offset: string | undefined, defaultOffset = 0): number => {
  if (!offset) return defaultOffset;

  const parsed = parseInt(offset, 10);

  // Check if parsed value is valid number
  if (isNaN(parsed) || parsed < 0) {
    return defaultOffset;
  }

  return parsed;
};

/**
 * Safely parse date string to Date object
 * @param dateStr - The date string to parse
 * @returns Date object or null if invalid
 */
export const parseDateParam = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;

  const date = new Date(dateStr);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Safely parse and validate enum-like string parameter
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param defaultValue - Default value if validation fails
 * @returns Valid enum value or default
 */
export const parseEnumParam = <T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
  defaultValue: T
): T => {
  if (!value || !allowedValues.includes(value as T)) {
    return defaultValue;
  }

  return value as T;
};
