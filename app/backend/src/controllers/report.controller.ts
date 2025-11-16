import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { reportService, ReportConfig } from '../services/report.service';

const createReportSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  reportType: z.enum(['EARNINGS', 'SALES', 'EXPENSES', 'FINANCIAL']),
  columns: z.array(z.string()),
  filters: z.record(z.any()),
  sorting: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']),
  }),
  isPublic: z.boolean().optional(),
});

const updateReportSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  sorting: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']),
  }).optional(),
  isPublic: z.boolean().optional(),
});

const scheduleReportSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  isActive: z.boolean().optional(),
});

/**
 * Get all reports for the authenticated user
 */
export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const reportType = req.query.reportType as string | undefined;

    const reports = await prisma.report.findMany({
      where: {
        userId,
        ...(reportType && { reportType: reportType as any }),
      },
      include: {
        schedules: true,
        _count: {
          select: {
            snapshots: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(reports);
  } catch (error) {
    logger.error('Get reports error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

/**
 * Get a single report with its data
 */
export const getReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;

    const report = await prisma.report.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        schedules: true,
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Build report data
    const config: ReportConfig = {
      reportType: report.reportType as any,
      columns: JSON.parse(report.columns),
      filters: JSON.parse(report.filters),
      sorting: JSON.parse(report.sorting),
    };

    const reportData = await reportService.buildReport(userId, config, page, limit);

    res.json({
      ...report,
      data: reportData,
    });
  } catch (error) {
    logger.error('Get report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

/**
 * Create a new custom report
 */
export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createReportSchema.parse(req.body);

    const report = await prisma.report.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        reportType: data.reportType,
        columns: JSON.stringify(data.columns),
        filters: JSON.stringify(data.filters),
        sorting: JSON.stringify(data.sorting),
        isPublic: data.isPublic || false,
      },
    });

    res.status(201).json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid report data', details: error.errors });
    }
    logger.error('Create report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create report' });
  }
};

/**
 * Update an existing report
 */
export const updateReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateReportSchema.parse(req.body);

    const existingReport = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.columns !== undefined) updateData.columns = JSON.stringify(data.columns);
    if (data.filters !== undefined) updateData.filters = JSON.stringify(data.filters);
    if (data.sorting !== undefined) updateData.sorting = JSON.stringify(data.sorting);
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    res.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid report data', details: error.errors });
    }
    logger.error('Update report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to update report' });
  }
};

/**
 * Delete a report
 */
export const deleteReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const report = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await prisma.report.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

/**
 * Export a report in specified format
 */
export const exportReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const format = req.query.format as 'csv' | 'pdf' | 'xlsx';

    if (!format || !['csv', 'pdf', 'xlsx'].includes(format)) {
      return res.status(400).json({ error: 'Invalid export format. Use csv, pdf, or xlsx' });
    }

    const report = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Build complete report data (no pagination for export)
    const config: ReportConfig = {
      reportType: report.reportType as any,
      columns: JSON.parse(report.columns),
      filters: JSON.parse(report.filters),
      sorting: JSON.parse(report.sorting),
    };

    const reportData = await reportService.buildReport(userId, config, 1, 10000);

    // Export based on format
    switch (format) {
      case 'csv': {
        const csv = await reportService.exportToCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.csv"`);
        res.send(csv);
        break;
      }
      case 'xlsx': {
        const excel = await reportService.exportToExcel(reportData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.xlsx"`);
        res.send(excel);
        break;
      }
      case 'pdf': {
        const pdf = await reportService.exportToPDF(reportData, report.name);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.pdf"`);
        res.send(pdf);
        break;
      }
    }
  } catch (error) {
    logger.error('Export report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to export report' });
  }
};

/**
 * Schedule a report for automated delivery
 */
export const scheduleReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = scheduleReportSchema.parse(req.body);

    const report = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if schedule already exists
    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: { reportId: id },
    });

    if (existingSchedule) {
      // Update existing schedule
      const updatedSchedule = await prisma.reportSchedule.update({
        where: { id: existingSchedule.id },
        data: {
          frequency: data.frequency,
          isActive: data.isActive !== undefined ? data.isActive : true,
          nextRunAt: reportService.calculateNextRun(data.frequency),
        },
      });
      return res.json(updatedSchedule);
    }

    // Create new schedule
    const schedule = await prisma.reportSchedule.create({
      data: {
        reportId: id,
        frequency: data.frequency,
        isActive: data.isActive !== undefined ? data.isActive : true,
        nextRunAt: reportService.calculateNextRun(data.frequency),
      },
    });

    res.status(201).json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid schedule data', details: error.errors });
    }
    logger.error('Schedule report error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to schedule report' });
  }
};

/**
 * Get report snapshots (history)
 */
export const getReportSnapshots = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Verify report belongs to user
    const report = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const snapshots = await prisma.reportSnapshot.findMany({
      where: { reportId: id },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });

    // Parse data for each snapshot
    const parsedSnapshots = snapshots.map(snapshot => ({
      id: snapshot.id,
      reportId: snapshot.reportId,
      data: JSON.parse(snapshot.data),
      generatedAt: snapshot.generatedAt,
    }));

    res.json(parsedSnapshots);
  } catch (error) {
    logger.error('Get report snapshots error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch report snapshots' });
  }
};

/**
 * Create a snapshot of the current report
 */
export const createReportSnapshot = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const report = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Build report data
    const config: ReportConfig = {
      reportType: report.reportType as any,
      columns: JSON.parse(report.columns),
      filters: JSON.parse(report.filters),
      sorting: JSON.parse(report.sorting),
    };

    const reportData = await reportService.buildReport(userId, config, 1, 10000);

    // Create snapshot
    await reportService.createSnapshot(id, reportData);

    res.status(201).json({ message: 'Snapshot created successfully' });
  } catch (error) {
    logger.error('Create report snapshot error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create report snapshot' });
  }
};
