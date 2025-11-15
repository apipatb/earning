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
  getPlatforms: () => api.get('/platforms').then(res => res.data),
  createPlatform: (data: any) => api.post('/platforms', data).then(res => res.data),
  updatePlatform: (id: string, data: any) => api.put(`/platforms/${id}`, data).then(res => res.data),
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
