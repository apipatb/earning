import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { monitoringService } from '../services/monitoring.service';

const performanceQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional().default('day'),
});

/**
 * Get live monitoring metrics
 * GET /api/v1/monitoring/metrics
 */
export const getLiveMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const metrics = await monitoringService.getLiveMetrics(userId);
    res.json(metrics);
  } catch (error) {
    logger.error('Get live metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch live metrics' });
  }
};

/**
 * Get team member status
 * GET /api/v1/monitoring/team-status
 */
export const getTeamStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamStatus = await monitoringService.getTeamStatus(userId);
    res.json(teamStatus);
  } catch (error) {
    logger.error('Get team status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch team status' });
  }
};

/**
 * Get SLA status and tracking
 * GET /api/v1/monitoring/sla-status
 */
export const getSLAStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const slaStatus = await monitoringService.getSLAStatus(userId);
    res.json(slaStatus);
  } catch (error) {
    logger.error('Get SLA status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch SLA status' });
  }
};

/**
 * Get queue status
 * GET /api/v1/monitoring/queue
 */
export const getQueueStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const queueStatus = await monitoringService.getQueueStatus(userId);
    res.json(queueStatus);
  } catch (error) {
    logger.error('Get queue status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
};

/**
 * Get performance analytics
 * GET /api/v1/monitoring/performance
 */
export const getPerformanceMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { period } = performanceQuerySchema.parse(req.query);
    const performance = await monitoringService.getPerformanceMetrics(userId, period);
    res.json(performance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    logger.error('Get performance metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
};

/**
 * Get all monitoring data (combined endpoint)
 * GET /api/v1/monitoring/dashboard
 */
export const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const [metrics, teamStatus, slaStatus, queueStatus, performance] = await Promise.all([
      monitoringService.getLiveMetrics(userId),
      monitoringService.getTeamStatus(userId),
      monitoringService.getSLAStatus(userId),
      monitoringService.getQueueStatus(userId),
      monitoringService.getPerformanceMetrics(userId, 'day'),
    ]);

    res.json({
      metrics,
      teamStatus,
      slaStatus,
      queueStatus,
      performance,
    });
  } catch (error) {
    logger.error('Get dashboard data error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};
