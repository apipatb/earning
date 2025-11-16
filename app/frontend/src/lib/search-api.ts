/**
 * API functions for Elasticsearch-based search
 */

import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with auth interceptor
const createApiClient = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
  });

  instance.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
};

const api = createApiClient();

// Types
export interface SearchHighlight {
  [key: string]: string[];
}

export interface SearchResultItem<T = any> {
  id: string;
  score: number;
  highlight?: SearchHighlight;
  [key: string]: any;
}

export interface SearchResponse<T = any> {
  total: number;
  hits?: SearchResultItem<T>[];
  tickets?: SearchResultItem<T>[];
  messages?: SearchResultItem<T>[];
  customers?: SearchResultItem<T>[];
  documents?: SearchResultItem<T>[];
  facets?: Record<string, any>;
  pagination?: {
    from: number;
    size: number;
    total: number;
  };
}

export interface GlobalSearchResponse {
  tickets: {
    total: number;
    hits: SearchResultItem[];
  };
  chat_messages: {
    total: number;
    hits: SearchResultItem[];
  };
  customers: {
    total: number;
    hits: SearchResultItem[];
  };
  documents: {
    total: number;
    hits: SearchResultItem[];
  };
}

export interface SearchOptions {
  q?: string;
  from?: number;
  size?: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  slaBreach?: boolean;
  dateFrom?: string;
  dateTo?: string;
  facets?: string[];
  roomId?: string;
  senderId?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
  minPurchases?: number;
  maxPurchases?: number;
  contentType?: string;
  tags?: string[];
}

export interface SuggestionOptions {
  q: string;
  field: string;
  index: 'tickets' | 'chat_messages' | 'customers' | 'documents';
  size?: number;
}

/**
 * Global search across all indices
 */
export const globalSearch = async (
  query: string,
  from: number = 0,
  size: number = 20
): Promise<GlobalSearchResponse> => {
  const response = await api.get('/search', {
    params: { q: query, from, size },
  });
  return response.data.data.results;
};

/**
 * Search tickets
 */
export const searchTickets = async (options: SearchOptions): Promise<SearchResponse> => {
  const response = await api.get('/search/tickets', { params: options });
  return response.data.data;
};

/**
 * Search messages
 */
export const searchMessages = async (options: SearchOptions): Promise<SearchResponse> => {
  const response = await api.get('/search/messages', { params: options });
  return response.data.data;
};

/**
 * Search customers
 */
export const searchCustomers = async (options: SearchOptions): Promise<SearchResponse> => {
  const response = await api.get('/search/customers', { params: options });
  return response.data.data;
};

/**
 * Search documents
 */
export const searchDocuments = async (options: SearchOptions): Promise<SearchResponse> => {
  const response = await api.get('/search/documents', { params: options });
  return response.data.data;
};

/**
 * Get autocomplete suggestions
 */
export const getSuggestions = async (options: SuggestionOptions): Promise<string[]> => {
  const response = await api.get('/search/suggestions', { params: options });
  return response.data.data.suggestions;
};

/**
 * Get search analytics
 */
export const getSearchAnalytics = async (index: string): Promise<any> => {
  const response = await api.get('/search/analytics', { params: { index } });
  return response.data.data.analytics;
};

/**
 * Check Elasticsearch health
 */
export const checkSearchHealth = async (): Promise<any> => {
  const response = await api.get('/search/health');
  return response.data.data;
};
