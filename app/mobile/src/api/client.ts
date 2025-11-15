import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface StoredRequest {
  method: string;
  url: string;
  data?: any;
  timestamp: number;
}

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private token: string | null = null;
  private offlineQueue: StoredRequest[] = [];
  private isOnline: boolean = true;

  constructor(baseURL: string = 'http://localhost:3001/api/v1') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeNetworkListener();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await this.clearToken();
          // Trigger logout event
        }
        return Promise.reject(error);
      }
    );
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline === false && this.isOnline === true) {
        // We just came back online, process queue
        this.processOfflineQueue();
      }
    });
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('auth_token');
    }
    return this.token;
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  async login(email: string, password: string) {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      if (response.data.token) {
        await this.setToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string, name: string) {
    try {
      const response = await this.client.post('/auth/register', {
        email,
        password,
        name,
      });
      if (response.data.token) {
        await this.setToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Earnings endpoints
  async getEarnings(filters?: any) {
    try {
      const response = await this.client.get('/earnings', { params: filters });
      await AsyncStorage.setItem('cached_earnings', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      if (!this.isOnline) {
        const cached = await AsyncStorage.getItem('cached_earnings');
        return cached ? JSON.parse(cached) : null;
      }
      throw error;
    }
  }

  async addEarning(data: any) {
    try {
      if (!this.isOnline) {
        // Queue the request
        this.offlineQueue.push({
          method: 'POST',
          url: '/earnings',
          data,
          timestamp: Date.now(),
        });
        // Store in local database
        await this.storeEarningLocally(data);
        return { success: true, offline: true };
      }

      const response = await this.client.post('/earnings', data);
      return response.data;
    } catch (error) {
      // Store offline if request fails
      await this.storeEarningLocally(data);
      throw error;
    }
  }

  async updateEarning(id: string, data: any) {
    try {
      const response = await this.client.put(`/earnings/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteEarning(id: string) {
    try {
      const response = await this.client.delete(`/earnings/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Platform endpoints
  async getPlatforms() {
    try {
      const response = await this.client.get('/platforms');
      await AsyncStorage.setItem('cached_platforms', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      if (!this.isOnline) {
        const cached = await AsyncStorage.getItem('cached_platforms');
        return cached ? JSON.parse(cached) : [];
      }
      throw error;
    }
  }

  async addPlatform(data: any) {
    try {
      const response = await this.client.post('/platforms', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Analytics endpoints
  async getAnalytics(period: string = 'month') {
    try {
      const response = await this.client.get('/analytics/summary', { params: { period } });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getDashboard() {
    try {
      const response = await this.client.get('/analytics/dashboard');
      await AsyncStorage.setItem('cached_dashboard', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      if (!this.isOnline) {
        const cached = await AsyncStorage.getItem('cached_dashboard');
        return cached ? JSON.parse(cached) : null;
      }
      throw error;
    }
  }

  // AI Insights endpoints
  async getAIInsights(period: string = 'month') {
    try {
      const response = await this.client.get('/ai/insights', { params: { period } });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getRecommendations() {
    try {
      const response = await this.client.get('/ai/recommendations');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Goals endpoints
  async getGoals() {
    try {
      const response = await this.client.get('/goals');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createGoal(data: any) {
    try {
      const response = await this.client.post('/goals', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // User profile endpoints
  async getProfile() {
    try {
      const response = await this.client.get('/user/profile');
      await AsyncStorage.setItem('cached_profile', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      if (!this.isOnline) {
        const cached = await AsyncStorage.getItem('cached_profile');
        return cached ? JSON.parse(cached) : null;
      }
      throw error;
    }
  }

  async updateProfile(data: any) {
    try {
      const response = await this.client.put('/user/profile', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Offline support
  private async storeEarningLocally(data: any) {
    try {
      const stored = await AsyncStorage.getItem('pending_earnings');
      const list = stored ? JSON.parse(stored) : [];
      list.push({ ...data, tempId: Date.now() });
      await AsyncStorage.setItem('pending_earnings', JSON.stringify(list));
    } catch (error) {
      console.error('Error storing earning locally:', error);
    }
  }

  private async processOfflineQueue() {
    try {
      const stored = await AsyncStorage.getItem('pending_earnings');
      if (!stored) return;

      const pendingEarnings = JSON.parse(stored);
      for (const earning of pendingEarnings) {
        try {
          const { tempId, ...data } = earning;
          await this.client.post('/earnings', data);
        } catch (error) {
          console.error('Error syncing earning:', error);
        }
      }

      // Clear pending earnings after successful sync
      await AsyncStorage.setItem('pending_earnings', JSON.stringify([]));
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }

  async getPendingEarnings() {
    try {
      const stored = await AsyncStorage.getItem('pending_earnings');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  // Generic request method
  async get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }
}

export default new APIClient();
