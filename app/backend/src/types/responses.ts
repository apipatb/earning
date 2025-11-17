/**
 * API Response Type Definitions
 * Standardized response types for all API endpoints
 */

// ============================================
// SUCCESS RESPONSES
// ============================================

export interface SuccessResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================
// ERROR RESPONSES
// ============================================

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationErrorResponse extends ErrorResponse {
  error: 'Validation Error';
  details: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================
// AUTH RESPONSES
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// ============================================
// ENTITY RESPONSES
// ============================================

export interface PlatformResponse {
  id: string;
  name: string;
  category: string;
  color?: string;
  expectedRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EarningResponse {
  id: string;
  platformId: string;
  platform: {
    id: string;
    name: string;
    color?: string;
  };
  date: string;
  hours?: number;
  amount: number;
  hourlyRate?: number;
  notes?: string;
}

export interface GoalResponse {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ProductResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  sku?: string;
  quantity: number;
  reorderPoint: number;
  supplierName?: string;
  supplierCost?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleResponse {
  id: string;
  userId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    category?: string;
  };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  saleDate: string;
  customer?: string;
  notes?: string;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CustomerResponse {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  totalPurchases: number;
  totalQuantity: number;
  purchaseCount: number;
  lastPurchase?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseResponse {
  id: string;
  userId: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  vendor?: string;
  isTaxDeductible: boolean;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceResponse {
  id: string;
  userId: string;
  customerId?: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'bank' | 'other';
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLogResponse {
  id: string;
  userId: string;
  productId: string;
  quantityChange: number;
  type: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'return';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AGGREGATE RESPONSES
// ============================================

export interface AnalyticsSummary {
  period: string;
  startDate: string;
  endDate: string;
  totalEarnings: number;
  totalHours: number;
  avgHourlyRate: number;
  byPlatform: Array<{
    platform: {
      id: string;
      name: string;
      color?: string;
    };
    earnings: number;
    hours: number;
    hourlyRate: number;
    percentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    earnings: number;
    hours: number;
  }>;
}

export interface SalesSummary {
  period: string;
  totalSales: number;
  totalQuantity: number;
  totalAmount: number;
  byProduct: Array<{
    product: {
      id: string;
      name: string;
    };
    quantity: number;
    totalAmount: number;
  }>;
}

export interface ExpenseSummary {
  period: string;
  totalExpenses: number;
  byCategory: Record<string, number>;
  taxDeductible: number;
  nonTaxDeductible: number;
}

export interface ProfitMargin {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number; // percentage
}

// ============================================
// GENERIC API RESPONSE WRAPPER
// ============================================

/**
 * Generic API response wrapper for consistent response formatting
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// CONTROLLER-SPECIFIC RESPONSE TYPES
// ============================================

// Customer Responses
export type GetCustomersResponse = PaginatedResponse<CustomerResponse>;
export type GetCustomerResponse = ApiResponse<CustomerResponse>;
export type CreateCustomerResponse = ApiResponse<CustomerResponse>;
export type UpdateCustomerResponse = ApiResponse<CustomerResponse>;
export type DeleteCustomerResponse = ApiResponse<{ id: string }>;

// Product Responses
export type GetProductsResponse = PaginatedResponse<ProductResponse>;
export type GetProductResponse = ApiResponse<ProductResponse>;
export type CreateProductResponse = ApiResponse<ProductResponse>;
export type UpdateProductResponse = ApiResponse<ProductResponse>;
export type DeleteProductResponse = ApiResponse<{ id: string }>;

// Earning Responses
export type GetEarningsResponse = PaginatedResponse<EarningResponse>;
export type GetEarningResponse = ApiResponse<EarningResponse>;
export type CreateEarningResponse = ApiResponse<EarningResponse>;
export type UpdateEarningResponse = ApiResponse<EarningResponse>;
export type DeleteEarningResponse = ApiResponse<{ id: string }>;

// Expense Responses
export type GetExpensesResponse = PaginatedResponse<ExpenseResponse>;
export type GetExpenseResponse = ApiResponse<ExpenseResponse>;
export type CreateExpenseResponse = ApiResponse<ExpenseResponse>;
export type UpdateExpenseResponse = ApiResponse<ExpenseResponse>;
export type DeleteExpenseResponse = ApiResponse<{ id: string }>;

// Invoice Responses
export type GetInvoicesResponse = PaginatedResponse<InvoiceResponse>;
export type GetInvoiceResponse = ApiResponse<InvoiceResponse>;
export type CreateInvoiceResponse = ApiResponse<InvoiceResponse>;
export type UpdateInvoiceResponse = ApiResponse<InvoiceResponse>;
export type DeleteInvoiceResponse = ApiResponse<{ id: string }>;

// Goal Responses
export type GetGoalsResponse = PaginatedResponse<GoalResponse>;
export type GetGoalResponse = ApiResponse<GoalResponse>;
export type CreateGoalResponse = ApiResponse<GoalResponse>;
export type UpdateGoalResponse = ApiResponse<GoalResponse>;
export type DeleteGoalResponse = ApiResponse<{ id: string }>;

// Platform Responses
export type GetPlatformsResponse = PaginatedResponse<PlatformResponse>;
export type GetPlatformResponse = ApiResponse<PlatformResponse>;
export type CreatePlatformResponse = ApiResponse<PlatformResponse>;
export type UpdatePlatformResponse = ApiResponse<PlatformResponse>;
export type DeletePlatformResponse = ApiResponse<{ id: string }>;

// Sale Responses
export type GetSalesResponse = PaginatedResponse<SaleResponse>;
export type GetSaleResponse = ApiResponse<SaleResponse>;
export type CreateSaleResponse = ApiResponse<SaleResponse>;
export type UpdateSaleResponse = ApiResponse<SaleResponse>;
export type DeleteSaleResponse = ApiResponse<{ id: string }>;

// Inventory Log Responses
export type GetInventoryLogsResponse = PaginatedResponse<InventoryLogResponse>;
export type GetInventoryLogResponse = ApiResponse<InventoryLogResponse>;
export type CreateInventoryLogResponse = ApiResponse<InventoryLogResponse>;

// Analytics Responses
export type GetAnalyticsSummaryResponse = ApiResponse<AnalyticsSummary>;
export type GetSalesSummaryResponse = ApiResponse<SalesSummary>;
export type GetExpenseSummaryResponse = ApiResponse<ExpenseSummary>;
export type GetProfitMarginResponse = ApiResponse<ProfitMargin>;
