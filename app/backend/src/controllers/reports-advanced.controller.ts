import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create Custom Report
export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const {
      name,
      description,
      reportType,
      chartType,
      metrics,
      filters,
      dateRange,
      schedule,
      recipients,
      format,
    } = req.body;

    if (!name || !reportType) {
      return res.status(400).json({ error: 'Name and report type are required' });
    }

    const report = await prisma.customReport.create({
      data: {
        userId,
        name,
        description,
        reportType,
        chartType: chartType || 'bar',
        metrics: metrics || [],
        filters: filters || {},
        dateRange: dateRange || 'month',
        schedule: schedule || null,
        recipients: recipients || [],
        format: format || 'pdf',
        isActive: true,
      },
    });

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

// Get Reports
export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { limit = 50, offset = 0 } = req.query;

    const reports = await prisma.customReport.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.customReport.count({
      where: { userId, isActive: true },
    });

    res.json({ reports, total });
  } catch (error) {
    next(error);
  }
};

// Get Report by ID
export const getReportById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reportId } = req.params;

    const report = await prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.userId !== userId) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
};

// Update Report
export const updateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reportId } = req.params;
    const { name, description, chartType, metrics, filters, schedule } = req.body;

    const report = await prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.userId !== userId) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updated = await prisma.customReport.update({
      where: { id: reportId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(chartType && { chartType }),
        ...(metrics && { metrics }),
        ...(filters && { filters }),
        ...(schedule && { schedule }),
        updatedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete Report
export const deleteReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reportId } = req.params;

    const report = await prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.userId !== userId) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await prisma.customReport.update({
      where: { id: reportId },
      data: { isActive: false },
    });

    res.json({ message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};

// Generate Report Data
export const generateReportData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reportId } = req.params;

    const report = await prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.userId !== userId) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Fetch earnings data based on filters
    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        ...(report.filters && {
          platformId: report.filters.platformIds ? { in: report.filters.platformIds } : undefined,
        }),
      },
      include: { platform: true },
    });

    // Process data based on report type
    let chartData: any = {};
    let summary: any = {};

    if (report.reportType === 'earnings_summary') {
      const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const avgEarning = totalEarnings / Math.max(earnings.length, 1);

      summary = {
        totalEarnings,
        avgEarning,
        count: earnings.length,
        maxEarning: Math.max(...earnings.map((e) => Number(e.amount))),
        minEarning: Math.min(...earnings.map((e) => Number(e.amount))),
      };

      // Group by date for chart
      const byDate: { [key: string]: number } = {};
      earnings.forEach((e) => {
        const date = e.date.toISOString().split('T')[0];
        byDate[date] = (byDate[date] || 0) + Number(e.amount);
      });

      chartData = {
        labels: Object.keys(byDate).sort(),
        datasets: [
          {
            label: 'Daily Earnings',
            data: Object.keys(byDate)
              .sort()
              .map((date) => byDate[date]),
          },
        ],
      };
    } else if (report.reportType === 'platform_comparison') {
      const byPlatform: { [key: string]: number } = {};
      earnings.forEach((e) => {
        byPlatform[e.platform.name] = (byPlatform[e.platform.name] || 0) + Number(e.amount);
      });

      chartData = {
        labels: Object.keys(byPlatform),
        datasets: [
          {
            label: 'Platform Earnings',
            data: Object.values(byPlatform),
          },
        ],
      };

      summary = {
        totalPlatforms: Object.keys(byPlatform).length,
        topPlatform: Object.entries(byPlatform).sort((a, b) => b[1] - a[1])[0]?.[0],
      };
    } else if (report.reportType === 'monthly_trend') {
      const byMonth: { [key: string]: number } = {};
      earnings.forEach((e) => {
        const month = e.date.toISOString().substring(0, 7);
        byMonth[month] = (byMonth[month] || 0) + Number(e.amount);
      });

      chartData = {
        labels: Object.keys(byMonth).sort(),
        datasets: [
          {
            label: 'Monthly Earnings',
            data: Object.keys(byMonth)
              .sort()
              .map((month) => byMonth[month]),
          },
        ],
      };
    }

    // Save report execution
    const execution = await prisma.reportExecution.create({
      data: {
        reportId,
        status: 'completed',
        chartData,
        summary,
        executedAt: new Date(),
      },
    });

    res.json({
      execution,
      chartData,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

// Get Report Executions
export const getReportExecutions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reportId } = req.params;
    const { limit = 20 } = req.query;

    const report = await prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.userId !== userId) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const executions = await prisma.reportExecution.findMany({
      where: { reportId },
      orderBy: { executedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(executions);
  } catch (error) {
    next(error);
  }
};

// Share Report
export const shareReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reportId } = req.params;
    const { recipients, shareType } = req.body;

    const report = await prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.userId !== userId) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Create share record
    const share = await prisma.reportShare.create({
      data: {
        reportId,
        shareType: shareType || 'email',
        recipients: recipients || [],
        sharedAt: new Date(),
      },
    });

    res.json(share);
  } catch (error) {
    next(error);
  }
};

// Create Chart Visualization
export const createVisualization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { name, chartType, dataSource, config } = req.body;

    if (!name || !chartType) {
      return res.status(400).json({ error: 'Name and chart type are required' });
    }

    const visualization = await prisma.chartVisualization.create({
      data: {
        userId,
        name,
        chartType,
        dataSource: dataSource || 'earnings',
        config: config || {},
        isActive: true,
      },
    });

    res.status(201).json(visualization);
  } catch (error) {
    next(error);
  }
};

// Get Visualizations
export const getVisualizations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const visualizations = await prisma.chartVisualization.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(visualizations);
  } catch (error) {
    next(error);
  }
};

// Delete Visualization
export const deleteVisualization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { vizId } = req.params;

    const viz = await prisma.chartVisualization.findUnique({
      where: { id: vizId },
    });

    if (!viz || viz.userId !== userId) {
      return res.status(404).json({ error: 'Visualization not found' });
    }

    await prisma.chartVisualization.update({
      where: { id: vizId },
      data: { isActive: false },
    });

    res.json({ message: 'Visualization deleted' });
  } catch (error) {
    next(error);
  }
};

// Get Chart Data for Visualization
export const getChartData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { vizId } = req.params;
    const { period = 'month', months = 12 } = req.query;

    const viz = await prisma.chartVisualization.findUnique({
      where: { id: vizId },
    });

    if (!viz || viz.userId !== userId) {
      return res.status(404).json({ error: 'Visualization not found' });
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      include: { platform: true },
    });

    let chartData: any = {};

    switch (viz.chartType) {
      case 'line':
      case 'area':
        // Group by period
        const byPeriod: { [key: string]: number } = {};
        earnings.forEach((e) => {
          let key: string;
          if (period === 'day') {
            key = e.date.toISOString().split('T')[0];
          } else if (period === 'week') {
            const date = new Date(e.date);
            const week = Math.ceil((date.getDate() - date.getDay()) / 7);
            key = `${date.getFullYear()}-W${week}`;
          } else {
            key = e.date.toISOString().substring(0, 7);
          }
          byPeriod[key] = (byPeriod[key] || 0) + Number(e.amount);
        });

        chartData = {
          type: viz.chartType,
          labels: Object.keys(byPeriod).sort(),
          datasets: [
            {
              label: 'Earnings Trend',
              data: Object.keys(byPeriod)
                .sort()
                .map((key) => byPeriod[key]),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: viz.chartType === 'area',
            },
          ],
        };
        break;

      case 'bar':
        const byPlatform: { [key: string]: number } = {};
        earnings.forEach((e) => {
          byPlatform[e.platform.name] = (byPlatform[e.platform.name] || 0) + Number(e.amount);
        });

        chartData = {
          type: 'bar',
          labels: Object.keys(byPlatform),
          datasets: [
            {
              label: 'Platform Earnings',
              data: Object.values(byPlatform),
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            },
          ],
        };
        break;

      case 'pie':
      case 'doughnut':
        const byPlatformPie: { [key: string]: number } = {};
        earnings.forEach((e) => {
          byPlatformPie[e.platform.name] = (byPlatformPie[e.platform.name] || 0) + Number(e.amount);
        });

        chartData = {
          type: viz.chartType,
          labels: Object.keys(byPlatformPie),
          datasets: [
            {
              data: Object.values(byPlatformPie),
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
            },
          ],
        };
        break;

      case 'scatter':
        // Amount vs date
        const scatterData = earnings.slice(0, 100).map((e) => ({
          x: e.date.getTime(),
          y: Number(e.amount),
        }));

        chartData = {
          type: 'scatter',
          datasets: [
            {
              label: 'Earnings Distribution',
              data: scatterData,
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
            },
          ],
        };
        break;

      default:
        chartData = {
          type: 'bar',
          labels: [],
          datasets: [],
        };
    }

    res.json(chartData);
  } catch (error) {
    next(error);
  }
};

// Batch Export Reports
export const batchExportReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reportIds, format = 'json' } = req.body;

    if (!reportIds || reportIds.length === 0) {
      return res.status(400).json({ error: 'No reports selected' });
    }

    const reports = await prisma.customReport.findMany({
      where: {
        id: { in: reportIds },
        userId,
      },
    });

    if (reports.length === 0) {
      return res.status(404).json({ error: 'No reports found' });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      reportCount: reports.length,
      reports: reports.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.reportType,
        createdAt: r.createdAt,
      })),
    };

    if (format === 'json') {
      res.json(exportData);
    } else if (format === 'csv') {
      let csv = 'Report ID,Name,Type,Created Date\n';
      reports.forEach((r) => {
        csv += `${r.id},"${r.name}",${r.reportType},${r.createdAt.toISOString()}\n`;
      });
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="reports-export.csv"');
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
};

// Get Report Templates
export const getReportTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = [
      {
        id: 'daily_earnings',
        name: 'Daily Earnings Summary',
        description: 'Shows daily earnings with line chart',
        reportType: 'earnings_summary',
        chartType: 'line',
        icon: 'chart-line',
      },
      {
        id: 'platform_revenue',
        name: 'Platform Revenue Comparison',
        description: 'Compares earnings across platforms',
        reportType: 'platform_comparison',
        chartType: 'bar',
        icon: 'chart-bar',
      },
      {
        id: 'monthly_trend',
        name: 'Monthly Trend Analysis',
        description: 'Shows monthly earnings trend',
        reportType: 'monthly_trend',
        chartType: 'area',
        icon: 'chart-area',
      },
      {
        id: 'earnings_distribution',
        name: 'Earnings Distribution',
        description: 'Pie chart of platform earnings distribution',
        reportType: 'platform_comparison',
        chartType: 'pie',
        icon: 'chart-pie',
      },
    ];

    res.json(templates);
  } catch (error) {
    next(error);
  }
};

// Create Report from Template
export const createFromTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { templateId, name } = req.body;

    const templates: { [key: string]: any } = {
      daily_earnings: {
        reportType: 'earnings_summary',
        chartType: 'line',
        metrics: ['total', 'average', 'max'],
      },
      platform_revenue: {
        reportType: 'platform_comparison',
        chartType: 'bar',
        metrics: ['total_by_platform'],
      },
      monthly_trend: {
        reportType: 'monthly_trend',
        chartType: 'area',
        metrics: ['monthly_total'],
      },
      earnings_distribution: {
        reportType: 'platform_comparison',
        chartType: 'pie',
        metrics: ['platform_share'],
      },
    };

    const template = templates[templateId];
    if (!template) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    const report = await prisma.customReport.create({
      data: {
        userId,
        name: name || `Report from ${templateId}`,
        reportType: template.reportType,
        chartType: template.chartType,
        metrics: template.metrics,
        isActive: true,
      },
    });

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};
