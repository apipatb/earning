import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger';
import { monitoringService } from '../services/monitoring.service';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface MonitoringMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: 'metrics' | 'team' | 'sla' | 'queue' | 'all';
}

export class MonitoringWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<AuthenticatedWebSocket>;
  private updateInterval: NodeJS.Timeout | null;
  private pingInterval: NodeJS.Timeout | null;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.clients = new Set();
    this.updateInterval = null;
    this.pingInterval = null;

    this.setupWebSocketServer();
    this.startMonitoring();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      logger.info('New monitoring WebSocket connection');

      // Authenticate the connection
      const token = this.extractTokenFromRequest(req);
      if (!token || !this.authenticateToken(ws, token)) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Add client to set
      ws.isAlive = true;
      this.clients.add(ws);

      // Handle incoming messages
      ws.on('message', (message: string) => {
        try {
          const data: MonitoringMessage = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message parse error:', error instanceof Error ? error : new Error(String(error)));
        }
      });

      // Handle pong messages for keepalive
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle disconnect
      ws.on('close', () => {
        logger.info('Monitoring WebSocket disconnected');
        this.clients.delete(ws);
      });

      // Send initial data
      this.sendInitialData(ws);
    });
  }

  private extractTokenFromRequest(req: IncomingMessage): string | null {
    const url = req.url || '';
    const tokenMatch = url.match(/token=([^&]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  private authenticateToken(ws: AuthenticatedWebSocket, token: string): boolean {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as { id: string };
      ws.userId = decoded.id;
      return true;
    } catch (error) {
      logger.error('WebSocket authentication error:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: MonitoringMessage) {
    switch (message.type) {
      case 'subscribe':
        logger.info(`WebSocket subscribed to channel: ${message.channel}`);
        break;
      case 'unsubscribe':
        logger.info(`WebSocket unsubscribed from channel: ${message.channel}`);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async sendInitialData(ws: AuthenticatedWebSocket) {
    try {
      const userId = ws.userId;
      const [metrics, teamStatus, slaStatus, queueStatus] = await Promise.all([
        monitoringService.getLiveMetrics(userId),
        monitoringService.getTeamStatus(userId),
        monitoringService.getSLAStatus(userId),
        monitoringService.getQueueStatus(userId),
      ]);

      ws.send(JSON.stringify({
        type: 'initial_data',
        data: {
          metrics,
          teamStatus,
          slaStatus,
          queueStatus,
        },
      }));
    } catch (error) {
      logger.error('Send initial data error:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private startMonitoring() {
    // Send updates every 5 seconds
    this.updateInterval = setInterval(() => {
      this.broadcastUpdates();
    }, 5000);

    // Ping clients every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    logger.info('Monitoring WebSocket server started');
  }

  private async broadcastUpdates() {
    if (this.clients.size === 0) {
      return;
    }

    try {
      // Get unique user IDs
      const userIds = Array.from(this.clients)
        .map(ws => ws.userId)
        .filter((id): id is string => !!id);

      // Fetch updated data for each user
      for (const userId of userIds) {
        const [metrics, teamStatus, slaStatus, queueStatus] = await Promise.all([
          monitoringService.getLiveMetrics(userId),
          monitoringService.getTeamStatus(userId),
          monitoringService.getSLAStatus(userId),
          monitoringService.getQueueStatus(userId),
        ]);

        // Send to all clients with this userId
        this.clients.forEach((ws) => {
          if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'update',
              data: {
                metrics,
                teamStatus,
                slaStatus,
                queueStatus,
              },
              timestamp: new Date(),
            }));
          }
        });
      }
    } catch (error) {
      logger.error('Broadcast updates error:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public broadcastMetricsUpdate(userId?: string) {
    this.clients.forEach(async (ws) => {
      if (ws.readyState === WebSocket.OPEN && (!userId || ws.userId === userId)) {
        try {
          const metrics = await monitoringService.getLiveMetrics(ws.userId);
          ws.send(JSON.stringify({
            type: 'metrics_update',
            data: metrics,
            timestamp: new Date(),
          }));
        } catch (error) {
          logger.error('Broadcast metrics update error:', error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  }

  public broadcastAgentStatusChange(agentId: string, status: string) {
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'agent_status_change',
          data: {
            agentId,
            status,
            timestamp: new Date(),
          },
        }));
      }
    });
  }

  public broadcastQueueUpdate(userId?: string) {
    this.clients.forEach(async (ws) => {
      if (ws.readyState === WebSocket.OPEN && (!userId || ws.userId === userId)) {
        try {
          const queueStatus = await monitoringService.getQueueStatus(ws.userId);
          ws.send(JSON.stringify({
            type: 'queue_update',
            data: queueStatus,
            timestamp: new Date(),
          }));
        } catch (error) {
          logger.error('Broadcast queue update error:', error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  }

  public stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });

    this.clients.clear();
    logger.info('Monitoring WebSocket server stopped');
  }
}

// Export singleton instance creator
let monitoringWSServer: MonitoringWebSocketServer | null = null;

export function createMonitoringWebSocketServer(wss: WebSocketServer): MonitoringWebSocketServer {
  if (!monitoringWSServer) {
    monitoringWSServer = new MonitoringWebSocketServer(wss);
  }
  return monitoringWSServer;
}

export function getMonitoringWebSocketServer(): MonitoringWebSocketServer | null {
  return monitoringWSServer;
}
