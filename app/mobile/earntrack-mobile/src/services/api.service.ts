import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_URL } from '../constants/config';
import { StorageService } from './storage.service';
import { AuthResponse, AppConfig, Ticket, DashboardMetrics, Message } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use(
      async (config) => {
        const token = await StorageService.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await StorageService.clearAuth();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string, deviceId?: string, deviceName?: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/mobile-login', {
      email,
      password,
      deviceId,
      deviceName,
    });
    return response.data;
  }

  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  }

  async handleDeepLink(token: string): Promise<AuthResponse> {
    const response = await this.client.get<AuthResponse>(`/auth/deep-link/${token}`);
    return response.data;
  }

  // Mobile config
  async getMobileConfig(): Promise<AppConfig> {
    const response = await this.client.get<AppConfig>('/mobile/config');
    return response.data;
  }

  // Device registration
  async registerDevice(deviceId: string, deviceName: string, pushToken: string, platform: 'ios' | 'android'): Promise<void> {
    await this.client.post('/mobile/device', {
      deviceId,
      deviceName,
      pushToken,
      platform,
    });
  }

  // Tickets
  async getTickets(status?: string): Promise<Ticket[]> {
    const response = await this.client.get<Ticket[]>('/tickets', {
      params: { status },
    });
    return response.data;
  }

  async getTicket(id: string): Promise<Ticket> {
    const response = await this.client.get<Ticket>(`/tickets/${id}`);
    return response.data;
  }

  async createTicket(data: Partial<Ticket>): Promise<Ticket> {
    const response = await this.client.post<Ticket>('/tickets', data);
    return response.data;
  }

  async updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
    const response = await this.client.patch<Ticket>(`/tickets/${id}`, data);
    return response.data;
  }

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await this.client.get<DashboardMetrics>('/analytics/dashboard');
    return response.data;
  }

  // Chat messages
  async getChatMessages(ticketId?: string): Promise<Message[]> {
    const response = await this.client.get<Message[]>('/chat/messages', {
      params: { ticketId },
    });
    return response.data;
  }

  async sendChatMessage(content: string, ticketId?: string): Promise<Message> {
    const response = await this.client.post<Message>('/chat/messages', {
      content,
      ticketId,
    });
    return response.data;
  }

  // File upload
  async uploadFile(uri: string, type: string): Promise<{ url: string }> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload';

    formData.append('file', {
      uri,
      type,
      name: filename,
    } as any);

    const response = await this.client.post<{ url: string }>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export default new ApiService();
