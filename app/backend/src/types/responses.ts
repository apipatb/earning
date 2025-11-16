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
