import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

// Type definitions for API requests
export interface PlatformData {
  name: string;
  category?: string;
  color?: string;
  expectedRate?: number;
  isActive?: boolean;
}

export interface EarningData {
  platformId: string;
  amount: number;
  hours?: number;
  date?: string;
  notes?: string;
}

export interface GoalData {
  title: string;
  targetAmount: number;
  deadline?: string;
  description?: string;
  currentAmount?: number;
  status?: 'active' | 'completed' | 'cancelled';
}

export interface ProductData {
  name: string;
  description?: string;
  price: number;
  category?: string;
  sku?: string;
  quantity: number;
  reorderPoint?: number;
}

export interface SaleData {
  productId: string;
  quantity: number;
  unitPrice: number;
  saleDate?: string;
  customer?: string;
  notes?: string;
  status?: string;
}

export interface CustomerData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface ExpenseData {
  category: string;
  description: string;
  amount: number;
  expenseDate?: string;
  vendor?: string;
  isTaxDeductible?: boolean;
  receiptUrl?: string;
}

export interface InvoiceData {
  customerId: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  invoiceDate?: string;
  dueDate?: string;
  paidDate?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue';
  paymentMethod?: string;
  notes?: string;
  terms?: string;
}

export interface InventoryLogData {
  productId: string;
  quantityChange: number;
  type: 'inbound' | 'outbound' | 'adjustment';
  notes?: string;
}

export interface InventoryUpdateData {
  quantity: number;
}

export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API methods
export const authAPI = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

export const platformsAPI = {
  getAll: () => api.get('/platforms').then(res => res.data),
  getPlatforms: () => api.get('/platforms').then(res => res.data),
  create: (data: PlatformData) => api.post('/platforms', data).then(res => res.data),
  createPlatform: (data: PlatformData) => api.post('/platforms', data).then(res => res.data),
  update: (id: string, data: Partial<PlatformData>) => api.put(`/platforms/${id}`, data).then(res => res.data),
  updatePlatform: (id: string, data: Partial<PlatformData>) => api.put(`/platforms/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/platforms/${id}`).then(res => res.data),
  deletePlatform: (id: string) => api.delete(`/platforms/${id}`).then(res => res.data),
};

export const earningsAPI = {
  getEarnings: (period?: string) => api.get('/earnings', { params: { period } }).then(res => res.data),
  createEarning: (data: EarningData) => api.post('/earnings', data).then(res => res.data),
  updateEarning: (id: string, data: Partial<EarningData>) => api.put(`/earnings/${id}`, data).then(res => res.data),
  deleteEarning: (id: string) => api.delete(`/earnings/${id}`).then(res => res.data),
};

export const analyticsAPI = {
  getAnalytics: (period?: string) => api.get('/analytics', { params: { period } }).then(res => res.data),
};

export const goalsAPI = {
  getGoals: (status?: string) => api.get('/goals', { params: { status } }).then(res => res.data),
  getGoal: (id: string) => api.get(`/goals/${id}`).then(res => res.data),
  createGoal: (data: GoalData) => api.post('/goals', data).then(res => res.data),
  updateGoal: (id: string, data: Partial<GoalData>) => api.put(`/goals/${id}`, data).then(res => res.data),
  deleteGoal: (id: string) => api.delete(`/goals/${id}`).then(res => res.data),
  updateGoalProgress: (id: string) => api.post(`/goals/${id}/update-progress`).then(res => res.data),
};

export const productsAPI = {
  getAll: (isActive?: boolean) => api.get('/products', { params: { isActive } }).then(res => res.data),
  create: (data: ProductData) => api.post('/products', data).then(res => res.data),
  update: (id: string, data: Partial<ProductData>) => api.put(`/products/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/products/${id}`).then(res => res.data),
};

export const salesAPI = {
  getAll: (params?: QueryParams) => api.get('/sales', { params }).then(res => res.data),
  create: (data: SaleData) => api.post('/sales', data).then(res => res.data),
  update: (id: string, data: Partial<SaleData>) => api.put(`/sales/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/sales/${id}`).then(res => res.data),
  getSummary: (period?: string) => api.get('/sales/summary', { params: { period } }).then(res => res.data),
};

export const inventoryAPI = {
  getAll: (params?: QueryParams) => api.get('/inventory', { params }).then(res => res.data),
  getHistory: (params?: QueryParams) => api.get('/inventory/history', { params }).then(res => res.data),
  getLowStockAlerts: () => api.get('/inventory/alerts/low-stock').then(res => res.data),
  logChange: (data: InventoryLogData) => api.post('/inventory/log', data).then(res => res.data),
  updateStock: (id: string, data: InventoryUpdateData) => api.put(`/inventory/${id}/stock`, data).then(res => res.data),
};

export const customersAPI = {
  getAll: (params?: QueryParams) => api.get('/customers', { params }).then(res => res.data),
  getDetails: (id: string) => api.get(`/customers/${id}`).then(res => res.data),
  getTopCustomers: (limit?: number) => api.get('/customers/top', { params: { limit } }).then(res => res.data),
  create: (data: CustomerData) => api.post('/customers', data).then(res => res.data),
  update: (id: string, data: Partial<CustomerData>) => api.put(`/customers/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/customers/${id}`).then(res => res.data),
};

export const expensesAPI = {
  getAll: (params?: QueryParams) => api.get('/expenses', { params }).then(res => res.data),
  getSummary: (period?: string) => api.get('/expenses/summary', { params: { period } }).then(res => res.data),
  getProfitMargin: (period?: string) => api.get('/expenses/profit/margin', { params: { period } }).then(res => res.data),
  create: (data: ExpenseData) => api.post('/expenses', data).then(res => res.data),
  update: (id: string, data: Partial<ExpenseData>) => api.put(`/expenses/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/expenses/${id}`).then(res => res.data),
};

export const invoicesAPI = {
  getAll: (params?: QueryParams) => api.get('/invoices', { params }).then(res => res.data),
  getSummary: () => api.get('/invoices/summary').then(res => res.data),
  getOverdue: () => api.get('/invoices/overdue').then(res => res.data),
  create: (data: InvoiceData) => api.post('/invoices', data).then(res => res.data),
  update: (id: string, data: Partial<InvoiceData>) => api.put(`/invoices/${id}`, data).then(res => res.data),
  markPaid: (id: string, data?: Record<string, unknown>) => api.patch(`/invoices/${id}/mark-paid`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/invoices/${id}`).then(res => res.data),
};
