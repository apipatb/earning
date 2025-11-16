import prisma from '../lib/prisma';
import { logError, logInfo } from '../lib/logger';
import { promises as fsPromises } from 'fs';
import { join } from 'path';

export interface ExportOptions {
  dateFrom?: Date;
  dateTo?: Date;
  includeNotes?: boolean;
}

/**
 * Export Service - Handles data export in various formats
 * Supports JSON, CSV, PDF, and Excel formats
 */
export class ExportService {
  private static readonly EXPORT_DIR = join(process.cwd(), 'exports');

  /**
   * Ensure exports directory exists
   */
  private static async ensureExportDir(): Promise<void> {
    try {
      await fsPromises.mkdir(this.EXPORT_DIR, { recursive: true });
    } catch (error) {
      logError('Failed to create export directory', error as Error);
    }
  }

  /**
   * Export all user data as JSON
   * @param userId User ID
   * @param options Export options
   * @returns File path and metadata
   */
  static async exportToJSON(userId: string, options: ExportOptions = {}) {
    try {
      logInfo('Starting JSON export', { userId });
      await this.ensureExportDir();

      // Fetch all user data
      const userData = await this.getAllUserData(userId, options);

      const filename = `backup_${userId}_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = join(this.EXPORT_DIR, filename);

      // Write JSON file
      const jsonData = JSON.stringify(userData, null, 2);
      await fsPromises.writeFile(filepath, jsonData, 'utf-8');

      const stats = await fsPromises.stat(filepath);

      logInfo('JSON export completed', {
        userId,
        filename,
        size: stats.size,
      });

      return {
        filename,
        filepath,
        format: 'json',
        size: stats.size,
        recordCount: this.countRecords(userData),
      };
    } catch (error) {
      logError('JSON export failed', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Export specific data type as CSV
   * @param userId User ID
   * @param dataType Type of data to export (earnings, invoices, customers, expenses, sales, products)
   * @param options Export options
   * @returns File path and metadata
   */
  static async exportToCSV(
    userId: string,
    dataType: 'earnings' | 'invoices' | 'customers' | 'expenses' | 'sales' | 'products',
    options: ExportOptions = {}
  ) {
    try {
      logInfo('Starting CSV export', { userId, dataType });
      await this.ensureExportDir();

      let data: any[] = [];
      let headers: string[] = [];

      switch (dataType) {
        case 'earnings':
          data = await prisma.earning.findMany({
            where: {
              userId,
              ...(options.dateFrom && { date: { gte: options.dateFrom } }),
              ...(options.dateTo && { date: { lte: options.dateTo } }),
            },
            include: { platform: { select: { name: true } } },
            orderBy: { date: 'desc' },
          });
          headers = ['Date', 'Platform', 'Amount', 'Hours', 'Notes'];
          break;

        case 'invoices':
          data = await prisma.invoice.findMany({
            where: {
              userId,
              ...(options.dateFrom && { invoiceDate: { gte: options.dateFrom } }),
              ...(options.dateTo && { invoiceDate: { lte: options.dateTo } }),
            },
            include: { customer: { select: { name: true } } },
            orderBy: { invoiceDate: 'desc' },
          });
          headers = ['Invoice #', 'Date', 'Customer', 'Amount', 'Status', 'Due Date'];
          break;

        case 'customers':
          data = await prisma.customer.findMany({
            where: { userId },
            orderBy: { name: 'asc' },
          });
          headers = ['Name', 'Email', 'Phone', 'Company', 'Total Purchases', 'Purchase Count'];
          break;

        case 'expenses':
          data = await prisma.expense.findMany({
            where: {
              userId,
              ...(options.dateFrom && { expenseDate: { gte: options.dateFrom } }),
              ...(options.dateTo && { expenseDate: { lte: options.dateTo } }),
            },
            orderBy: { expenseDate: 'desc' },
          });
          headers = ['Date', 'Category', 'Description', 'Amount', 'Vendor', 'Tax Deductible'];
          break;

        case 'sales':
          data = await prisma.sale.findMany({
            where: {
              userId,
              ...(options.dateFrom && { saleDate: { gte: options.dateFrom } }),
              ...(options.dateTo && { saleDate: { lte: options.dateTo } }),
            },
            include: { product: { select: { name: true } } },
            orderBy: { saleDate: 'desc' },
          });
          headers = ['Date', 'Product', 'Quantity', 'Unit Price', 'Total', 'Customer', 'Status'];
          break;

        case 'products':
          data = await prisma.product.findMany({
            where: { userId },
            orderBy: { name: 'asc' },
          });
          headers = ['Name', 'Price', 'Category', 'Quantity', 'SKU', 'Supplier'];
          break;
      }

      // Generate CSV content
      const csvContent = this.generateCSV(data, dataType, headers);
      const filename = `${dataType}_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
      const filepath = join(this.EXPORT_DIR, filename);

      await fsPromises.writeFile(filepath, csvContent, 'utf-8');
      const stats = await fsPromises.stat(filepath);

      logInfo('CSV export completed', {
        userId,
        dataType,
        filename,
        rowCount: data.length,
      });

      return {
        filename,
        filepath,
        format: 'csv',
        size: stats.size,
        recordCount: data.length,
      };
    } catch (error) {
      logError('CSV export failed', error as Error, { userId, dataType });
      throw error;
    }
  }

  /**
   * Export to Excel format
   * @param userId User ID
   * @param dataType Type of data to export
   * @param options Export options
   * @returns File path and metadata
   */
  static async exportToExcel(
    userId: string,
    dataType: 'earnings' | 'invoices' | 'customers' | 'expenses' | 'sales' | 'products',
    options: ExportOptions = {}
  ) {
    try {
      logInfo('Starting Excel export', { userId, dataType });
      await this.ensureExportDir();

      // For now, we'll use CSV as Excel base
      // In production, consider using libraries like 'xlsx' or 'exceljs'
      const csvExport = await this.exportToCSV(userId, dataType, options);

      const filename = csvExport.filename.replace('.csv', '.xlsx');
      const filepath = csvExport.filepath.replace('.csv', '.xlsx');

      // In production implementation, convert CSV to XLSX using a library
      // For now, we'll copy the CSV file as is
      await fsPromises.copyFile(csvExport.filepath, filepath);

      logInfo('Excel export completed', { userId, dataType, filename });

      return {
        filename,
        filepath,
        format: 'xlsx',
        size: csvExport.size,
        recordCount: csvExport.recordCount,
      };
    } catch (error) {
      logError('Excel export failed', error as Error, { userId, dataType });
      throw error;
    }
  }

  /**
   * Generate PDF report
   * @param userId User ID
   * @param reportType Type of report (summary, earnings, invoices, financial)
   * @returns File path and metadata
   */
  static async exportToPDF(
    userId: string,
    reportType: 'summary' | 'earnings' | 'invoices' | 'financial' = 'summary'
  ) {
    try {
      logInfo('Starting PDF export', { userId, reportType });
      await this.ensureExportDir();

      // For now, create a simple text-based PDF representation
      // In production, use libraries like 'pdfkit' or 'pdf-lib'
      let reportData = '';

      switch (reportType) {
        case 'summary':
          reportData = await this.generateSummaryReport(userId);
          break;
        case 'earnings':
          reportData = await this.generateEarningsReport(userId);
          break;
        case 'invoices':
          reportData = await this.generateInvoicesReport(userId);
          break;
        case 'financial':
          reportData = await this.generateFinancialReport(userId);
          break;
      }

      const filename = `report_${reportType}_${userId}_${new Date().toISOString().split('T')[0]}.pdf`;
      const filepath = join(this.EXPORT_DIR, filename);

      // This is a placeholder - in production use proper PDF library
      await fsPromises.writeFile(filepath, reportData, 'utf-8');
      const stats = await fsPromises.stat(filepath);

      logInfo('PDF export completed', { userId, reportType, filename });

      return {
        filename,
        filepath,
        format: 'pdf',
        size: stats.size,
        reportType,
      };
    } catch (error) {
      logError('PDF export failed', error as Error, { userId, reportType });
      throw error;
    }
  }

  /**
   * Get all user data for backup
   */
  private static async getAllUserData(userId: string, options: ExportOptions) {
    const [user, earnings, invoices, customers, expenses, sales, products, goals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, currency: true, timezone: true, createdAt: true },
      }),
      prisma.earning.findMany({
        where: {
          userId,
          ...(options.dateFrom && { date: { gte: options.dateFrom } }),
          ...(options.dateTo && { date: { lte: options.dateTo } }),
        },
      }),
      prisma.invoice.findMany({ where: { userId }, include: { lineItems: true } }),
      prisma.customer.findMany({ where: { userId } }),
      prisma.expense.findMany({
        where: {
          userId,
          ...(options.dateFrom && { expenseDate: { gte: options.dateFrom } }),
          ...(options.dateTo && { expenseDate: { lte: options.dateTo } }),
        },
      }),
      prisma.sale.findMany({
        where: {
          userId,
          ...(options.dateFrom && { saleDate: { gte: options.dateFrom } }),
          ...(options.dateTo && { saleDate: { lte: options.dateTo } }),
        },
      }),
      prisma.product.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
    ]);

    return {
      backup: {
        createdAt: new Date().toISOString(),
        version: '1.0',
      },
      user,
      data: {
        earnings,
        invoices,
        customers,
        expenses,
        sales,
        products,
        goals,
      },
      recordCounts: {
        earnings: earnings.length,
        invoices: invoices.length,
        customers: customers.length,
        expenses: expenses.length,
        sales: sales.length,
        products: products.length,
        goals: goals.length,
      },
    };
  }

  /**
   * Count total records in exported data
   */
  private static countRecords(data: any): number {
    const counts = data.recordCounts || {};
    return Object.values(counts).reduce((sum, count: any) => sum + (count || 0), 0);
  }

  /**
   * Generate CSV content from data
   */
  private static generateCSV(data: any[], dataType: string, headers: string[]): string {
    const rows = [headers.join(',')];

    data.forEach((item: any) => {
      const row: string[] = [];

      switch (dataType) {
        case 'earnings':
          row.push(
            new Date(item.date).toISOString().split('T')[0],
            item.platform?.name || '',
            item.amount.toString(),
            item.hours?.toString() || '',
            item.notes?.replace(/,/g, ';') || ''
          );
          break;

        case 'invoices':
          row.push(
            item.invoiceNumber || '',
            new Date(item.invoiceDate).toISOString().split('T')[0],
            item.customer?.name || '',
            item.totalAmount.toString(),
            item.status,
            new Date(item.dueDate).toISOString().split('T')[0]
          );
          break;

        case 'customers':
          row.push(
            item.name,
            item.email || '',
            item.phone || '',
            item.company || '',
            item.totalPurchases.toString(),
            item.purchaseCount.toString()
          );
          break;

        case 'expenses':
          row.push(
            new Date(item.expenseDate).toISOString().split('T')[0],
            item.category,
            item.description.replace(/,/g, ';'),
            item.amount.toString(),
            item.vendor || '',
            item.isTaxDeductible ? 'Yes' : 'No'
          );
          break;

        case 'sales':
          row.push(
            new Date(item.saleDate).toISOString().split('T')[0],
            item.product?.name || '',
            item.quantity.toString(),
            item.unitPrice.toString(),
            item.totalAmount.toString(),
            item.customer || '',
            item.status
          );
          break;

        case 'products':
          row.push(
            item.name,
            item.price.toString(),
            item.category || '',
            item.quantity.toString(),
            item.sku || '',
            item.supplierName || ''
          );
          break;
      }

      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Generate summary report
   */
  private static async generateSummaryReport(userId: string): Promise<string> {
    const [user, earnings, invoices, expenses] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.earning.findMany({ where: { userId } }),
      prisma.invoice.findMany({ where: { userId, status: 'paid' } }),
      prisma.expense.findMany({ where: { userId } }),
    ]);

    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return `
SUMMARY REPORT
Generated: ${new Date().toISOString()}
User: ${user?.email}

FINANCIAL OVERVIEW
==================
Total Earnings: ${totalEarnings.toFixed(2)} ${user?.currency}
Total Invoiced: ${totalInvoiced.toFixed(2)} ${user?.currency}
Total Expenses: ${totalExpenses.toFixed(2)} ${user?.currency}
Net Profit: ${(totalEarnings - totalExpenses).toFixed(2)} ${user?.currency}

RECORD COUNTS
=============
Earnings Records: ${earnings.length}
Invoices: ${invoices.length}
Expenses: ${expenses.length}
    `;
  }

  /**
   * Generate earnings report
   */
  private static async generateEarningsReport(userId: string): Promise<string> {
    const earnings = await prisma.earning.findMany({
      where: { userId },
      include: { platform: true },
      orderBy: { date: 'desc' },
      take: 100,
    });

    let report = `
EARNINGS REPORT
Generated: ${new Date().toISOString()}

Recent Earnings:
================
`;

    earnings.forEach((earning) => {
      report += `
Date: ${new Date(earning.date).toISOString().split('T')[0]}
Platform: ${earning.platform.name}
Amount: ${earning.amount}
Hours: ${earning.hours || 'N/A'}
Notes: ${earning.notes || 'N/A'}
---`;
    });

    return report;
  }

  /**
   * Generate invoices report
   */
  private static async generateInvoicesReport(userId: string): Promise<string> {
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      include: { customer: true },
      orderBy: { invoiceDate: 'desc' },
      take: 100,
    });

    let report = `
INVOICES REPORT
Generated: ${new Date().toISOString()}

Recent Invoices:
================
`;

    invoices.forEach((invoice) => {
      report += `
Invoice #: ${invoice.invoiceNumber}
Date: ${new Date(invoice.invoiceDate).toISOString().split('T')[0]}
Customer: ${invoice.customer?.name || 'N/A'}
Amount: ${invoice.totalAmount}
Status: ${invoice.status}
Due Date: ${new Date(invoice.dueDate).toISOString().split('T')[0]}
---`;
    });

    return report;
  }

  /**
   * Generate financial report
   */
  private static async generateFinancialReport(userId: string): Promise<string> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [earnings, expenses, invoices] = await Promise.all([
      prisma.earning.findMany({
        where: {
          userId,
          date: { gte: thirtyDaysAgo },
        },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          expenseDate: { gte: thirtyDaysAgo },
        },
      }),
      prisma.invoice.findMany({
        where: {
          userId,
          invoiceDate: { gte: thirtyDaysAgo },
          status: 'paid',
        },
      }),
    ]);

    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);

    return `
FINANCIAL REPORT (Last 30 Days)
Generated: ${new Date().toISOString()}

INCOME
======
Earnings: ${totalEarnings.toFixed(2)}
Invoiced: ${totalInvoiced.toFixed(2)}
Total Income: ${(totalEarnings + totalInvoiced).toFixed(2)}

EXPENSES
========
Total Expenses: ${totalExpenses.toFixed(2)}

SUMMARY
=======
Gross Income: ${(totalEarnings + totalInvoiced).toFixed(2)}
Net Income: ${(totalEarnings + totalInvoiced - totalExpenses).toFixed(2)}
Profit Margin: ${((totalEarnings + totalInvoiced - totalExpenses) / (totalEarnings + totalInvoiced) * 100).toFixed(2)}%
    `;
  }
}

export default ExportService;
