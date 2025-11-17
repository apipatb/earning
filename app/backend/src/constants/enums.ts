/**
 * Application Enums and Constants
 * Defines all status enums and related constants used across the application
 */

/**
 * Invoice status enumeration
 * Represents all possible states of an invoice in the system
 *
 * @constant
 * @property {string} DRAFT - Invoice is being created/edited
 * @property {string} SENT - Invoice has been sent to customer
 * @property {string} VIEWED - Customer has viewed the invoice
 * @property {string} PAID - Invoice has been paid in full
 * @property {string} OVERDUE - Invoice payment is past due date
 * @property {string} CANCELLED - Invoice has been cancelled
 */
export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Type representing valid invoice status values
 */
export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

/**
 * Array of invoice statuses that are considered "pending" (not yet paid or cancelled)
 * Useful for filtering invoices that require attention
 *
 * @constant
 */
export const INVOICE_PENDING_STATUSES: InvoiceStatus[] = [
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.SENT,
  INVOICE_STATUS.VIEWED,
  INVOICE_STATUS.OVERDUE,
];

/**
 * Array of all valid invoice statuses
 *
 * @constant
 */
export const ALL_INVOICE_STATUSES: InvoiceStatus[] = Object.values(INVOICE_STATUS);

/**
 * Sale status enumeration
 * Represents all possible states of a sale transaction
 *
 * @constant
 * @property {string} COMPLETED - Sale has been completed successfully
 * @property {string} PENDING - Sale is pending completion
 * @property {string} CANCELLED - Sale has been cancelled
 */
export const SALE_STATUS = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Type representing valid sale status values
 */
export type SaleStatus = typeof SALE_STATUS[keyof typeof SALE_STATUS];

/**
 * Array of all valid sale statuses
 *
 * @constant
 */
export const ALL_SALE_STATUSES: SaleStatus[] = Object.values(SALE_STATUS);

/**
 * Inventory log type enumeration
 * Represents all possible types of inventory changes
 *
 * @constant
 * @property {string} PURCHASE - Inventory added via purchase from supplier
 * @property {string} SALE - Inventory removed via sale to customer
 * @property {string} ADJUSTMENT - Manual inventory adjustment (correction)
 * @property {string} DAMAGE - Inventory removed due to damage/loss
 * @property {string} RETURN - Inventory added back via customer return
 */
export const INVENTORY_LOG_TYPE = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
  DAMAGE: 'DAMAGE',
  RETURN: 'RETURN',
} as const;

/**
 * Type representing valid inventory log type values
 */
export type InventoryLogType = typeof INVENTORY_LOG_TYPE[keyof typeof INVENTORY_LOG_TYPE];

/**
 * Array of all valid inventory log types
 *
 * @constant
 */
export const ALL_INVENTORY_LOG_TYPES: InventoryLogType[] = Object.values(INVENTORY_LOG_TYPE);

/**
 * Goal status enumeration
 * Represents all possible states of a financial goal
 *
 * @constant
 * @property {string} ACTIVE - Goal is currently active and being tracked
 * @property {string} COMPLETED - Goal has been achieved
 * @property {string} CANCELLED - Goal has been cancelled/abandoned
 */
export const GOAL_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Type representing valid goal status values
 */
export type GoalStatus = typeof GOAL_STATUS[keyof typeof GOAL_STATUS];

/**
 * Array of all valid goal statuses
 *
 * @constant
 */
export const ALL_GOAL_STATUSES: GoalStatus[] = Object.values(GOAL_STATUS);

/**
 * Payment method enumeration
 * Represents all supported payment methods
 *
 * @constant
 * @property {string} CASH - Cash payment
 * @property {string} CARD - Credit/debit card payment
 * @property {string} BANK - Bank transfer payment
 * @property {string} OTHER - Other payment methods
 */
export const PAYMENT_METHOD = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK: 'BANK',
  OTHER: 'OTHER',
} as const;

/**
 * Type representing valid payment method values
 */
export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

/**
 * Array of all valid payment methods
 *
 * @constant
 */
export const ALL_PAYMENT_METHODS: PaymentMethod[] = Object.values(PAYMENT_METHOD);
