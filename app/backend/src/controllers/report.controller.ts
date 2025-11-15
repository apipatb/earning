import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Custom Reports
export const createReport = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      reportType,
      filters,
      metrics,
      format,
      schedule,
    } = req.body;
    const userId = (req as any).userId;

    const report = await prisma.customReport.create({
      data: {
        userId,
        name,
        description: description || null,
        reportType: reportType || 'custom', // sales, financial, project, team, analytics, custom
        filters: JSON.stringify(filters || {}),
        metrics: JSON.stringify(metrics || []),
        format: format || 'pdf', // pdf, excel, csv, json
        schedule: schedule || 'manual', // manual, daily, weekly, monthly
        isActive: true,
        createdAt: new Date(),
      },
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create report' });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { reportType, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (reportType) where.reportType = reportType;

    const reports = await prisma.customReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const getReportById = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).userId;

    const report = await prisma.customReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

export const updateReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { name, description, filters, metrics, format, schedule, isActive } = req.body;
    const userId = (req as any).userId;

    await prisma.customReport.updateMany({
      where: { id: reportId, userId },
      data: {
        name,
        description,
        filters: filters ? JSON.stringify(filters) : undefined,
        metrics: metrics ? JSON.stringify(metrics) : undefined,
        format,
        schedule,
        isActive,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update report' });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).userId;

    await prisma.customReport.deleteMany({
      where: { id: reportId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete report' });
  }
};

// Report Generation & Execution
export const generateReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).userId;

    const report = await prisma.customReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const execution = await prisma.reportExecution.create({
      data: {
        userId,
        reportId,
        status: 'completed',
        generatedAt: new Date(),
        format: report.format,
        data: JSON.stringify({}),
        createdAt: new Date(),
      },
    });

    res.status(201).json(execution);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate report' });
  }
};

export const getReportExecutions = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.query;
    const userId = (req as any).userId;

    const executions = await prisma.reportExecution.findMany({
      where: {
        userId,
        reportId: reportId as string,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};

// Report Templates
export const createReportTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, reportType, defaultFilters, defaultMetrics } = req.body;
    const userId = (req as any).userId;

    const template = await prisma.reportTemplate.create({
      data: {
        userId,
        name,
        description: description || null,
        reportType,
        defaultFilters: JSON.stringify(defaultFilters || {}),
        defaultMetrics: JSON.stringify(defaultMetrics || []),
        createdAt: new Date(),
      },
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create template' });
  }
};

export const getReportTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const templates = await prisma.reportTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// Dashboard Customization
export const createDashboard = async (req: Request, res: Response) => {
  try {
    const { name, description, layout, widgets } = req.body;
    const userId = (req as any).userId;

    const dashboard = await prisma.dashboard.create({
      data: {
        userId,
        name,
        description: description || null,
        layout: layout || 'grid',
        widgets: JSON.stringify(widgets || []),
        isDefault: false,
        createdAt: new Date(),
      },
    });

    res.status(201).json(dashboard);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create dashboard' });
  }
};

export const getDashboards = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const dashboards = await prisma.dashboard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
};

export const getDashboardById = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const userId = (req as any).userId;

    const dashboard = await prisma.dashboard.findFirst({
      where: { id: dashboardId, userId },
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

export const updateDashboard = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { name, description, layout, widgets, isDefault } = req.body;
    const userId = (req as any).userId;

    await prisma.dashboard.updateMany({
      where: { id: dashboardId, userId },
      data: {
        name,
        description,
        layout,
        widgets: widgets ? JSON.stringify(widgets) : undefined,
        isDefault,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update dashboard' });
  }
};

export const deleteDashboard = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const userId = (req as any).userId;

    await prisma.dashboard.deleteMany({
      where: { id: dashboardId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete dashboard' });
  }
};

// Dashboard Widgets
export const addDashboardWidget = async (req: Request, res: Response) => {
  try {
    const { dashboardId, widgetType, config, position } = req.body;
    const userId = (req as any).userId;

    const widget = await prisma.dashboardWidget.create({
      data: {
        userId,
        dashboardId,
        widgetType: widgetType || 'metric',
        config: JSON.stringify(config || {}),
        position: position || 0,
        createdAt: new Date(),
      },
    });

    res.status(201).json(widget);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add widget' });
  }
};

export const getDashboardWidgets = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.query;
    const userId = (req as any).userId;

    const widgets = await prisma.dashboardWidget.findMany({
      where: {
        userId,
        dashboardId: dashboardId as string,
      },
      orderBy: { position: 'asc' },
    });

    res.json(widgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
};

export const updateDashboardWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const { config, position } = req.body;
    const userId = (req as any).userId;

    await prisma.dashboardWidget.updateMany({
      where: { id: widgetId, userId },
      data: {
        config: config ? JSON.stringify(config) : undefined,
        position,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update widget' });
  }
};

export const deleteDashboardWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const userId = (req as any).userId;

    await prisma.dashboardWidget.deleteMany({
      where: { id: widgetId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete widget' });
  }
};

// Report Analytics
export const getReportAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const totalReports = await prisma.customReport.count({
      where: { userId },
    });

    const activeReports = await prisma.customReport.count({
      where: { userId, isActive: true },
    });

    const totalExecutions = await prisma.reportExecution.count({
      where: { userId },
    });

    const analytics = {
      totalReports,
      activeReports,
      inactiveReports: totalReports - activeReports,
      totalExecutions,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Dashboard Analytics
export const getDashboardAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const totalDashboards = await prisma.dashboard.count({
      where: { userId },
    });

    const totalWidgets = await prisma.dashboardWidget.count({
      where: { userId },
    });

    const analytics = {
      totalDashboards,
      totalWidgets,
      avgWidgetsPerDashboard:
        totalDashboards > 0 ? (totalWidgets / totalDashboards).toFixed(2) : 0,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Data Export
export const exportReportData = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { format } = req.query;
    const userId = (req as any).userId;

    const report = await prisma.customReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const exportData = await prisma.dataExport.create({
      data: {
        userId,
        entityType: 'report',
        entityId: reportId,
        format: (format as string) || 'csv',
        status: 'completed',
        exportedAt: new Date(),
        createdAt: new Date(),
      },
    });

    res.status(201).json(exportData);
  } catch (error) {
    res.status(400).json({ error: 'Failed to export data' });
  }
};

// Report Sharing
export const shareReport = async (req: Request, res: Response) => {
  try {
    const { reportId, sharedWith, permission } = req.body;
    const userId = (req as any).userId;

    const sharing = await prisma.reportShare.create({
      data: {
        userId,
        reportId,
        sharedWith,
        permission: permission || 'view',
        createdAt: new Date(),
      },
    });

    res.status(201).json(sharing);
  } catch (error) {
    res.status(400).json({ error: 'Failed to share report' });
  }
};

export const getSharedReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const sharing = await prisma.reportShare.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sharing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shared reports' });
  }
};

// Report Scheduling
export const scheduleReportExecution = async (req: Request, res: Response) => {
  try {
    const { reportId, schedule, recipients, sendEmail } = req.body;
    const userId = (req as any).userId;

    const scheduled = await prisma.reportSchedule.create({
      data: {
        userId,
        reportId,
        schedule: schedule || 'weekly',
        recipients: JSON.stringify(recipients || []),
        sendEmail: sendEmail || true,
        isActive: true,
        createdAt: new Date(),
      },
    });

    res.status(201).json(scheduled);
  } catch (error) {
    res.status(400).json({ error: 'Failed to schedule report' });
  }
};

export const getScheduledReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const scheduled = await prisma.reportSchedule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(scheduled);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scheduled reports' });
  }
};
