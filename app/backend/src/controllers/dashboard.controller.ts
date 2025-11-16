import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { dashboardService, DashboardConfig, WidgetConfig } from '../services/dashboard.service';

const createDashboardSchema = z.object({
  name: z.string().min(1).max(255),
  layout: z.any().optional(),
  isDefault: z.boolean().optional(),
});

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  layout: z.any().optional(),
  isDefault: z.boolean().optional(),
});

const createWidgetSchema = z.object({
  type: z.enum(['CHART', 'KPI', 'TABLE', 'TEXT', 'GAUGE', 'HEATMAP', 'TIME_SERIES']),
  title: z.string().min(1).max(255),
  config: z.any(),
  positionX: z.number().int().min(0),
  positionY: z.number().int().min(0),
  sizeW: z.number().int().min(1).max(12),
  sizeH: z.number().int().min(1),
  dataSource: z.string().min(1).max(255),
  refreshInterval: z.number().int().positive().optional(),
});

const updateWidgetSchema = z.object({
  type: z.enum(['CHART', 'KPI', 'TABLE', 'TEXT', 'GAUGE', 'HEATMAP', 'TIME_SERIES']).optional(),
  title: z.string().min(1).max(255).optional(),
  config: z.any().optional(),
  positionX: z.number().int().min(0).optional(),
  positionY: z.number().int().min(0).optional(),
  sizeW: z.number().int().min(1).max(12).optional(),
  sizeH: z.number().int().min(1).optional(),
  dataSource: z.string().min(1).max(255).optional(),
  refreshInterval: z.number().int().positive().optional(),
});

/**
 * Get all dashboards for the authenticated user
 * GET /api/v1/dashboards
 */
export const getDashboards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dashboards = await dashboardService.getDashboards(userId);
    res.json(dashboards);
  } catch (error) {
    logger.error('Get dashboards error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
};

/**
 * Get a single dashboard
 * GET /api/v1/dashboards/:id
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const dashboard = await dashboardService.getDashboard(userId, id);
    res.json(dashboard);
  } catch (error) {
    if (error instanceof Error && error.message === 'Dashboard not found') {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    logger.error('Get dashboard error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

/**
 * Create a new dashboard
 * POST /api/v1/dashboards
 */
export const createDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createDashboardSchema.parse(req.body);

    const dashboard = await dashboardService.createDashboard(userId, data as DashboardConfig);
    res.status(201).json(dashboard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid dashboard data', details: error.errors });
    }
    logger.error('Create dashboard error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
};

/**
 * Update dashboard
 * PUT /api/v1/dashboards/:id
 */
export const updateDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateDashboardSchema.parse(req.body);

    const dashboard = await dashboardService.updateDashboard(userId, id, data);
    res.json(dashboard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid dashboard data', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Dashboard not found') {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    logger.error('Update dashboard error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
};

/**
 * Delete dashboard
 * DELETE /api/v1/dashboards/:id
 */
export const deleteDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await dashboardService.deleteDashboard(userId, id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Dashboard not found') {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    logger.error('Delete dashboard error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
};

/**
 * Add widget to dashboard
 * POST /api/v1/dashboards/:id/widgets
 */
export const addWidget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = createWidgetSchema.parse(req.body);

    const widget = await dashboardService.addWidget(userId, id, data as WidgetConfig);
    res.status(201).json(widget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid widget data', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Dashboard not found') {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    logger.error('Add widget error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to add widget' });
  }
};

/**
 * Update widget
 * PUT /api/v1/dashboards/:id/widgets/:widgetId
 */
export const updateWidget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id, widgetId } = req.params;
    const data = updateWidgetSchema.parse(req.body);

    const widget = await dashboardService.updateWidget(userId, id, widgetId, data);
    res.json(widget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid widget data', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Dashboard not found') {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    logger.error('Update widget error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to update widget' });
  }
};

/**
 * Delete widget
 * DELETE /api/v1/dashboards/:id/widgets/:widgetId
 */
export const deleteWidget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id, widgetId } = req.params;

    await dashboardService.deleteWidget(userId, id, widgetId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Dashboard not found') {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    logger.error('Delete widget error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete widget' });
  }
};

/**
 * Get widget data
 * GET /api/v1/dashboards/:id/widgets/:widgetId
 */
export const getWidgetData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgetId } = req.params;

    const widgetData = await dashboardService.getWidgetData(userId, widgetId);
    res.json(widgetData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Widget not found') {
      return res.status(404).json({ error: 'Widget not found' });
    }
    logger.error('Get widget data error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch widget data' });
  }
};

/**
 * Get widget templates
 * GET /api/v1/dashboard/templates
 */
export const getWidgetTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const templates = await dashboardService.getWidgetTemplates(category);
    res.json(templates);
  } catch (error) {
    logger.error('Get widget templates error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch widget templates' });
  }
};

/**
 * Create preset dashboards
 * POST /api/v1/dashboards/presets
 */
export const createPresetDashboards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await dashboardService.createPresetDashboards(userId);
    res.status(201).json({ message: 'Preset dashboards created successfully' });
  } catch (error) {
    logger.error('Create preset dashboards error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create preset dashboards' });
  }
};
