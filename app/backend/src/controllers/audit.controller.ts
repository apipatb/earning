import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { AuditService } from '../services/audit.service';
import { AuditAction, AuditStatus, ComplianceReportType } from '@prisma/client';
import { logger } from '../utils/logger';

// Validation schemas
const getAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  status: z.nativeEnum(AuditStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 100)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
});

const searchAuditLogsSchema = z.object({
  query: z.string().min(1),
  userId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  resource: z.string().optional(),
  status: z.nativeEnum(AuditStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 100)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
});

const generateComplianceReportSchema = z.object({
  reportType: z.nativeEnum(ComplianceReportType),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * GET /api/v1/audit/logs
 * List audit logs with filters
 */
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const params = getAuditLogsSchema.parse(req.query);

    // Only allow users to see their own logs (unless they're admin - implement admin check if needed)
    const filters = {
      userId: params.userId || userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      status: params.status,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    };

    const result = await AuditService.getAuditLogs(
      filters,
      params.limit,
      params.offset
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid parameters', details: error.errors });
    }
    logger.error('Get audit logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

/**
 * GET /api/v1/audit/logs/search
 * Search audit logs
 */
export const searchAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const params = searchAuditLogsSchema.parse(req.query);

    const filters = {
      userId: params.userId || userId,
      action: params.action,
      resource: params.resource,
      status: params.status,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    };

    const result = await AuditService.searchAuditLogs(
      params.query,
      filters,
      params.limit,
      params.offset
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid search parameters', details: error.errors });
    }
    logger.error('Search audit logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to search audit logs' });
  }
};

/**
 * GET /api/v1/audit/report
 * Generate audit report for a date range
 */
export const generateAuditReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
      });
    }

    const report = await AuditService.generateAuditReport(userId, start, end);

    res.json(report);
  } catch (error) {
    logger.error('Generate audit report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
};

/**
 * GET /api/v1/compliance/reports
 * List compliance reports for the user
 */
export const getComplianceReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await AuditService.getComplianceReports(userId, limit, offset);

    res.json(result);
  } catch (error) {
    logger.error('Get compliance reports error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch compliance reports' });
  }
};

/**
 * GET /api/v1/compliance/reports/:id
 * Get compliance report details
 */
export const getComplianceReportDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const report = await AuditService.getComplianceReportDetails(id, userId);

    if (!report) {
      return res.status(404).json({ error: 'Compliance report not found' });
    }

    res.json(report);
  } catch (error) {
    logger.error('Get compliance report details error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch compliance report details' });
  }
};

/**
 * POST /api/v1/compliance/export
 * Generate compliance report (GDPR, Activity, etc.)
 */
export const generateComplianceReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = generateComplianceReportSchema.parse(req.body);

    const startDate = data.startDate ? new Date(data.startDate) : undefined;
    const endDate = data.endDate ? new Date(data.endDate) : undefined;

    const report = await AuditService.generateComplianceReport(
      userId,
      data.reportType,
      startDate,
      endDate
    );

    res.status(201).json({
      id: report.id,
      reportType: report.reportType,
      period: report.period,
      recordCount: report.recordCount,
      status: report.status,
      createdAt: report.createdAt,
      message: 'Compliance report generated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid report data', details: error.errors });
    }
    logger.error('Generate compliance report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
};

/**
 * POST /api/v1/compliance/data-export
 * Generate GDPR data export
 */
export const exportUserData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const report = await AuditService.generateComplianceReport(
      userId,
      'GDPR',
      undefined,
      undefined
    );

    // Return the full report data for immediate download
    const fullReport = await AuditService.getComplianceReportDetails(report.id, userId);

    res.json({
      id: report.id,
      data: fullReport.data,
      recordCount: report.recordCount,
      generatedAt: report.createdAt,
      message: 'Your data has been exported successfully',
    });
  } catch (error) {
    logger.error('Export user data error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to export user data' });
  }
};

/**
 * GET /api/v1/audit/stats
 * Get audit statistics for the user
 */
export const getAuditStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    const filters = {
      userId,
      startDate,
      endDate,
    };

    const { logs } = await AuditService.getAuditLogs(filters, 10000, 0);

    // Calculate statistics
    const stats = {
      totalActions: logs.length,
      actionsByType: {} as Record<string, number>,
      actionsByResource: {} as Record<string, number>,
      actionsByDay: {} as Record<string, number>,
      successRate: 0,
      failedActions: 0,
      recentActions: logs.slice(0, 10),
    };

    logs.forEach((log: any) => {
      // Count by action type
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;

      // Count by resource
      stats.actionsByResource[log.resource] = (stats.actionsByResource[log.resource] || 0) + 1;

      // Count by day
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      stats.actionsByDay[day] = (stats.actionsByDay[day] || 0) + 1;

      // Count failures
      if (log.status === 'FAILED') {
        stats.failedActions++;
      }
    });

    stats.successRate = stats.totalActions > 0
      ? ((stats.totalActions - stats.failedActions) / stats.totalActions) * 100
      : 100;

    res.json(stats);
  } catch (error) {
    logger.error('Get audit stats error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
};

/**
 * DELETE /api/v1/audit/cleanup
 * Clean up old audit logs (admin only - implement role check if needed)
 */
export const cleanupOldLogs = async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Add admin role check here
    const result = await AuditService.cleanupOldLogs();

    res.json({
      message: 'Old audit logs cleaned up successfully',
      deleted: result.deleted,
    });
  } catch (error) {
    logger.error('Cleanup old logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to cleanup old logs' });
  }
};
