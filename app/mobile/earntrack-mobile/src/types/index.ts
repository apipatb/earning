export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  customerId?: string;
  assignedTo?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
}

export interface DashboardMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  customerSatisfaction: number;
}

export interface AppConfig {
  apiVersion: string;
  minAppVersion: string;
  features: {
    biometricAuth: boolean;
    pushNotifications: boolean;
    offlineMode: boolean;
    cameraUpload: boolean;
    chatSupport: boolean;
    ticketManagement: boolean;
  };
  endpoints: {
    api: string;
    websocket: string;
  };
  settings: {
    maxFileSize: number;
    allowedFileTypes: string[];
    offlineSyncInterval: number;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Tickets: undefined;
  Chat: undefined;
  Profile: undefined;
};
