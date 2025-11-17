/**
 * Safely parse pagination limit parameter
 * @param limit - The limit value from query params
 * @param defaultLimit - Default limit if parsing fails (default: 50)
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @returns Safe limit value
 */
export const parseLimitParam = (limit: string | undefined, defaultLimit = 50, maxLimit = 100): number => {
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

/**
 * Validate enum-like string parameter with strict error throwing
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param paramName - Parameter name for error messages
 * @throws Error if value is invalid
 * @returns Valid enum value
 */
export const validateEnumParam = <T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
  paramName: string
): T => {
  if (!value) {
    throw new Error(`${paramName} is required. Valid values: ${allowedValues.join(', ')}`);
  }

  if (!allowedValues.includes(value as T)) {
    throw new Error(`Invalid ${paramName}: '${value}'. Valid values: ${allowedValues.join(', ')}`);
  }

  return value as T;
};

/**
 * Validate period parameter for analytics
 * @param period - The period value to validate
 * @returns Valid period value
 * @throws Error if period is invalid
 */
export const validatePeriodParam = (period: string | undefined): 'today' | 'week' | 'month' | 'year' => {
  const allowedValues = ['today', 'week', 'month', 'year'] as const;

  if (!period) {
    return 'month'; // Default value
  }

  if (!allowedValues.includes(period as any)) {
    throw new Error(`Invalid period: '${period}'. Valid values: ${allowedValues.join(', ')}`);
  }

  return period as 'today' | 'week' | 'month' | 'year';
};

/**
 * Validate search string parameter
 * @param search - The search string to validate
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Validated search string or undefined
 * @throws Error if search string is invalid
 */
export const validateSearchParam = (search: string | undefined, maxLength = 100): string | undefined => {
  if (!search) {
    return undefined;
  }

  const trimmed = search.trim();

  if (trimmed.length === 0) {
    throw new Error('Search parameter must be a non-empty string');
  }

  if (trimmed.length > maxLength) {
    throw new Error(`Search parameter must not exceed ${maxLength} characters`);
  }

  return trimmed;
};

/**
 * Validate that quantity * unitPrice approximately equals totalAmount
 * @param quantity - The quantity value
 * @param unitPrice - The unit price value
 * @param totalAmount - The total amount value
 * @param tolerance - Decimal tolerance (default: 0.01)
 * @throws Error if calculation doesn't match
 */
export const validateSaleTotalAmount = (
  quantity: number,
  unitPrice: number,
  totalAmount: number,
  tolerance = 0.01
): void => {
  const calculatedTotal = quantity * unitPrice;
  const difference = Math.abs(calculatedTotal - totalAmount);

  if (difference > tolerance) {
    throw new Error(
      `Total amount mismatch: ${quantity} × ${unitPrice} = ${calculatedTotal.toFixed(2)}, ` +
      `but totalAmount is ${totalAmount.toFixed(2)} (difference: ${difference.toFixed(2)}). ` +
      `Ensure quantity × unitPrice equals totalAmount.`
    );
  }
};
