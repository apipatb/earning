import { Request, Response } from 'express';

/**
 * Custom Express Request with authenticated user
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userId?: string;
  };
}

/**
 * User types
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Omit<User, 'passwordHash'> {
  id: string;
  email: string;
}

/**
 * Product types
 */
export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  sku: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithStats extends Product {
  stats: {
    total_sales: number;
    total_revenue: number;
    total_quantity: number;
  };
}

/**
 * Sale types
 */
export interface Sale {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  saleDate: Date;
  customer: string | null;
  notes: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleWithProduct extends Sale {
  product: {
    id: string;
    name: string;
    price: number;
    category: string | null;
  };
}

export interface SalesFormattedResponse extends SaleWithProduct {
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

/**
 * Platform types
 */
export interface PlatformStats {
  total_earnings: number;
  total_hours: number;
  avg_hourly_rate: number;
}

export interface Platform {
  id: string;
  name: string;
  color: string | null;
}

export interface PlatformBreakdown {
  platform: Platform;
  earnings: number;
  hours: number;
  hourly_rate: number;
  percentage: number;
}

/**
 * Analytics types
 */
export interface DailyBreakdown {
  date: string;
  earnings: number;
  hours: number;
}

export interface AnalyticsSummary {
  period: string;
  start_date: string;
  end_date: string;
  total_earnings: number;
  total_hours: number;
  avg_hourly_rate: number;
  by_platform: PlatformBreakdown[];
  daily_breakdown: DailyBreakdown[];
}

export interface SalesSummary {
  period: string;
  summary: {
    total_sales: number;
    total_quantity: number;
    total_revenue: number;
    average_sale: number;
  };
  by_product: Array<{
    productId: string;
    productName: string;
    sales: number;
    quantity: number;
    revenue: number;
  }>;
  start_date: Date;
  end_date: Date;
}

/**
 * Pagination types
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Common API response types
 */
export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

export interface ErrorDetails {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  error: string;
  message: string;
  details?: ErrorDetails[] | Record<string, unknown>;
  timestamp: Date;
}

/**
 * Request/Response handler types
 */
export type ControllerHandler = (req: AuthRequest, res: Response) => Promise<void>;
export type PublicControllerHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Query filter types
 */
export interface SalesFilter {
  startDate?: string;
  endDate?: string;
  productId?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

export interface ProductFilter {
  isActive?: string;
}

/**
 * Expense types
 */
export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string | null;
  date: Date;
  receipt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Goal types
 */
export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory types
 */
export interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice types
 */
export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  customerId: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: Date;
  issueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Customer types
 */
export interface Customer {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request validation error types
 */
export interface ValidationErrorResponse {
  error: string;
  message: string;
  details?: Array<{
    path: string[];
    message: string;
    code: string;
  }>;
}
