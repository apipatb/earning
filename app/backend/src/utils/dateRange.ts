/**
 * Date Range Utilities
 * Provides functions to calculate and validate date ranges for analytics and filtering
 */

/**
 * Supported period types for date range calculations
 */
export type Period = 'today' | 'week' | 'month' | 'year';

/**
 * Date range interface with start and end dates
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate date range based on predefined periods or custom dates
 *
 * @param period - Predefined period ('today', 'week', 'month', 'year')
 * @param customStart - Optional custom start date (ISO string or Date)
 * @param customEnd - Optional custom end date (ISO string or Date)
 * @returns DateRange object with startDate and endDate
 *
 * @throws Error if customStart is after customEnd
 * @throws Error if period is invalid
 *
 * @example
 * // Get today's date range (start of day to now)
 * const today = calculateDateRange('today');
 *
 * @example
 * // Get last 7 days
 * const lastWeek = calculateDateRange('week');
 *
 * @example
 * // Get custom date range
 * const custom = calculateDateRange('today', '2024-01-01', '2024-01-31');
 */
export function calculateDateRange(
  period: Period,
  customStart?: string | Date,
  customEnd?: string | Date
): DateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  // If custom dates are provided, use them
  if (customStart && customEnd) {
    startDate = typeof customStart === 'string' ? new Date(customStart) : customStart;
    endDate = typeof customEnd === 'string' ? new Date(customEnd) : customEnd;

    // Validate dates
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid customStart date');
    }
    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid customEnd date');
    }
    if (startDate > endDate) {
      throw new Error('startDate must be before or equal to endDate');
    }

    return { startDate, endDate };
  }

  // Calculate based on period
  switch (period) {
    case 'today':
      // Start of day to now
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      break;

    case 'week':
      // Last 7 days (including today)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      break;

    case 'month':
      // Last 30 days (including today)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      break;

    case 'year':
      // Last 365 days (including today)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 364);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      break;

    default:
      throw new Error(`Invalid period: ${period}. Must be one of: today, week, month, year`);
  }

  return { startDate, endDate };
}

/**
 * Validate if a date range is valid
 *
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns true if valid, false otherwise
 *
 * @example
 * const isValid = isValidDateRange(new Date('2024-01-01'), new Date('2024-01-31'));
 * // returns true
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    return false;
  }
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }
  return startDate <= endDate;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 *
 * @param date - Date to format
 * @returns ISO date string
 *
 * @example
 * const formatted = formatDateToISO(new Date('2024-01-15'));
 * // returns '2024-01-15'
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date range for a specific month
 *
 * @param year - Year (e.g., 2024)
 * @param month - Month (1-12)
 * @returns DateRange for the specified month
 *
 * @example
 * const jan2024 = getMonthDateRange(2024, 1);
 * // returns { startDate: 2024-01-01, endDate: 2024-01-31 }
 */
export function getMonthDateRange(year: number, month: number): DateRange {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(year, month, 0); // Last day of the month
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}
