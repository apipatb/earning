import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { logger } from '../utils/logger';

export interface ReportConfig {
  reportType: 'EARNINGS' | 'SALES' | 'EXPENSES' | 'FINANCIAL';
  columns: string[];
  filters: Record<string, any>;
  sorting: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface ReportData {
  headers: string[];
  rows: any[];
  metadata: {
    totalRows: number;
    generatedAt: string;
    reportType: string;
  };
}

class ReportService {
  /**
   * Build report data based on user configuration
   */
  async buildReport(
    userId: string,
    config: ReportConfig,
    page: number = 1,
    limit: number = 100
  ): Promise<ReportData> {
    try {
      const { reportType, columns, filters, sorting } = config;

      let data: any[] = [];
      let totalRows = 0;

      switch (reportType) {
        case 'EARNINGS':
          ({ data, totalRows } = await this.buildEarningsReport(userId, filters, sorting, page, limit));
          break;
        case 'SALES':
          ({ data, totalRows } = await this.buildSalesReport(userId, filters, sorting, page, limit));
          break;
        case 'EXPENSES':
          ({ data, totalRows } = await this.buildExpensesReport(userId, filters, sorting, page, limit));
          break;
        case 'FINANCIAL':
          ({ data, totalRows } = await this.buildFinancialReport(userId, filters, sorting, page, limit));
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Filter columns if specified
      const filteredData = data.map(row => {
        if (columns.length === 0) return row;
        const filtered: Record<string, any> = {};
        columns.forEach(col => {
          if (row[col] !== undefined) {
            filtered[col] = row[col];
          }
        });
        return filtered;
      });

      const headers = columns.length > 0 ? columns : Object.keys(data[0] || {});

      return {
        headers,
        rows: filteredData,
        metadata: {
          totalRows,
          generatedAt: new Date().toISOString(),
          reportType,
        },
      };
    } catch (error) {
      logger.error('Build report error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Build earnings report
   */
  private async buildEarningsReport(
    userId: string,
    filters: Record<string, any>,
    sorting: { field: string; order: 'asc' | 'desc' },
    page: number,
    limit: number
  ) {
    const where: Prisma.EarningWhereInput = { userId };

    // Apply filters
    if (filters.platformId) where.platformId = filters.platformId;
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }
    if (filters.minAmount) {
      where.amount = { gte: filters.minAmount };
    }
    if (filters.maxAmount) {
      where.amount = { ...where.amount, lte: filters.maxAmount };
    }

    const [earnings, totalRows] = await Promise.all([
      prisma.earning.findMany({
        where,
        include: {
          platform: {
            select: {
              name: true,
              category: true,
            },
          },
        },
        orderBy: {
          [sorting.field || 'date']: sorting.order || 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.earning.count({ where }),
    ]);

    const data = earnings.map(e => ({
      id: e.id,
      date: e.date.toISOString().split('T')[0],
      platform: e.platform.name,
      platformCategory: e.platform.category,
      hours: Number(e.hours || 0),
      amount: Number(e.amount),
      notes: e.notes || '',
      createdAt: e.createdAt.toISOString(),
    }));

    return { data, totalRows };
  }

  /**
   * Build sales report
   */
  private async buildSalesReport(
    userId: string,
    filters: Record<string, any>,
    sorting: { field: string; order: 'asc' | 'desc' },
    page: number,
    limit: number
  ) {
    const where: Prisma.SaleWhereInput = { userId };

    // Apply filters
    if (filters.productId) where.productId = filters.productId;
    if (filters.status) where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      where.saleDate = {};
      if (filters.dateFrom) where.saleDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.saleDate.lte = new Date(filters.dateTo);
    }
    if (filters.minAmount) {
      where.totalAmount = { gte: filters.minAmount };
    }

    const [sales, totalRows] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              category: true,
            },
          },
        },
        orderBy: {
          [sorting.field || 'saleDate']: sorting.order || 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    const data = sales.map(s => ({
      id: s.id,
      saleDate: s.saleDate.toISOString().split('T')[0],
      product: s.product.name,
      productCategory: s.product.category || '',
      quantity: Number(s.quantity),
      unitPrice: Number(s.unitPrice),
      totalAmount: Number(s.totalAmount),
      customer: s.customer || '',
      status: s.status,
      notes: s.notes || '',
    }));

    return { data, totalRows };
  }

  /**
   * Build expenses report
   */
  private async buildExpensesReport(
    userId: string,
    filters: Record<string, any>,
    sorting: { field: string; order: 'asc' | 'desc' },
    page: number,
    limit: number
  ) {
    const where: Prisma.ExpenseWhereInput = { userId };

    // Apply filters
    if (filters.category) where.category = filters.category;
    if (filters.vendor) where.vendor = { contains: filters.vendor, mode: 'insensitive' };
    if (filters.isTaxDeductible !== undefined) where.isTaxDeductible = filters.isTaxDeductible;
    if (filters.dateFrom || filters.dateTo) {
      where.expenseDate = {};
      if (filters.dateFrom) where.expenseDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.expenseDate.lte = new Date(filters.dateTo);
    }

    const [expenses, totalRows] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: {
          [sorting.field || 'expenseDate']: sorting.order || 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    const data = expenses.map(e => ({
      id: e.id,
      expenseDate: e.expenseDate.toISOString().split('T')[0],
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      vendor: e.vendor || '',
      isTaxDeductible: e.isTaxDeductible,
      receiptUrl: e.receiptUrl || '',
      notes: e.notes || '',
    }));

    return { data, totalRows };
  }

  /**
   * Build financial summary report
   */
  private async buildFinancialReport(
    userId: string,
    filters: Record<string, any>,
    sorting: { field: string; order: 'asc' | 'desc' },
    page: number,
    limit: number
  ) {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();

    // Aggregate earnings
    const earnings = await prisma.earning.aggregate({
      where: {
        userId,
        date: { gte: dateFrom, lte: dateTo },
      },
      _sum: { amount: true },
    });

    // Aggregate sales
    const sales = await prisma.sale.aggregate({
      where: {
        userId,
        saleDate: { gte: dateFrom, lte: dateTo },
        status: 'COMPLETED',
      },
      _sum: { totalAmount: true },
    });

    // Aggregate expenses
    const expenses = await prisma.expense.aggregate({
      where: {
        userId,
        expenseDate: { gte: dateFrom, lte: dateTo },
      },
      _sum: { amount: true },
    });

    const totalEarnings = Number(earnings._sum.amount || 0);
    const totalSales = Number(sales._sum.amount || 0);
    const totalExpenses = Number(expenses._sum.amount || 0);
    const totalRevenue = totalEarnings + totalSales;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const data = [
      {
        metric: 'Total Earnings',
        value: totalEarnings,
        period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      },
      {
        metric: 'Total Sales',
        value: totalSales,
        period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      },
      {
        metric: 'Total Revenue',
        value: totalRevenue,
        period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      },
      {
        metric: 'Total Expenses',
        value: totalExpenses,
        period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      },
      {
        metric: 'Net Profit',
        value: netProfit,
        period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      },
      {
        metric: 'Profit Margin (%)',
        value: profitMargin.toFixed(2),
        period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      },
    ];

    return { data, totalRows: data.length };
  }

  /**
   * Export report to CSV
   */
  async exportToCSV(reportData: ReportData): Promise<string> {
    try {
      const parser = new Parser({ fields: reportData.headers });
      const csv = parser.parse(reportData.rows);
      return csv;
    } catch (error) {
      logger.error('Export to CSV error:', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to export to CSV');
    }
  }

  /**
   * Export report to Excel
   */
  async exportToExcel(reportData: ReportData): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Add headers
      worksheet.columns = reportData.headers.map(header => ({
        header: header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
        key: header,
        width: 15,
      }));

      // Add rows
      reportData.rows.forEach(row => {
        worksheet.addRow(row);
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer as Buffer;
    } catch (error) {
      logger.error('Export to Excel error:', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to export to Excel');
    }
  }

  /**
   * Export report to PDF
   */
  async exportToPDF(reportData: ReportData, reportName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').text(reportName, { align: 'center' });
        doc.moveDown();

        // Metadata
        doc.fontSize(10).font('Helvetica')
          .text(`Generated: ${reportData.metadata.generatedAt}`, { align: 'center' })
          .text(`Total Rows: ${reportData.metadata.totalRows}`, { align: 'center' });
        doc.moveDown(2);

        // Table headers
        const columnWidth = (doc.page.width - 100) / reportData.headers.length;
        let yPos = doc.y;

        doc.fontSize(10).font('Helvetica-Bold');
        reportData.headers.forEach((header, i) => {
          doc.text(
            header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
            50 + i * columnWidth,
            yPos,
            { width: columnWidth, align: 'left' }
          );
        });

        yPos += 20;
        doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke();
        yPos += 10;

        // Table rows
        doc.font('Helvetica').fontSize(9);
        reportData.rows.slice(0, 50).forEach((row, rowIndex) => {
          if (yPos > doc.page.height - 100) {
            doc.addPage();
            yPos = 50;
          }

          reportData.headers.forEach((header, i) => {
            const value = row[header];
            const displayValue = value !== null && value !== undefined ? String(value) : '';
            doc.text(
              displayValue.substring(0, 30),
              50 + i * columnWidth,
              yPos,
              { width: columnWidth, align: 'left' }
            );
          });

          yPos += 20;

          if (rowIndex < reportData.rows.length - 1) {
            doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke('#CCCCCC');
            yPos += 5;
          }
        });

        // Footer
        if (reportData.rows.length > 50) {
          doc.moveDown(2);
          doc.fontSize(10).text(
            `Note: Showing first 50 rows of ${reportData.metadata.totalRows} total rows`,
            { align: 'center', color: '#666666' }
          );
        }

        doc.end();
      } catch (error) {
        logger.error('Export to PDF error:', error instanceof Error ? error : new Error(String(error)));
        reject(new Error('Failed to export to PDF'));
      }
    });
  }

  /**
   * Create a snapshot of report data
   */
  async createSnapshot(reportId: string, data: ReportData): Promise<void> {
    try {
      await prisma.reportSnapshot.create({
        data: {
          reportId,
          data: JSON.stringify(data),
        },
      });
    } catch (error) {
      logger.error('Create snapshot error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Calculate next run time for scheduled reports
   */
  calculateNextRun(frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    // Set to 9 AM
    next.setHours(9, 0, 0, 0);
    return next;
  }

  /**
   * Get scheduled reports that need to be executed
   */
  async getScheduledReports(): Promise<any[]> {
    try {
      const now = new Date();
      const schedules = await prisma.reportSchedule.findMany({
        where: {
          isActive: true,
          nextRunAt: {
            lte: now,
          },
        },
        include: {
          report: true,
        },
      });

      return schedules;
    } catch (error) {
      logger.error('Get scheduled reports error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update schedule next run time
   */
  async updateScheduleNextRun(scheduleId: string, frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Promise<void> {
    try {
      const nextRunAt = this.calculateNextRun(frequency);
      await prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: { nextRunAt },
      });
    } catch (error) {
      logger.error('Update schedule next run error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

export const reportService = new ReportService();
