import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface MonitoringMetrics {
  activeChats: number;
  pendingTickets: number;
  avgResponseTime: number;
  totalTicketsToday: number;
  resolvedToday: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
  timestamp: Date;
}

export interface TeamMemberStatus {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  activeChats: number;
  totalChatsToday: number;
  avgResponseTime: number;
  lastActivity: Date;
}

export interface SLAStatus {
  totalTickets: number;
  withinSLA: number;
  breachedSLA: number;
  atRisk: number;
  slaPercentage: number;
  avgResolutionTime: number;
  targetResolutionTime: number;
}

export interface QueueStatus {
  waiting: number;
  inProgress: number;
  avgWaitTime: number;
  longestWaitTime: number;
  queuedTickets: Array<{
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    waitTime: number;
    customerId: string;
    customerName: string;
  }>;
}

export interface PerformanceMetrics {
  period: string;
  totalChats: number;
  totalMessages: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  firstResponseTime: number;
  customerSatisfaction: number;
  chatsByHour: Array<{ hour: number; count: number }>;
  responseTimeByAgent: Array<{ agentId: string; agentName: string; avgTime: number }>;
  topIssues: Array<{ issue: string; count: number }>;
}

interface MonitoringData {
  metrics: MonitoringMetrics | null;
  teamStatus: TeamMemberStatus[];
  slaStatus: SLAStatus | null;
  queueStatus: QueueStatus | null;
  performance: PerformanceMetrics | null;
}

interface UseMonitoringReturn {
  data: MonitoringData;
  loading: boolean;
  error: string | null;
  connected: boolean;
  refetch: () => Promise<void>;
}

export const useMonitoring = (enableWebSocket: boolean = true): UseMonitoringReturn => {
  const [data, setData] = useState<MonitoringData>({
    metrics: null,
    teamStatus: [],
    slaStatus: null,
    queueStatus: null,
    performance: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/api/v1/monitoring/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch monitoring data';
      setError(message);
      console.error('Monitoring data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Cannot connect WebSocket: No authentication token');
      return;
    }

    try {
      const wsUrl = API_URL.replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsUrl}/ws/monitoring?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        console.log('Monitoring WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0;

        // Send ping every 25 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);

        ws.addEventListener('close', () => {
          clearInterval(pingInterval);
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'initial_data':
            case 'update':
              setData((prevData) => ({
                ...prevData,
                ...message.data,
              }));
              break;

            case 'metrics_update':
              setData((prevData) => ({
                ...prevData,
                metrics: message.data,
              }));
              break;

            case 'agent_status_change':
              setData((prevData) => ({
                ...prevData,
                teamStatus: prevData.teamStatus.map((member) =>
                  member.id === message.data.agentId
                    ? { ...member, status: message.data.status }
                    : member
                ),
              }));
              break;

            case 'queue_update':
              setData((prevData) => ({
                ...prevData,
                queueStatus: message.data,
              }));
              break;

            case 'pong':
              // Keepalive response
              break;

            default:
              console.warn('Unknown WebSocket message type:', message.type);
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('Monitoring WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('Monitoring WebSocket disconnected', event.code, event.reason);
        setConnected(false);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`Reconnecting WebSocket (attempt ${reconnectAttempts.current})...`);
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      setError('Failed to establish WebSocket connection');
    }
  }, [enableWebSocket]);

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Connect WebSocket if enabled
    if (enableWebSocket) {
      connectWebSocket();
    }

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [fetchData, connectWebSocket, enableWebSocket]);

  return {
    data,
    loading,
    error,
    connected,
    refetch: fetchData,
  };
};

export default useMonitoring;
