import prisma from '../lib/prisma';
import { MetricType, HealthStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import si from 'systeminformation';
import { Prisma } from '@prisma/client';

// Redis and BullMQ imports (if available)
let redis: any = null;
let Queue: any = null;

try {
  const ioredis = require('ioredis');
  redis = new ioredis(process.env.REDIS_URL || 'redis://localhost:6379');
} catch (error) {
  logger.warn('Redis not available for health monitoring');
}

try {
  const bullmq = require('bullmq');
  Queue = bullmq.Queue;
} catch (error) {
  logger.warn('BullMQ not available for health monitoring');
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  timestamp: Date;
}

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  responseTime?: number;
  message?: string;
  details?: any;
}

interface HealthReport {
  overall: HealthStatus;
  metrics: SystemMetrics;
  services: ServiceHealth[];
  alerts: number;
  timestamp: Date;
}

class HealthService {
  private readonly CPU_THRESHOLD = 80; // 80% CPU usage
  private readonly MEMORY_THRESHOLD = 85; // 85% memory usage
  private readonly DISK_THRESHOLD = 90; // 90% disk usage
  private readonly API_LATENCY_THRESHOLD = 1000; // 1000ms
  private readonly RESPONSE_TIME_THRESHOLD = 500; // 500ms

  /**
   * Get current system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [cpuLoad, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
      ]);

      const cpuUsage = cpuLoad.currentLoad;
      const memoryUsage = (mem.used / mem.total) * 100;
      const diskUsage = disk.length > 0 ? disk[0].use : 0;

      return {
        cpu: Number(cpuUsage.toFixed(2)),
        memory: Number(memoryUsage.toFixed(2)),
        disk: Number(diskUsage.toFixed(2)),
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Get system metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Record system metric to database
   */
  async recordMetric(
    metric: MetricType,
    value: number,
    threshold?: number,
    unit: string = 'percent',
    details?: any
  ) {
    try {
      await prisma.systemMetric.create({
        data: {
          metric,
          value: new Prisma.Decimal(value),
          threshold: threshold ? new Prisma.Decimal(threshold) : null,
          unit,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      logger.error('Record metric error:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      // Check active connections
      const result: any = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active';
      `;
      const activeConnections = parseInt(result[0]?.count || '0');

      await this.recordMetric(
        MetricType.DATABASE_CONNECTIONS,
        activeConnections,
        undefined,
        'connections',
        { activeConnections }
      );

      return {
        name: 'Database',
        status: responseTime < this.RESPONSE_TIME_THRESHOLD ? HealthStatus.HEALTHY : HealthStatus.WARNING,
        responseTime,
        details: {
          activeConnections,
          version: await this.getDatabaseVersion(),
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Database health check error:', error instanceof Error ? error : new Error(String(error)));
      return {
        name: 'Database',
        status: HealthStatus.CRITICAL,
        responseTime,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Get database version
   */
  private async getDatabaseVersion(): Promise<string> {
    try {
      const result: any = await prisma.$queryRaw`SELECT version();`;
      return result[0]?.version || 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Check Redis cache health
   */
  async checkRedisHealth(): Promise<ServiceHealth> {
    if (!redis) {
      return {
        name: 'Redis',
        status: HealthStatus.UNKNOWN,
        message: 'Redis not configured',
      };
    }

    const startTime = Date.now();
    try {
      await redis.ping();
      const responseTime = Date.now() - startTime;

      // Get Redis info
      const info = await redis.info('stats');
      const stats = this.parseRedisInfo(info);

      // Calculate cache hit rate
      const hits = parseInt(stats.keyspace_hits || '0');
      const misses = parseInt(stats.keyspace_misses || '0');
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 100;

      await this.recordMetric(
        MetricType.CACHE_HIT_RATE,
        Number(hitRate.toFixed(2)),
        undefined,
        'percent',
        { hits, misses }
      );

      return {
        name: 'Redis',
        status: responseTime < this.RESPONSE_TIME_THRESHOLD ? HealthStatus.HEALTHY : HealthStatus.WARNING,
        responseTime,
        details: {
          hitRate: Number(hitRate.toFixed(2)),
          connectedClients: stats.connected_clients,
          usedMemory: stats.used_memory_human,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Redis health check error:', error instanceof Error ? error : new Error(String(error)));
      return {
        name: 'Redis',
        status: HealthStatus.CRITICAL,
        responseTime,
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const stats: Record<string, string> = {};
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    }
    return stats;
  }

  /**
   * Check BullMQ queue health
   */
  async checkQueueHealth(): Promise<ServiceHealth> {
    if (!Queue) {
      return {
        name: 'BullMQ',
        status: HealthStatus.UNKNOWN,
        message: 'BullMQ not configured',
      };
    }

    const startTime = Date.now();
    try {
      // Check default queue (you can customize this based on your queue names)
      const queue = new Queue('default', {
        connection: redis || { host: 'localhost', port: 6379 },
      });

      const [waiting, active, delayed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getDelayedCount(),
        queue.getFailedCount(),
      ]);

      const responseTime = Date.now() - startTime;
      const totalJobs = waiting + active + delayed;

      await this.recordMetric(
        MetricType.QUEUE_DEPTH,
        totalJobs,
        undefined,
        'jobs',
        { waiting, active, delayed, failed }
      );

      // Determine status based on queue depth and failed jobs
      let status = HealthStatus.HEALTHY;
      if (totalJobs > 1000 || failed > 100) {
        status = HealthStatus.WARNING;
      }
      if (totalJobs > 5000 || failed > 500) {
        status = HealthStatus.CRITICAL;
      }

      await queue.close();

      return {
        name: 'BullMQ',
        status,
        responseTime,
        details: {
          waiting,
          active,
          delayed,
          failed,
          total: totalJobs,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Queue health check error:', error instanceof Error ? error : new Error(String(error)));
      return {
        name: 'BullMQ',
        status: HealthStatus.CRITICAL,
        responseTime,
        message: error instanceof Error ? error.message : 'Queue connection failed',
      };
    }
  }

  /**
   * Check API response time
   */
  async checkAPIHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Simple health check - just verify the service is responding
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      await this.recordMetric(
        MetricType.RESPONSE_TIME,
        responseTime,
        this.RESPONSE_TIME_THRESHOLD,
        'ms'
      );

      return {
        name: 'API',
        status: responseTime < this.RESPONSE_TIME_THRESHOLD ? HealthStatus.HEALTHY : HealthStatus.WARNING,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        name: 'API',
        status: HealthStatus.CRITICAL,
        responseTime,
        message: error instanceof Error ? error.message : 'API health check failed',
      };
    }
  }

  /**
   * Check all services and generate comprehensive health report
   */
  async generateHealthReport(): Promise<HealthReport> {
    try {
      const [metrics, ...services] = await Promise.all([
        this.getSystemMetrics(),
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkQueueHealth(),
        this.checkAPIHealth(),
      ]);

      // Record system metrics
      await Promise.all([
        this.recordMetric(MetricType.CPU, metrics.cpu, this.CPU_THRESHOLD),
        this.recordMetric(MetricType.MEMORY, metrics.memory, this.MEMORY_THRESHOLD),
        this.recordMetric(MetricType.DISK, metrics.disk, this.DISK_THRESHOLD),
      ]);

      // Determine overall health status
      const criticalServices = services.filter(s => s.status === HealthStatus.CRITICAL);
      const warningServices = services.filter(s => s.status === HealthStatus.WARNING);

      let overall = HealthStatus.HEALTHY;
      if (criticalServices.length > 0 || metrics.cpu > this.CPU_THRESHOLD || metrics.memory > this.MEMORY_THRESHOLD) {
        overall = HealthStatus.CRITICAL;
      } else if (warningServices.length > 0 || metrics.cpu > this.CPU_THRESHOLD * 0.8 || metrics.memory > this.MEMORY_THRESHOLD * 0.8) {
        overall = HealthStatus.WARNING;
      }

      // Get active alerts count
      const activeAlerts = await prisma.healthAlert.count({
        where: {
          resolvedAt: null,
        },
      });

      return {
        overall,
        metrics,
        services,
        alerts: activeAlerts,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Generate health report error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create health alert
   */
  async createAlert(
    service: string,
    status: HealthStatus,
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
    message: string,
    details?: any
  ) {
    try {
      // Check if there's already an active alert for this service
      const existingAlert = await prisma.healthAlert.findFirst({
        where: {
          service,
          status,
          resolvedAt: null,
        },
      });

      if (existingAlert) {
        // Update existing alert
        await prisma.healthAlert.update({
          where: { id: existingAlert.id },
          data: {
            message,
            details: details ? JSON.stringify(details) : null,
            updatedAt: new Date(),
          },
        });
        return existingAlert;
      }

      // Create new alert
      return await prisma.healthAlert.create({
        data: {
          service,
          status,
          severity,
          message,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      logger.error('Create alert error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Resolve health alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution?: string) {
    try {
      return await prisma.healthAlert.update({
        where: { id: alertId },
        data: {
          resolvedAt: new Date(),
          resolvedBy,
          resolution,
        },
      });
    } catch (error) {
      logger.error('Resolve alert error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    try {
      return await prisma.healthAlert.findMany({
        where: {
          resolvedAt: null,
        },
        orderBy: [
          { triggeredAt: 'desc' },
        ],
      });
    } catch (error) {
      logger.error('Get active alerts error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all alerts with pagination
   */
  async getAlerts(page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;

      const [alerts, total] = await Promise.all([
        prisma.healthAlert.findMany({
          skip,
          take: limit,
          orderBy: [
            { triggeredAt: 'desc' },
          ],
        }),
        prisma.healthAlert.count(),
      ]);

      return {
        alerts: alerts.map(alert => ({
          ...alert,
          details: alert.details ? JSON.parse(alert.details) : null,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get alerts error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get metrics history
   */
  async getMetricsHistory(
    metric?: MetricType,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ) {
    try {
      const where: any = {};

      if (metric) {
        where.metric = metric;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      return await prisma.systemMetric.findMany({
        where,
        orderBy: [
          { timestamp: 'desc' },
        ],
        take: limit,
      });
    } catch (error) {
      logger.error('Get metrics history error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update or create service status
   */
  async updateServiceStatus(
    name: string,
    type: string,
    status: HealthStatus,
    responseTime?: number,
    metadata?: any,
    endpoint?: string,
    version?: string
  ) {
    try {
      const existing = await prisma.serviceStatus.findUnique({
        where: { name },
      });

      if (existing) {
        // Calculate uptime (simplified version)
        const uptime = status === HealthStatus.HEALTHY ? 100 : existing.uptime;
        const errorCount = status === HealthStatus.CRITICAL ? existing.errorCount + 1 : 0;

        return await prisma.serviceStatus.update({
          where: { name },
          data: {
            status,
            responseTime,
            lastCheck: new Date(),
            uptime: new Prisma.Decimal(uptime),
            errorCount,
            metadata: metadata ? JSON.stringify(metadata) : existing.metadata,
            endpoint,
            version,
          },
        });
      } else {
        return await prisma.serviceStatus.create({
          data: {
            name,
            type,
            status,
            responseTime,
            lastCheck: new Date(),
            uptime: new Prisma.Decimal(status === HealthStatus.HEALTHY ? 100 : 0),
            errorCount: status === HealthStatus.CRITICAL ? 1 : 0,
            metadata: metadata ? JSON.stringify(metadata) : null,
            endpoint,
            version,
          },
        });
      }
    } catch (error) {
      logger.error('Update service status error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all service statuses
   */
  async getServiceStatuses() {
    try {
      const statuses = await prisma.serviceStatus.findMany({
        orderBy: [
          { status: 'asc' },
          { lastCheck: 'desc' },
        ],
      });

      return statuses.map(status => ({
        ...status,
        metadata: status.metadata ? JSON.parse(status.metadata) : null,
      }));
    } catch (error) {
      logger.error('Get service statuses error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Perform periodic health checks
   * This should be called by cron jobs
   */
  async performPeriodicHealthCheck() {
    try {
      logger.info('Starting periodic health check...');

      const report = await this.generateHealthReport();

      // Update service statuses
      for (const service of report.services) {
        await this.updateServiceStatus(
          service.name,
          service.name.toLowerCase(),
          service.status,
          service.responseTime,
          service.details
        );

        // Create alerts for critical or warning services
        if (service.status === HealthStatus.CRITICAL) {
          await this.createAlert(
            service.name,
            service.status,
            'CRITICAL',
            service.message || `${service.name} is in critical state`,
            service.details
          );
        } else if (service.status === HealthStatus.WARNING) {
          await this.createAlert(
            service.name,
            service.status,
            'WARNING',
            service.message || `${service.name} performance degraded`,
            service.details
          );
        }
      }

      // Check system metrics thresholds
      if (report.metrics.cpu > this.CPU_THRESHOLD) {
        await this.createAlert(
          'System',
          HealthStatus.CRITICAL,
          'CRITICAL',
          `High CPU usage: ${report.metrics.cpu}%`,
          { cpu: report.metrics.cpu, threshold: this.CPU_THRESHOLD }
        );
      }

      if (report.metrics.memory > this.MEMORY_THRESHOLD) {
        await this.createAlert(
          'System',
          HealthStatus.CRITICAL,
          'CRITICAL',
          `High memory usage: ${report.metrics.memory}%`,
          { memory: report.metrics.memory, threshold: this.MEMORY_THRESHOLD }
        );
      }

      if (report.metrics.disk > this.DISK_THRESHOLD) {
        await this.createAlert(
          'System',
          HealthStatus.WARNING,
          'WARNING',
          `High disk usage: ${report.metrics.disk}%`,
          { disk: report.metrics.disk, threshold: this.DISK_THRESHOLD }
        );
      }

      logger.info('Periodic health check completed', { overall: report.overall });
      return report;
    } catch (error) {
      logger.error('Periodic health check error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Clean up old metrics
   * Keep only last 7 days of detailed metrics
   */
  async cleanupOldMetrics() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const deleted = await prisma.systemMetric.deleteMany({
        where: {
          timestamp: {
            lt: sevenDaysAgo,
          },
        },
      });

      logger.info(`Cleaned up ${deleted.count} old metrics`);
      return deleted.count;
    } catch (error) {
      logger.error('Cleanup old metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

export default new HealthService();
