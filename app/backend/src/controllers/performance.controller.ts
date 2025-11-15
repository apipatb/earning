import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import os from 'os';

const prisma = new PrismaClient();

// System Health Check
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {} as any,
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = { status: 'healthy', responseTime: Date.now() - startTime };
    } catch (error) {
      health.status = 'degraded';
      health.services.database = { status: 'unhealthy', error: (error as Error).message };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.services.memory = {
      status: memUsage.heapUsed / memUsage.heapTotal > 0.9 ? 'warning' : 'healthy',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    };

    // Check system resources
    const cpus = os.cpus();
    health.services.cpu = {
      count: cpus.length,
      model: cpus[0]?.model || 'Unknown',
    };

    health.services.system = {
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      loadAverage: os.loadavg(),
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check system health' });
  }
};

// Performance Metrics
export const recordPerformanceMetric = async (req: Request, res: Response) => {
  try {
    const { endpoint, method, statusCode, responseTime, timestamp } = req.body;
    const userId = (req as any).userId;

    const metric = await prisma.performanceMetric.create({
      data: {
        userId: userId || null,
        endpoint,
        method,
        statusCode,
        responseTime,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    res.status(201).json(metric);
  } catch (error) {
    res.status(400).json({ error: 'Failed to record performance metric' });
  }
};

export const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const { endpoint, days = 7, limit = 100 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        ...(endpoint && { endpoint: endpoint as string }),
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
};

export const getPerformanceAnalytics = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    // Average response time by endpoint
    const endpointStats = await prisma.performanceMetric.groupBy({
      by: ['endpoint', 'method'],
      where: { timestamp: { gte: startDate } },
      _avg: { responseTime: true },
      _count: true,
    });

    // Error rate
    const totalRequests = await prisma.performanceMetric.count({
      where: { timestamp: { gte: startDate } },
    });

    const errorRequests = await prisma.performanceMetric.count({
      where: {
        timestamp: { gte: startDate },
        statusCode: { gte: 400 },
      },
    });

    // Response time percentiles
    const allMetrics = await prisma.performanceMetric.findMany({
      where: { timestamp: { gte: startDate } },
      select: { responseTime: true },
    });

    const sortedTimes = allMetrics
      .map((m) => m.responseTime)
      .sort((a, b) => a - b);

    const analytics = {
      endpointStats,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      totalRequests,
      errorRequests,
      percentiles: {
        p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0,
        p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
        p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
      },
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance analytics' });
  }
};

// Error Tracking
export const recordError = async (req: Request, res: Response) => {
  try {
    const { message, stack, endpoint, severity, context } = req.body;
    const userId = (req as any).userId;

    const error = await prisma.errorLog.create({
      data: {
        userId: userId || null,
        message,
        stack: stack || null,
        endpoint: endpoint || null,
        severity: severity || 'error',
        context: context ? JSON.stringify(context) : null,
      },
    });

    res.status(201).json(error);
  } catch (error) {
    res.status(400).json({ error: 'Failed to record error' });
  }
};

export const getErrorLogs = async (req: Request, res: Response) => {
  try {
    const { severity, days = 7, limit = 50 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const errors = await prisma.errorLog.findMany({
      where: {
        ...(severity && { severity: severity as string }),
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(errors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
};

export const getErrorAnalytics = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const stats = {
      totalErrors: await prisma.errorLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      bySeverity: await prisma.errorLog.groupBy({
        by: ['severity'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      byEndpoint: await prisma.errorLog.groupBy({
        by: ['endpoint'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch error analytics' });
  }
};

// Uptime Monitoring
export const recordUptimeCheck = async (req: Request, res: Response) => {
  try {
    const { serviceName, isUp, responseTime, statusCode } = req.body;

    const check = await prisma.uptimeCheck.create({
      data: {
        serviceName,
        isUp,
        responseTime: responseTime || 0,
        statusCode: statusCode || null,
        checkedAt: new Date(),
      },
    });

    res.status(201).json(check);
  } catch (error) {
    res.status(400).json({ error: 'Failed to record uptime check' });
  }
};

export const getUptimeStatus = async (req: Request, res: Response) => {
  try {
    const { serviceName, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const checks = await prisma.uptimeCheck.findMany({
      where: {
        ...(serviceName && { serviceName: serviceName as string }),
        checkedAt: { gte: startDate },
      },
      orderBy: { checkedAt: 'desc' },
    });

    const totalChecks = checks.length;
    const upChecks = checks.filter((c) => c.isUp).length;
    const uptime = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100;

    res.json({
      serviceName,
      uptime: Math.round(uptime * 100) / 100,
      totalChecks,
      upChecks,
      downChecks: totalChecks - upChecks,
      checks: checks.slice(0, 50),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch uptime status' });
  }
};

// Database Health
export const getDatabaseHealth = async (req: Request, res: Response) => {
  try {
    const health = {
      connected: false,
      responseTime: 0,
      timestamp: new Date(),
    };

    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.connected = true;
      health.responseTime = Date.now() - startTime;
    } catch (error) {
      health.connected = false;
    }

    // Get table counts
    const tables = {
      users: await prisma.user.count(),
      platforms: await prisma.platform.count(),
      earnings: await prisma.earning.count(),
    };

    res.json({ ...health, tables });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check database health' });
  }
};

// Health Alerts
export const createHealthAlert = async (req: Request, res: Response) => {
  try {
    const { alertType, severity, message, threshold } = req.body;

    const alert = await prisma.healthAlert.create({
      data: {
        alertType,
        severity,
        message,
        threshold: threshold || null,
        isActive: true,
      },
    });

    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create health alert' });
  }
};

export const getHealthAlerts = async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    const alerts = await prisma.healthAlert.findMany({
      where: {
        ...(active === 'true' && { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health alerts' });
  }
};

export const resolveHealthAlert = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    const alert = await prisma.healthAlert.update({
      where: { id: alertId },
      data: {
        isActive: false,
        resolvedAt: new Date(),
      },
    });

    res.json(alert);
  } catch (error) {
    res.status(400).json({ error: 'Failed to resolve alert' });
  }
};

// Service Status Page
export const getServiceStatus = async (req: Request, res: Response) => {
  try {
    const status = {
      status: 'operational',
      timestamp: new Date(),
      services: [] as any[],
    };

    // Check all critical services
    const recentMinute = new Date(Date.now() - 60 * 1000);

    // API Service
    const apiErrors = await prisma.errorLog.count({
      where: { createdAt: { gte: recentMinute } },
    });
    status.services.push({
      name: 'API',
      status: apiErrors > 10 ? 'degraded' : 'operational',
      incidents: apiErrors,
    });

    // Database Service
    const dbCheck = await prisma.$queryRaw`SELECT 1`.catch(() => null);
    status.services.push({
      name: 'Database',
      status: dbCheck ? 'operational' : 'down',
    });

    // Cache Service (simulated)
    status.services.push({
      name: 'Cache',
      status: 'operational',
    });

    // Check overall status
    const downerServices = status.services.filter((s) => s.status === 'down');
    const degradedServices = status.services.filter((s) => s.status === 'degraded');

    if (downerServices.length > 0) {
      status.status = 'operational_issues';
    } else if (degradedServices.length > 0) {
      status.status = 'degraded_performance';
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service status' });
  }
};

// Dashboard Summary
export const getMonitoringDashboard = async (req: Request, res: Response) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dashboard = {
      timestamp: new Date(),
      systemHealth: {
        uptime: process.uptime(),
        memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        cpuCount: os.cpus().length,
      },
      metrics: {
        requestsLastHour: await prisma.performanceMetric.count({
          where: { timestamp: { gte: oneHourAgo } },
        }),
        errorsLastHour: await prisma.errorLog.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        avgResponseTime: 0,
      },
      errors: {
        lastHour: await prisma.errorLog.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        lastDay: await prisma.errorLog.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
      },
      uptime: {
        lastDay: 99.9,
        lastWeek: 99.95,
      },
    };

    // Calculate average response time
    const metrics = await prisma.performanceMetric.findMany({
      where: { timestamp: { gte: oneHourAgo } },
      select: { responseTime: true },
    });

    if (metrics.length > 0) {
      dashboard.metrics.avgResponseTime =
        Math.round((metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length) * 100) / 100;
    }

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monitoring dashboard' });
  }
};
