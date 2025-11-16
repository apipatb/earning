/**
 * API Request Type Definitions
 * Standardized request types for all API endpoints
 */

// ============================================
// PAGINATION PARAMS
// ============================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ============================================
// QUERY PARAMETERS
// ============================================

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface PlatformFilters extends PaginationParams, DateRangeParams {
  category?: string;
  isActive?: boolean;
}

export interface EarningFilters extends PaginationParams, DateRangeParams {
  platformId?: string;
}

export interface GoalFilters extends PaginationParams {
  status?: 'active' | 'completed' | 'cancelled';
}

export interface ProductFilters extends PaginationParams {
  category?: string;
  isActive?: boolean;
}

export interface SaleFilters extends PaginationParams, DateRangeParams {
  productId?: string;
  status?: 'completed' | 'pending' | 'cancelled';
  customer?: string;
}

export interface CustomerFilters extends PaginationParams {
  isActive?: boolean;
}

export interface ExpenseFilters extends PaginationParams, DateRangeParams {
  category?: string;
  isTaxDeductible?: boolean;
  vendor?: string;
}

export interface InvoiceFilters extends PaginationParams, DateRangeParams {
  customerId?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
}

export interface AnalyticsParams extends DateRangeParams {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// ============================================
// REQUEST BODIES
// ============================================

export interface CreatePlatformRequest {
  name: string;
  category: string;
  color?: string;
  expectedRate?: number;
}

export interface UpdatePlatformRequest {
  name?: string;
  category?: string;
  color?: string;
  expectedRate?: number;
  isActive?: boolean;
}

export interface CreateEarningRequest {
  platformId: string;
  date: string; // YYYY-MM-DD
  hours?: number;
  amount: number;
  notes?: string;
}

export interface UpdateEarningRequest {
  date?: string;
  hours?: number;
  amount?: number;
  notes?: string;
}

export interface CreateGoalRequest {
  title: string;
  targetAmount: number;
  deadline?: string;
  description?: string;
}

export interface UpdateGoalRequest {
  title?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  description?: string;
  status?: 'active' | 'completed' | 'cancelled';
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  category?: string;
  sku?: string;
  quantity?: number;
  reorderPoint?: number;
  supplierName?: string;
  supplierCost?: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  sku?: string;
  quantity?: number;
  reorderPoint?: number;
  supplierName?: string;
  supplierCost?: number;
  isActive?: boolean;
}

export interface CreateSaleRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  saleDate?: string;
  customer?: string;
  notes?: string;
}

export interface UpdateSaleRequest {
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  saleDate?: string;
  customer?: string;
  notes?: string;
  status?: 'completed' | 'pending' | 'cancelled';
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreateExpenseRequest {
  category: string;
  description: string;
  amount: number;
  expenseDate?: string;
  vendor?: string;
  isTaxDeductible?: boolean;
  receiptUrl?: string;
  notes?: string;
}

export interface UpdateExpenseRequest {
  category?: string;
  description?: string;
  amount?: number;
  expenseDate?: string;
  vendor?: string;
  isTaxDeductible?: boolean;
  receiptUrl?: string;
  notes?: string;
}

export interface CreateInvoiceRequest {
  customerId: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  invoiceDate?: string;
  dueDate: string;
  paymentMethod?: 'cash' | 'card' | 'bank' | 'other';
  notes?: string;
  terms?: string;
}

export interface UpdateInvoiceRequest {
  customerId?: string;
  invoiceNumber?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  invoiceDate?: string;
  dueDate?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'bank' | 'other';
  notes?: string;
  terms?: string;
}

export interface MarkInvoicePaidRequest {
  paidDate: string;
  paymentMethod?: 'cash' | 'card' | 'bank' | 'other';
}

export interface LogInventoryChangeRequest {
  productId: string;
  quantityChange: number;
  type: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'return';
  notes?: string;
}

export interface UpdateUserProfileRequest {
  name?: string;
  timezone?: string;
  currency?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
