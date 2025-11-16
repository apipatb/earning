import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const RegisterInputSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ============================================================================
// EARNING SCHEMAS
// ============================================================================

export const CreateEarningSchema = z.object({
  platformId: z.string().uuid('Platform ID must be a valid UUID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  hours: z.number().positive('Hours must be positive').optional(),
  amount: z.number().positive('Amount must be positive'),
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
});

export const UpdateEarningSchema = CreateEarningSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const EarningFilterSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  platform_id: z.string().uuid().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('100'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
}).refine(
  (data) => !data.start_date || !data.end_date || new Date(data.start_date) <= new Date(data.end_date),
  { message: 'start_date must be before or equal to end_date', path: ['end_date'] }
);

export type CreateEarning = z.infer<typeof CreateEarningSchema>;
export type UpdateEarning = z.infer<typeof UpdateEarningSchema>;
export type EarningFilter = z.infer<typeof EarningFilterSchema>;

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const InvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(1000),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
});

const InvoiceBaseSchema = z.object({
  customerId: z.string().uuid('Customer ID must be a valid UUID').optional(),
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100),
  subtotal: z.number().positive('Subtotal must be positive'),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').default(0),
  totalAmount: z.number().positive('Total amount must be positive'),
  invoiceDate: z.string().or(z.date()).transform((val) => new Date(val)),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']).default('draft'),
  paymentMethod: z.string().max(50, 'Payment method must not exceed 50 characters').optional(),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
  terms: z.string().max(1000, 'Terms must not exceed 1000 characters').optional(),
  lineItems: z.array(InvoiceLineItemSchema).min(1, 'At least one line item is required'),
});

export const CreateInvoiceSchema = InvoiceBaseSchema.refine(
  (data) => data.invoiceDate <= data.dueDate,
  { message: 'Due date must be after invoice date', path: ['dueDate'] }
);

export const UpdateInvoiceSchema = InvoiceBaseSchema.partial().refine(
  (data: any) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const InvoiceFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']).optional(),
  customerId: z.string().uuid().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
});

export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceFilter = z.infer<typeof InvoiceFilterSchema>;

// ============================================================================
// CUSTOMER SCHEMAS
// ============================================================================

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must not exceed 255 characters'),
  email: z.string().email('Invalid email format').max(255).optional(),
  phone: z.string().max(20, 'Phone must not exceed 20 characters').optional(),
  company: z.string().max(255, 'Company must not exceed 255 characters').optional(),
  address: z.string().max(500, 'Address must not exceed 500 characters').optional(),
  city: z.string().max(100, 'City must not exceed 100 characters').optional(),
  country: z.string().max(100, 'Country must not exceed 100 characters').optional(),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const CustomerFilterSchema = z.object({
  isActive: z.enum(['true', 'false']).optional().transform(v => v ? v === 'true' : undefined),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['name', 'ltv', 'recent', 'purchases']).default('name'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
export type CustomerFilter = z.infer<typeof CustomerFilterSchema>;

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must not exceed 255 characters'),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().max(100, 'Category must not exceed 100 characters').optional(),
  sku: z.string().max(100, 'SKU must not exceed 100 characters').optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const ProductFilterSchema = z.object({
  isActive: z.enum(['true', 'false']).optional().transform(v => v ? v === 'true' : undefined),
  category: z.string().max(100).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
});

export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type ProductFilter = z.infer<typeof ProductFilterSchema>;

// ============================================================================
// EXPENSE SCHEMAS
// ============================================================================

export const CreateExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().max(100, 'Category must not exceed 100 characters').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const ExpenseFilterSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().max(100).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
}).refine(
  (data) => !data.start_date || !data.end_date || new Date(data.start_date) <= new Date(data.end_date),
  { message: 'start_date must be before or equal to end_date', path: ['end_date'] }
);

export type CreateExpense = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;
export type ExpenseFilter = z.infer<typeof ExpenseFilterSchema>;

// ============================================================================
// PAGINATION & DATE RANGE SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
});

export const DateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  { message: 'start_date must be before or equal to end_date', path: ['end_date'] }
);

export const AnalyticsPeriodSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'all']).default('month'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (data) => !data.start_date || !data.end_date || new Date(data.start_date) <= new Date(data.end_date),
  { message: 'start_date must be before or equal to end_date', path: ['end_date'] }
);

export type Pagination = z.infer<typeof PaginationSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;

// ============================================================================
// UTILITY TYPE FOR VALIDATION ERRORS
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResponse {
  success: boolean;
  errors?: ValidationError[];
  data?: any;
}
