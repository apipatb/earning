import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import healthService from '../services/health.service';
import { MetricType } from '@prisma/client';

const resolveAlertSchema = z.object({
  resolution: z.string().optional(),
});

const getMetricsSchema = z.object({
  metric: z.nativeEnum(MetricType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

/**
 * Basic health check endpoint (public)
 * GET /health
 */
export const basicHealthCheck = async (req: Request, res: Response) => {
  try {
    const report = await healthService.generateHealthReport();

    // Return simple health status
    res.status(report.overall === 'HEALTHY' ? 200 : 503).json({
      status: report.overall,
      timestamp: report.timestamp,
      services: report.services.map(s => ({
        name: s.name,
        status: s.status,
      })),
    });
  } catch (error) {
    logger.error('Basic health check error:', error instanceof Error ? error : new Error(String(error)));
    res.status(503).json({
      status: 'CRITICAL',
      error: 'Health check failed',
    });
  }
};

/**
 * Get detailed health metrics (authenticated)
 * GET /api/v1/health/metrics
 */
export const getDetailedMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const report = await healthService.generateHealthReport();

    res.json({
      overall: report.overall,
      timestamp: report.timestamp,
      metrics: {
        cpu: {
          value: report.metrics.cpu,
          unit: 'percent',
          status: report.metrics.cpu > 80 ? 'CRITICAL' : report.metrics.cpu > 60 ? 'WARNING' : 'HEALTHY',
          threshold: 80,
        },
        memory: {
          value: report.metrics.memory,
          unit: 'percent',
          status: report.metrics.memory > 85 ? 'CRITICAL' : report.metrics.memory > 70 ? 'WARNING' : 'HEALTHY',
          threshold: 85,
        },
        disk: {
          value: report.metrics.disk,
          unit: 'percent',
          status: report.metrics.disk > 90 ? 'CRITICAL' : report.metrics.disk > 75 ? 'WARNING' : 'HEALTHY',
          threshold: 90,
        },
      },
      services: report.services,
      alerts: report.alerts,
    });
  } catch (error) {
    logger.error('Get detailed metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch health metrics' });
  }
};

/**
 * Get service status
 * GET /api/v1/health/services
 */
export const getServiceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const statuses = await healthService.getServiceStatuses();
    res.json(statuses);
  } catch (error) {
    logger.error('Get service status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch service status' });
  }
};

/**
 * Get health alerts
 * GET /api/v1/health/alerts
 */
export const getHealthAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const activeOnly = req.query.active === 'true';

    if (activeOnly) {
      const alerts = await healthService.getActiveAlerts();
      res.json({
        alerts: alerts.map(alert => ({
          ...alert,
          details: alert.details ? JSON.parse(alert.details) : null,
        })),
        pagination: {
          page: 1,
          limit: alerts.length,
          total: alerts.length,
          totalPages: 1,
        },
      });
    } else {
      const result = await healthService.getAlerts(page, limit);
      res.json(result);
    }
  } catch (error) {
    logger.error('Get health alerts error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch health alerts' });
  }
};

/**
 * Resolve health alert
 * POST /api/v1/health/alerts/:id/resolve
 */
export const resolveHealthAlert = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const validation = resolveAlertSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validation.error });
    }

    const { resolution } = validation.data;

    const alert = await healthService.resolveAlert(id, userId, resolution);
    res.json({
      ...alert,
      details: alert.details ? JSON.parse(alert.details) : null,
    });
  } catch (error) {
    logger.error('Resolve health alert error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to resolve health alert' });
  }
};

/**
 * Get metrics history
 * GET /api/v1/health/metrics/history
 */
export const getMetricsHistory = async (req: AuthRequest, res: Response) => {
  try {
    const query: any = {
      metric: req.query.metric as MetricType | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    };

    const metrics = await healthService.getMetricsHistory(
      query.metric,
      query.startDate,
      query.endDate,
      query.limit
    );

    res.json(metrics);
  } catch (error) {
    logger.error('Get metrics history error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch metrics history' });
  }
};

/**
 * Get current system metrics
 * GET /api/v1/health/system
 */
export const getCurrentSystemMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await healthService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Get current system metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
};

/**
 * Trigger manual health check
 * POST /api/v1/health/check
 */
export const triggerHealthCheck = async (req: AuthRequest, res: Response) => {
  try {
    const report = await healthService.performPeriodicHealthCheck();
    res.json(report);
  } catch (error) {
    logger.error('Trigger health check error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to perform health check' });
  }
};

/**
 * Get service health details
 * GET /api/v1/health/services/:name
 */
export const getServiceHealthDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;

    let serviceHealth;

    switch (name.toLowerCase()) {
      case 'database':
        serviceHealth = await healthService.checkDatabaseHealth();
        break;
      case 'redis':
        serviceHealth = await healthService.checkRedisHealth();
        break;
      case 'queue':
      case 'bullmq':
        serviceHealth = await healthService.checkQueueHealth();
        break;
      case 'api':
        serviceHealth = await healthService.checkAPIHealth();
        break;
      default:
        return res.status(404).json({ error: 'Service not found' });
    }

    res.json(serviceHealth);
  } catch (error) {
    logger.error('Get service health details error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch service health details' });
  }
};
