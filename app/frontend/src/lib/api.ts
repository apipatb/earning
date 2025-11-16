import axios, { AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { getErrorMessage } from './error';

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

export interface InventoryEditData {
  quantity?: number;
  reorderPoint?: number;
}

export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

// Response entity types
export interface Platform extends PlatformData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    total_earnings: number;
    total_hours: number;
    avg_hourly_rate: number;
  };
}

export interface Earning extends EarningData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal extends GoalData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product extends ProductData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Sale extends SaleData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends CustomerData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense extends ExpenseData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice extends InvoiceData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLog extends InventoryLogData {
  id: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ExpenseSummary {
  summary: {
    total_expenses: number;
    expense_count: number;
    tax_deductible: number;
    non_deductible: number;
  };
}

export interface ProfitMargin {
  financials: {
    revenue: number;
    expenses: number;
    profit: number;
    profit_margin_percent: string;
  };
}

export interface AnalyticsSummary {
  total_earnings: number;
  total_hours: number;
  avg_hourly_rate: number;
  by_platform?: Array<{
    platform: Platform;
    earnings: number;
    percentage: number;
  }>;
}

export interface InvoiceSummary {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  overdue_amount: number;
}

export interface SalesSummary {
  summary: {
    total_sales: number;
    total_quantity: number;
    total_revenue: number;
    avg_sale: number;
  };
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceFormData extends InvoiceData {
  lineItems: InvoiceLineItem[];
}

// Workflow types
export interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'update_record' | 'call_webhook';
  config: Record<string, any>;
}

export interface WorkflowData {
  name: string;
  trigger: 'EARNING_CREATED' | 'INVOICE_PAID' | 'LOW_STOCK' | 'CUSTOMER_CREATED' | 'GOAL_COMPLETED';
  actions: WorkflowAction[];
  isActive: boolean;
}

export interface Workflow extends WorkflowData {
  id: string;
  userId: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  executedAt: string;
  result: any;
  error?: string;
  createdAt: string;
}

// Email types
export interface EmailTemplateData {
  name: string;
  subject: string;
  htmlBody: string;
  variables?: string[];
}

export interface EmailTemplate extends EmailTemplateData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSequenceStep {
  delay: number;
  templateId?: string;
  subject: string;
  body: string;
}

export interface EmailSequenceData {
  name: string;
  steps: EmailSequenceStep[];
  trigger: string;
  isActive: boolean;
}

export interface EmailSequence extends EmailSequenceData {
  id: string;
  userId: string;
  emailsSent: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  sequenceId?: string;
  sequenceName?: string;
  recipientEmail: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'BOUNCED';
  sentAt: string;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor - Add auth token and log requests
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (import.meta.env.DEV) {
      console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and log responses
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.debug(`[API] Response ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const errorMessage = getErrorMessage(error);

    // Log error details
    console.error(`[API] Error ${status}: ${errorMessage}`, {
      url: error.config?.url,
      method: error.config?.method,
      status,
      data: error.response?.data,
    });

    // Handle authentication errors
    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    // Handle forbidden errors
    if (status === 403) {
      return Promise.reject(new Error('You do not have permission to perform this action.'));
    }

    // Handle server errors
    if (status && status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }

    // Return the original error with better message
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

export const workflowsAPI = {
  getAll: () => api.get('/workflows').then(res => res.data),
  getById: (id: string) => api.get(`/workflows/${id}`).then(res => res.data),
  create: (data: WorkflowData) => api.post('/workflows', data).then(res => res.data),
  update: (id: string, data: Partial<WorkflowData>) => api.put(`/workflows/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/workflows/${id}`).then(res => res.data),
  execute: (id: string, data?: Record<string, any>) => api.post(`/workflows/${id}/execute`, { data }).then(res => res.data),
  getExecutions: (id: string, params?: QueryParams) => api.get(`/workflows/${id}/executions`, { params }).then(res => res.data),
};

export const emailsAPI = {
  // Templates
  getTemplates: () => api.get('/emails/templates').then(res => res.data),
  createTemplate: (data: EmailTemplateData) => api.post('/emails/templates', data).then(res => res.data),
  updateTemplate: (id: string, data: Partial<EmailTemplateData>) => api.put(`/emails/templates/${id}`, data).then(res => res.data),
  deleteTemplate: (id: string) => api.delete(`/emails/templates/${id}`).then(res => res.data),

  // Sequences
  getSequences: () => api.get('/emails/sequences').then(res => res.data),
  createSequence: (data: EmailSequenceData) => api.post('/emails/sequences', data).then(res => res.data),
  updateSequence: (id: string, data: Partial<EmailSequenceData>) => api.put(`/emails/sequences/${id}`, data).then(res => res.data),
  deleteSequence: (id: string) => api.delete(`/emails/sequences/${id}`).then(res => res.data),

  // Logs and Stats
  getLogs: (params?: QueryParams) => api.get('/emails/logs', { params }).then(res => res.data),
  getStats: () => api.get('/emails/stats').then(res => res.data),
};

// ============================================
// SMS Types
// ============================================

export interface SMSTemplateData {
  name: string;
  content: string;
  variables?: string[];
}

export interface SMSTemplate extends SMSTemplateData {
  id: string;
  userId: string;
  campaignCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SMSCampaignData {
  name: string;
  templateId: string;
  recipients: string[];
  scheduledFor?: string;
}

export interface SMSCampaign {
  id: string;
  userId: string;
  name: string;
  template: {
    id: string;
    name: string;
    content?: string;
  } | null;
  recipients?: string[];
  recipientCount: number;
  messageCount: number;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELLED";
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SMSLog {
  id: string;
  phoneNumber: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED" | "DELIVERED";
  messageId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface PhoneContact {
  id: string;
  phoneNumber: string;
  name: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  isOptedIn: boolean;
  optedOutAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SMS API
// ============================================

export const smsAPI = {
  // Templates
  getTemplates: () => api.get("/sms/templates").then(res => res.data),
  getTemplate: (id: string) => api.get(`/sms/templates/${id}`).then(res => res.data),
  createTemplate: (data: SMSTemplateData) => api.post("/sms/templates", data).then(res => res.data),
  updateTemplate: (id: string, data: Partial<SMSTemplateData>) => api.put(`/sms/templates/${id}`, data).then(res => res.data),
  deleteTemplate: (id: string) => api.delete(`/sms/templates/${id}`).then(res => res.data),

  // Campaigns
  getCampaigns: (params?: QueryParams) => api.get("/sms/campaigns", { params }).then(res => res.data),
  getCampaign: (id: string) => api.get(`/sms/campaigns/${id}`).then(res => res.data),
  createCampaign: (data: SMSCampaignData) => api.post("/sms/campaigns", data).then(res => res.data),
  sendCampaign: (id: string) => api.post(`/sms/campaigns/${id}/send`).then(res => res.data),
  getCampaignLogs: (id: string, params?: QueryParams) => api.get(`/sms/campaigns/${id}/logs`, { params }).then(res => res.data),

  // Contacts
  getContacts: (params?: QueryParams) => api.get("/sms/contacts", { params }).then(res => res.data),
  addContact: (data: { phoneNumber: string; name?: string; notes?: string }) => api.post("/sms/contacts", data).then(res => res.data),
  updateContact: (id: string, data: Partial<{ phoneNumber: string; name?: string; notes?: string }>) => api.put(`/sms/contacts/${id}`, data).then(res => res.data),
  deleteContact: (id: string) => api.delete(`/sms/contacts/${id}`).then(res => res.data),

  // Unsubscribe
  unsubscribe: (phoneNumber: string) => api.post("/sms/unsubscribe", { phoneNumber }).then(res => res.data),
};

// ============================================
// Funnel Analysis API
// ============================================

export const funnelAPI = {
  // Funnel Management
  getFunnels: () => api.get('/funnels').then(res => res.data),
  getFunnel: (id: string) => api.get(`/funnels/${id}`).then(res => res.data),
  createFunnel: (data: {
    name: string;
    description?: string;
    steps: { name: string; order: number; conditions?: Record<string, any> }[];
    trackingEnabled?: boolean;
    metadata?: Record<string, any>;
  }) => api.post('/funnels', data).then(res => res.data),
  updateFunnel: (id: string, data: Partial<{
    name: string;
    description?: string;
    steps: { name: string; order: number; conditions?: Record<string, any> }[];
    trackingEnabled?: boolean;
    metadata?: Record<string, any>;
  }>) => api.put(`/funnels/${id}`, data).then(res => res.data),
  deleteFunnel: (id: string) => api.delete(`/funnels/${id}`).then(res => res.data),
  createPresetFunnels: () => api.post('/funnels/presets').then(res => res.data),

  // Event Tracking
  trackEvent: (data: {
    funnelId: string;
    sessionId: string;
    step: string;
    stepNumber: number;
    metadata?: Record<string, any>;
  }) => api.post('/funnels/events', data).then(res => res.data),

  // Metrics & Analysis
  getFunnelMetrics: (id: string, period?: string) => api.get(`/funnels/${id}/metrics`, { params: { period } }).then(res => res.data),
  calculateMetrics: (id: string, periodStart: string, periodEnd: string) =>
    api.post(`/funnels/${id}/metrics/calculate`, { periodStart, periodEnd }).then(res => res.data),
  getFunnelAnalysis: (id: string, periodStart?: string, periodEnd?: string) =>
    api.get(`/funnels/${id}/analysis`, { params: { periodStart, periodEnd } }).then(res => res.data),
  getCohortAnalysis: (id: string, periodStart: string, periodEnd: string, cohortBy: 'day' | 'week' | 'month' = 'day') =>
    api.get(`/funnels/${id}/cohort-analysis`, { params: { periodStart, periodEnd, cohortBy } }).then(res => res.data),
  getSegmentAnalysis: (id: string, segmentBy: string, periodStart?: string, periodEnd?: string) =>
    api.get(`/funnels/${id}/segment-analysis`, { params: { segmentBy, periodStart, periodEnd } }).then(res => res.data),
};
