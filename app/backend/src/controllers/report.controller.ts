import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export const generateReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, format, platformId, type } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get earnings data
    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        ...(platformId && { platformId }),
      },
      include: {
        platform: true,
      },
      orderBy: { date: 'desc' },
    });

    // Calculate statistics
    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalHours = earnings.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;
    const totalDays = new Set(earnings.map(e => e.date.toISOString().split('T')[0])).size;
    const avgPerDay = totalDays > 0 ? totalEarnings / totalDays : 0;

    // Group by platform
    const byPlatform = earnings.reduce((acc: any, e) => {
      const key = e.platform.name;
      if (!acc[key]) {
        acc[key] = { total: 0, count: 0, hours: 0 };
      }
      acc[key].total += Number(e.amount);
      acc[key].count += 1;
      acc[key].hours += Number(e.hours) || 0;
      return acc;
    }, {});

    const platformStats = Object.entries(byPlatform).map(([name, data]: any) => ({
      platform: name,
      earnings: data.total,
      transactions: data.count,
      hours: data.hours,
      hourlyRate: data.hours > 0 ? data.total / data.hours : 0,
    }));

    const reportData = {
      period: { startDate, endDate },
      summary: {
        totalEarnings,
        totalHours,
        avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
        totalDays,
        avgPerDay: Math.round(avgPerDay * 100) / 100,
        transactionCount: earnings.length,
      },
      platformStats,
      transactions: earnings.map(e => ({
        date: e.date,
        platform: e.platform.name,
        amount: Number(e.amount),
        hours: Number(e.hours) || null,
        notes: e.notes,
      })),
    };

    // Generate format
    if (format === 'pdf') {
      // PDF generation would use a library like puppeteer or pdfkit
      res.json({
        message: 'PDF report generated',
        data: reportData,
        downloadUrl: `/reports/download/pdf-${Date.now()}`,
      });
    } else if (format === 'csv') {
      const csvContent = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="earnings-report-${startDate}-to-${endDate}.csv"`
      );
      res.send(csvContent);
    } else if (format === 'excel') {
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summarySheet = XLSX.utils.json_to_sheet([reportData.summary]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Transactions sheet
      const transactionSheet = XLSX.utils.json_to_sheet(reportData.transactions);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');

      // Platform stats sheet
      const platformSheet = XLSX.utils.json_to_sheet(reportData.platformStats);
      XLSX.utils.book_append_sheet(workbook, platformSheet, 'By Platform');

      XLSX.writeFile(workbook, `earnings-report-${startDate}-to-${endDate}.xlsx`);
      res.json({ message: 'Excel file generated' });
    } else {
      res.json(reportData);
    }
  } catch (error) {
    next(error);
  }
};

export const createScheduledReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;
    const { name, frequency, format, recipients, filters } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (tier === 'free') {
      return res.status(403).json({
        error: 'Scheduled reports require Pro tier',
        requiredTier: 'pro',
      });
    }

    const report = await prisma.scheduledReport.create({
      data: {
        userId,
        name,
        frequency, // daily, weekly, monthly
        format,
        recipients: recipients || [userId],
        filters: filters || {},
        isActive: true,
        lastRunAt: null,
      },
    });

    res.status(201).json({
      message: 'Scheduled report created',
      report,
    });
  } catch (error) {
    next(error);
  }
};

export const getScheduledReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reports = await prisma.scheduledReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    next(error);
  }
};

export const deleteScheduledReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { reportId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const report = await prisma.scheduledReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await prisma.scheduledReport.delete({
      where: { id: reportId },
    });

    res.json({ message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};

export const getReportHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const history = await prisma.reportExecution.findMany({
      where: {
        scheduledReport: { userId },
      },
      include: {
        scheduledReport: true,
      },
      orderBy: { executedAt: 'desc' },
      take: 20,
    });

    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { period } = req.query; // day, week, month, year, all

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(2000, 0, 1);
    }

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      include: { platform: true },
    });

    // Calculate trends
    const daily = earnings.reduce((acc: any, e) => {
      const date = e.date.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += Number(e.amount);
      return acc;
    }, {});

    const trend = Object.entries(daily).map(([date, amount]) => ({
      date,
      amount,
    }));

    const totalEarnings = Object.values(daily).reduce((a: number, b: any) => a + b, 0);
    const avgDaily = trend.length > 0 ? totalEarnings / trend.length : 0;
    const maxDay = Math.max(...Object.values(daily).map(v => v as number));
    const minDay = Math.min(...Object.values(daily).map(v => v as number));

    res.json({
      period,
      summary: {
        totalEarnings,
        avgDaily,
        maxDay,
        minDay,
        daysTracked: trend.length,
      },
      trend,
      topPlatforms: earnings
        .reduce((acc: any, e) => {
          const key = e.platform.name;
          if (!acc[key]) acc[key] = 0;
          acc[key] += Number(e.amount);
          return acc;
        }, {})
        .sort((a: any, b: any) => b - a)
        .slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
};

// Helper function
function convertToCSV(data: any): string {
  let csv = 'Earnings Report\n';
  csv += `Period: ${data.period.startDate} to ${data.period.endDate}\n\n`;

  csv += 'Summary\n';
  csv += `Total Earnings,${data.summary.totalEarnings}\n`;
  csv += `Total Hours,${data.summary.totalHours}\n`;
  csv += `Avg Hourly Rate,$${data.summary.avgHourlyRate}\n`;
  csv += `Total Days,${data.summary.totalDays}\n\n`;

  csv += 'By Platform\n';
  csv += 'Platform,Earnings,Transactions,Hours,Hourly Rate\n';
  data.platformStats.forEach((p: any) => {
    csv += `${p.platform},${p.earnings},${p.transactions},${p.hours},${p.hourlyRate}\n`;
  });

  csv += '\nTransactions\n';
  csv += 'Date,Platform,Amount,Hours,Notes\n';
  data.transactions.forEach((t: any) => {
    csv += `${t.date},${t.platform},${t.amount},${t.hours || ''},${t.notes || ''}\n`;
  });

  return csv;
}
