import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { funnelService, CreateFunnelInput, FunnelEventInput } from '../services/funnel.service';

const funnelStepSchema = z.object({
  name: z.string().min(1).max(255),
  order: z.number().int().min(0),
  conditions: z.record(z.any()).optional(),
});

const createFunnelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  steps: z.array(funnelStepSchema).min(2, 'Funnel must have at least 2 steps'),
  trackingEnabled: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateFunnelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  steps: z.array(funnelStepSchema).min(2).optional(),
  trackingEnabled: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

const trackEventSchema = z.object({
  funnelId: z.string().uuid(),
  sessionId: z.string().min(1).max(255),
  step: z.string().min(1).max(255),
  stepNumber: z.number().int().min(0),
  metadata: z.record(z.any()).optional(),
});

const calculateMetricsSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

/**
 * Get all funnels for the authenticated user
 * GET /api/v1/funnels
 */
export const getFunnels = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const funnels = await funnelService.getFunnels(userId);
    res.json(funnels);
  } catch (error) {
    logger.error('Get funnels error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch funnels' });
  }
};

/**
 * Get a single funnel
 * GET /api/v1/funnels/:id
 */
export const getFunnel = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const funnel = await funnelService.getFunnel(userId, id);
    res.json(funnel);
  } catch (error) {
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Get funnel error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch funnel' });
  }
};

/**
 * Create a new funnel
 * POST /api/v1/funnels
 */
export const createFunnel = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createFunnelSchema.parse(req.body);

    // Validate step order is sequential
    const stepOrders = data.steps.map(s => s.order);
    const expectedOrders = Array.from({ length: data.steps.length }, (_, i) => i);
    if (JSON.stringify(stepOrders.sort()) !== JSON.stringify(expectedOrders)) {
      return res.status(400).json({
        error: 'Invalid step order',
        details: 'Steps must have sequential order starting from 0',
      });
    }

    const funnel = await funnelService.createFunnel(userId, data as CreateFunnelInput);
    res.status(201).json(funnel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid funnel data', details: error.errors });
    }
    logger.error('Create funnel error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create funnel' });
  }
};

/**
 * Update funnel
 * PUT /api/v1/funnels/:id
 */
export const updateFunnel = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateFunnelSchema.parse(req.body);

    // Validate step order if steps are being updated
    if (data.steps) {
      const stepOrders = data.steps.map(s => s.order);
      const expectedOrders = Array.from({ length: data.steps.length }, (_, i) => i);
      if (JSON.stringify(stepOrders.sort()) !== JSON.stringify(expectedOrders)) {
        return res.status(400).json({
          error: 'Invalid step order',
          details: 'Steps must have sequential order starting from 0',
        });
      }
    }

    const funnel = await funnelService.updateFunnel(userId, id, data);
    res.json(funnel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid funnel data', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Update funnel error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to update funnel' });
  }
};

/**
 * Delete funnel
 * DELETE /api/v1/funnels/:id
 */
export const deleteFunnel = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await funnelService.deleteFunnel(userId, id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Delete funnel error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete funnel' });
  }
};

/**
 * Track a funnel event
 * POST /api/v1/funnels/events
 */
export const trackEvent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = trackEventSchema.parse(req.body);

    const event = await funnelService.trackEvent(userId, data as FunnelEventInput);
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid event data', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Funnel not found or tracking disabled') {
      return res.status(404).json({ error: 'Funnel not found or tracking disabled' });
    }
    logger.error('Track event error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to track event' });
  }
};

/**
 * Get funnel metrics
 * GET /api/v1/funnels/:id/metrics
 */
export const getFunnelMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const period = req.query.period as string | undefined;

    const metrics = await funnelService.getFunnelMetrics(userId, id, period);
    res.json(metrics);
  } catch (error) {
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Get funnel metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch funnel metrics' });
  }
};

/**
 * Calculate and store funnel metrics
 * POST /api/v1/funnels/:id/metrics/calculate
 */
export const calculateMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = calculateMetricsSchema.parse(req.body);

    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);

    await funnelService.calculateMetrics(userId, id, periodStart, periodEnd);
    res.json({ message: 'Metrics calculated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Calculate metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to calculate metrics' });
  }
};

/**
 * Get comprehensive funnel analysis
 * GET /api/v1/funnels/:id/analysis
 */
export const getFunnelAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    let periodStart: Date | undefined;
    let periodEnd: Date | undefined;

    if (req.query.periodStart) {
      periodStart = new Date(req.query.periodStart as string);
    }
    if (req.query.periodEnd) {
      periodEnd = new Date(req.query.periodEnd as string);
    }

    const analysis = await funnelService.getFunnelAnalysis(userId, id, periodStart, periodEnd);
    res.json(analysis);
  } catch (error) {
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Get funnel analysis error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch funnel analysis' });
  }
};

/**
 * Get cohort analysis for funnel
 * GET /api/v1/funnels/:id/cohort-analysis
 */
export const getCohortAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const periodStart = req.query.periodStart
      ? new Date(req.query.periodStart as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const periodEnd = req.query.periodEnd
      ? new Date(req.query.periodEnd as string)
      : new Date();

    const cohortBy = (req.query.cohortBy as 'day' | 'week' | 'month') || 'day';

    const cohortData = await funnelService.getCohortAnalysis(
      userId,
      id,
      periodStart,
      periodEnd,
      cohortBy
    );

    res.json(cohortData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Get cohort analysis error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch cohort analysis' });
  }
};

/**
 * Get segment analysis for funnel
 * GET /api/v1/funnels/:id/segment-analysis
 */
export const getSegmentAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const segmentBy = req.query.segmentBy as string;
    if (!segmentBy) {
      return res.status(400).json({ error: 'segmentBy query parameter is required' });
    }

    let periodStart: Date | undefined;
    let periodEnd: Date | undefined;

    if (req.query.periodStart) {
      periodStart = new Date(req.query.periodStart as string);
    }
    if (req.query.periodEnd) {
      periodEnd = new Date(req.query.periodEnd as string);
    }

    const segmentData = await funnelService.getSegmentAnalysis(
      userId,
      id,
      segmentBy,
      periodStart,
      periodEnd
    );

    res.json(segmentData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Funnel not found') {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    logger.error('Get segment analysis error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch segment analysis' });
  }
};

/**
 * Create preset funnels
 * POST /api/v1/funnels/presets
 */
export const createPresetFunnels = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await funnelService.createPresetFunnels(userId);
    res.status(201).json({ message: 'Preset funnels created successfully' });
  } catch (error) {
    logger.error('Create preset funnels error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create preset funnels' });
  }
};
