/**
 * Application-wide constants
 * Centralizes hardcoded values and makes them configurable
 */

/**
 * Default values for features
 */
export const DEFAULTS = {
  // Time tracking
  DEFAULT_HOURLY_RATE: 50,
  DEFAULT_DAILY_GOAL_HOURS: 6,

  // Budget
  DEFAULT_BUDGET_WARNING_THRESHOLD: 0.8, // 80%
  DEFAULT_BUDGET_DANGER_THRESHOLD: 0.95, // 95%

  // Analytics
  DEFAULT_ANALYTICS_LOOKBACK_DAYS: 7,
  DEFAULT_LONG_TERM_LOOKBACK_DAYS: 14,

  // Display
  DEFAULT_CURRENCY_SYMBOL: '$',
  DEFAULT_DECIMAL_PLACES: 2,
  DEFAULT_PAGE_SIZE: 50,
  DEFAULT_REPORT_COLOR_COUNT: 8,
} as const;

/**
 * Budget categories
 */
export const BUDGET_CATEGORIES = [
  'Utilities',
  'Supplies',
  'Rent',
  'Transportation',
  'Equipment',
  'Software',
  'Marketing',
  'Other',
] as const;

/**
 * Expense categories
 */
export const EXPENSE_CATEGORIES = [
  'Utilities',
  'Supplies',
  'Rent',
  'Transportation',
  'Equipment',
  'Software',
  'Meals',
  'Travel',
  'Insurance',
  'Taxes',
  'Fees',
  'Other',
] as const;

/**
 * Priority levels
 */
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

/**
 * Report types
 */
export const REPORT_TYPES = [
  'sales',
  'revenue',
  'expenses',
  'earnings',
  'inventory',
  'customer',
  'product',
  'custom',
] as const;

/**
 * Report periods
 */
export const REPORT_PERIODS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
  CUSTOM: 'custom',
} as const;

/**
 * Frequency options for recurring items
 */
export const FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUALLY: 'annually',
} as const;

/**
 * Chart types
 */
export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  DOUGHNUT: 'doughnut',
  AREA: 'area',
  SCATTER: 'scatter',
} as const;

/**
 * Color palette for charts
 */
export const CHART_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6366F1', // indigo
] as const;

/**
 * Invoice statuses
 */
export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

/**
 * Sale statuses
 */
export const SALE_STATUSES = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
} as const;

/**
 * Goal statuses
 */
export const GOAL_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

/**
 * Inventory log types
 */
export const INVENTORY_LOG_TYPES = {
  PURCHASE: 'purchase',
  SALE: 'sale',
  ADJUSTMENT: 'adjustment',
  DAMAGE: 'damage',
  RETURN: 'return',
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0,
  MIN_LIMIT: 1,
  MAX_LIMIT: 1000,
  STEP: 10,
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
  INPUT: 'yyyy-MM-dd',
  TABLE: 'MMM dd, yyyy',
} as const;

/**
 * Time formats
 */
export const TIME_FORMATS = {
  SHORT: 'HH:mm',
  LONG: 'HH:mm:ss',
  12_HOUR: 'hh:mm a',
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  // Text fields
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 255,
  MIN_EMAIL_LENGTH: 5,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 20,
  MAX_DESCRIPTION_LENGTH: 1000,

  // Numeric fields
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999999.99,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  MIN_HOURS: 0,
  MAX_HOURS: 24,

  // Password
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
} as const;

/**
 * Toast/notification durations (in ms)
 */
export const NOTIFICATION_DURATIONS = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
  PERSISTENT: 0, // User must close manually
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },
  EARNINGS: {
    LIST: '/earnings',
    CREATE: '/earnings',
    UPDATE: (id: string) => `/earnings/${id}`,
    DELETE: (id: string) => `/earnings/${id}`,
  },
  EXPENSES: {
    LIST: '/expenses',
    CREATE: '/expenses',
    UPDATE: (id: string) => `/expenses/${id}`,
    DELETE: (id: string) => `/expenses/${id}`,
    SUMMARY: '/expenses/summary',
    PROFIT: '/expenses/profit/margin',
  },
  PLATFORMS: {
    LIST: '/platforms',
    CREATE: '/platforms',
    UPDATE: (id: string) => `/platforms/${id}`,
    DELETE: (id: string) => `/platforms/${id}`,
  },
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
  },
  SALES: {
    LIST: '/sales',
    CREATE: '/sales',
    UPDATE: (id: string) => `/sales/${id}`,
    DELETE: (id: string) => `/sales/${id}`,
    SUMMARY: '/sales/summary',
  },
  INVOICES: {
    LIST: '/invoices',
    CREATE: '/invoices',
    UPDATE: (id: string) => `/invoices/${id}`,
    DELETE: (id: string) => `/invoices/${id}`,
    MARK_PAID: (id: string) => `/invoices/${id}/mark-paid`,
    SUMMARY: '/invoices/summary',
    OVERDUE: '/invoices/overdue',
  },
  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers',
    UPDATE: (id: string) => `/customers/${id}`,
    DELETE: (id: string) => `/customers/${id}`,
  },
  INVENTORY: {
    LIST: '/inventory',
    UPDATE: (id: string) => `/inventory/${id}/stock`,
    LOG: '/inventory/log',
  },
  ANALYTICS: {
    SUMMARY: '/analytics',
  },
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SERVER_ERROR: 500,
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  DASHBOARD_WIDGETS: 'dashboard_widgets',
} as const;

/**
 * Debug mode - set to false in production
 */
export const DEBUG_MODE = import.meta.env.DEV;
