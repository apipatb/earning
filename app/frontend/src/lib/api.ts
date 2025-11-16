import axios from 'axios';
import setupApiInterceptors from './api-interceptors';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup comprehensive request/response interceptors
setupApiInterceptors(api);

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
  create: (data: any) => api.post('/platforms', data).then(res => res.data),
  createPlatform: (data: any) => api.post('/platforms', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/platforms/${id}`, data).then(res => res.data),
  updatePlatform: (id: string, data: any) => api.put(`/platforms/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/platforms/${id}`).then(res => res.data),
  deletePlatform: (id: string) => api.delete(`/platforms/${id}`).then(res => res.data),
};

export const earningsAPI = {
  getEarnings: (period?: string) => api.get('/earnings', { params: { period } }).then(res => res.data),
  createEarning: (data: any) => api.post('/earnings', data).then(res => res.data),
  updateEarning: (id: string, data: any) => api.put(`/earnings/${id}`, data).then(res => res.data),
  deleteEarning: (id: string) => api.delete(`/earnings/${id}`).then(res => res.data),
};

export const analyticsAPI = {
  getAnalytics: (period?: string) => api.get('/analytics', { params: { period } }).then(res => res.data),
};

export const goalsAPI = {
  getGoals: (status?: string) => api.get('/goals', { params: { status } }).then(res => res.data),
  getGoal: (id: string) => api.get(`/goals/${id}`).then(res => res.data),
  createGoal: (data: any) => api.post('/goals', data).then(res => res.data),
  updateGoal: (id: string, data: any) => api.put(`/goals/${id}`, data).then(res => res.data),
  deleteGoal: (id: string) => api.delete(`/goals/${id}`).then(res => res.data),
  updateGoalProgress: (id: string) => api.post(`/goals/${id}/update-progress`).then(res => res.data),
};

export const productsAPI = {
  getAll: (isActive?: boolean) => api.get('/products', { params: { isActive } }).then(res => res.data),
  create: (data: any) => api.post('/products', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/products/${id}`).then(res => res.data),
};

export const salesAPI = {
  getAll: (params?: any) => api.get('/sales', { params }).then(res => res.data),
  create: (data: any) => api.post('/sales', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/sales/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/sales/${id}`).then(res => res.data),
  getSummary: (period?: string) => api.get('/sales/summary', { params: { period } }).then(res => res.data),
};

export const inventoryAPI = {
  getAll: (params?: any) => api.get('/inventory', { params }).then(res => res.data),
  getHistory: (params?: any) => api.get('/inventory/history', { params }).then(res => res.data),
  getLowStockAlerts: () => api.get('/inventory/alerts/low-stock').then(res => res.data),
  logChange: (data: any) => api.post('/inventory/log', data).then(res => res.data),
  updateStock: (id: string, data: any) => api.put(`/inventory/${id}/stock`, data).then(res => res.data),
};

export const customersAPI = {
  getAll: (params?: any) => api.get('/customers', { params }).then(res => res.data),
  getDetails: (id: string) => api.get(`/customers/${id}`).then(res => res.data),
  getTopCustomers: (limit?: number) => api.get('/customers/top', { params: { limit } }).then(res => res.data),
  create: (data: any) => api.post('/customers', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/customers/${id}`).then(res => res.data),
};

export const expensesAPI = {
  getAll: (params?: any) => api.get('/expenses', { params }).then(res => res.data),
  getSummary: (period?: string) => api.get('/expenses/summary', { params: { period } }).then(res => res.data),
  getProfitMargin: (period?: string) => api.get('/expenses/profit/margin', { params: { period } }).then(res => res.data),
  create: (data: any) => api.post('/expenses', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/expenses/${id}`).then(res => res.data),
};

export const invoicesAPI = {
  getAll: (params?: any) => api.get('/invoices', { params }).then(res => res.data),
  getSummary: () => api.get('/invoices/summary').then(res => res.data),
  getOverdue: () => api.get('/invoices/overdue').then(res => res.data),
  create: (data: any) => api.post('/invoices', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data).then(res => res.data),
  markPaid: (id: string, data?: any) => api.patch(`/invoices/${id}/mark-paid`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/invoices/${id}`).then(res => res.data),
};
