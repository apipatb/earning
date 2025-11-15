import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

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
  getAll: () => api.get('/platforms'),
  create: (data: any) => api.post('/platforms', data),
  update: (id: string, data: any) => api.put(`/platforms/${id}`, data),
  delete: (id: string) => api.delete(`/platforms/${id}`),
};

export const earningsAPI = {
  getAll: (params?: any) => api.get('/earnings', { params }),
  create: (data: any) => api.post('/earnings', data),
  update: (id: string, data: any) => api.put(`/earnings/${id}`, data),
  delete: (id: string) => api.delete(`/earnings/${id}`),
};

export const analyticsAPI = {
  getSummary: (params?: any) => api.get('/analytics/summary', { params }),
};
