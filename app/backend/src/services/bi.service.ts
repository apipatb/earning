import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { Parser } from 'json2csv';
import { logger } from '../utils/logger';

/**
 * BI Service for Looker/Tableau Integration
 * Provides data aggregation, dimension tables, and export functionality
 */

export interface DateDimension {
  date: string;
  year: number;
  quarter: number;
  month: number;
  week: number;
  dayOfWeek: number;
  dayOfMonth: number;
  dayOfYear: number;
  monthName: string;
  quarterName: string;
}

export interface UserDimension {
  userId: string;
  email: string;
  name: string | null;
  timezone: string;
  currency: string;
  createdAt: string;
}

export interface ProductDimension {
  productId: string;
  name: string;
  category: string | null;
  sku: string | null;
  price: number;
  isActive: boolean;
}

export interface CustomerDimension {
  customerId: string;
  name: string;
  email: string | null;
  company: string | null;
  city: string | null;
  country: string | null;
  totalPurchases: number;
}

export interface EarningsFact {
  id: string;
  userId: string;
  platformId: string;
  platformName: string;
  date: string;
  year: number;
  quarter: number;
  month: number;
  hours: number;
  amount: number;
  hourlyRate: number;
}

export interface SalesFact {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  saleDate: string;
  year: number;
  quarter: number;
  month: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
}

export interface InvoicesFact {
  id: string;
  userId: string;
  customerId: string | null;
  customerName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  year: number;
  quarter: number;
  month: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
}

export interface MeasureDefinition {
  name: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  field: string;
  description: string;
}

export interface BIMetrics {
  totalEarnings: number;
  totalSales: number;
  totalInvoices: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  avgHourlyRate: number;
  totalHours: number;
  activeCustomers: number;
  activePlatforms: number;
  activeProducts: number;
  period: string;
}

class BIService {
  /**
   * Generate date dimension table for BI tools
   */
  async getDateDimension(startDate: Date, endDate: Date): Promise<DateDimension[]> {
    try {
      const dates: DateDimension[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const date = new Date(current);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);

        dates.push({
          date: date.toISOString().split('T')[0],
          year,
          quarter,
          month,
          week: this.getWeekNumber(date),
          dayOfWeek: date.getDay(),
          dayOfMonth: date.getDate(),
          dayOfYear: this.getDayOfYear(date),
          monthName: date.toLocaleString('en-US', { month: 'long' }),
          quarterName: `Q${quarter} ${year}`,
        });

        current.setDate(current.getDate() + 1);
      }

      return dates;
    } catch (error) {
      logger.error('Get date dimension error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get user dimension table
   */
  async getUserDimension(userId: string): Promise<UserDimension[]> {
    try {
      const users = await prisma.user.findMany({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
          currency: true,
          createdAt: true,
        },
      });

      return users.map(user => ({
        userId: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        currency: user.currency,
        createdAt: user.createdAt.toISOString(),
      }));
    } catch (error) {
      logger.error('Get user dimension error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get product dimension table
   */
  async getProductDimension(userId: string): Promise<ProductDimension[]> {
    try {
      const products = await prisma.product.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          category: true,
          sku: true,
          price: true,
          isActive: true,
        },
      });

      return products.map(product => ({
        productId: product.id,
        name: product.name,
        category: product.category,
        sku: product.sku,
        price: Number(product.price),
        isActive: product.isActive,
      }));
    } catch (error) {
      logger.error('Get product dimension error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get customer dimension table
   */
  async getCustomerDimension(userId: string): Promise<CustomerDimension[]> {
    try {
      const customers = await prisma.customer.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          city: true,
          country: true,
          totalPurchases: true,
        },
      });

      return customers.map(customer => ({
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        city: customer.city,
        country: customer.country,
        totalPurchases: Number(customer.totalPurchases),
      }));
    } catch (error) {
      logger.error('Get customer dimension error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get earnings fact table
   */
  async getEarningsFact(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EarningsFact[]> {
    try {
      const where: Prisma.EarningWhereInput = { userId };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
      }

      const earnings = await prisma.earning.findMany({
        where,
        include: {
          platform: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      return earnings.map(e => {
        const date = new Date(e.date);
        const amount = Number(e.amount);
        const hours = Number(e.hours || 0);

        return {
          id: e.id,
          userId: e.userId,
          platformId: e.platformId,
          platformName: e.platform.name,
          date: e.date.toISOString().split('T')[0],
          year: date.getFullYear(),
          quarter: Math.ceil((date.getMonth() + 1) / 3),
          month: date.getMonth() + 1,
          hours,
          amount,
          hourlyRate: hours > 0 ? amount / hours : 0,
        };
      });
    } catch (error) {
      logger.error('Get earnings fact error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get sales fact table
   */
  async getSalesFact(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesFact[]> {
    try {
      const where: Prisma.SaleWhereInput = { userId };

      if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = startDate;
        if (endDate) where.saleDate.lte = endDate;
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          saleDate: 'desc',
        },
      });

      return sales.map(s => {
        const date = new Date(s.saleDate);

        return {
          id: s.id,
          userId: s.userId,
          productId: s.productId,
          productName: s.product.name,
          saleDate: s.saleDate.toISOString().split('T')[0],
          year: date.getFullYear(),
          quarter: Math.ceil((date.getMonth() + 1) / 3),
          month: date.getMonth() + 1,
          quantity: Number(s.quantity),
          unitPrice: Number(s.unitPrice),
          totalAmount: Number(s.totalAmount),
          status: s.status,
        };
      });
    } catch (error) {
      logger.error('Get sales fact error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get invoices fact table
   */
  async getInvoicesFact(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<InvoicesFact[]> {
    try {
      const where: Prisma.InvoiceWhereInput = { userId };

      if (startDate || endDate) {
        where.invoiceDate = {};
        if (startDate) where.invoiceDate.gte = startDate;
        if (endDate) where.invoiceDate.lte = endDate;
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          invoiceDate: 'desc',
        },
      });

      return invoices.map(inv => {
        const date = new Date(inv.invoiceDate);

        return {
          id: inv.id,
          userId: inv.userId,
          customerId: inv.customerId,
          customerName: inv.customer?.name || null,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate.toISOString().split('T')[0],
          dueDate: inv.dueDate.toISOString().split('T')[0],
          year: date.getFullYear(),
          quarter: Math.ceil((date.getMonth() + 1) / 3),
          month: date.getMonth() + 1,
          subtotal: Number(inv.subtotal),
          taxAmount: Number(inv.taxAmount),
          discountAmount: Number(inv.discountAmount),
          totalAmount: Number(inv.totalAmount),
          status: inv.status,
        };
      });
    } catch (error) {
      logger.error('Get invoices fact error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get BI metrics aggregated
   */
  async getBIMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BIMetrics> {
    try {
      const where: any = { userId };
      const dateFilter: any = {};

      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;

      // Aggregate earnings
      const earnings = await prisma.earning.aggregate({
        where: {
          ...where,
          ...(startDate || endDate ? { date: dateFilter } : {}),
        },
        _sum: { amount: true, hours: true },
        _count: true,
      });

      // Aggregate sales
      const sales = await prisma.sale.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
          ...(startDate || endDate ? { saleDate: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
        _count: true,
      });

      // Aggregate invoices
      const invoices = await prisma.invoice.aggregate({
        where: {
          ...where,
          ...(startDate || endDate ? { invoiceDate: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
        _count: true,
      });

      // Aggregate expenses
      const expenses = await prisma.expense.aggregate({
        where: {
          ...where,
          ...(startDate || endDate ? { expenseDate: dateFilter } : {}),
        },
        _sum: { amount: true },
      });

      // Count active entities
      const [activeCustomers, activePlatforms, activeProducts] = await Promise.all([
        prisma.customer.count({ where: { userId, isActive: true } }),
        prisma.platform.count({ where: { userId, isActive: true } }),
        prisma.product.count({ where: { userId, isActive: true } }),
      ]);

      const totalEarnings = Number(earnings._sum.amount || 0);
      const totalSales = Number(sales._sum.amount || 0);
      const totalInvoices = Number(invoices._sum.amount || 0);
      const totalExpenses = Number(expenses._sum.amount || 0);
      const totalRevenue = totalEarnings + totalSales + totalInvoices;
      const netProfit = totalRevenue - totalExpenses;
      const totalHours = Number(earnings._sum.hours || 0);
      const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

      const periodStr = startDate && endDate
        ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        : 'All Time';

      return {
        totalEarnings,
        totalSales,
        totalInvoices,
        totalExpenses,
        totalRevenue,
        netProfit,
        avgHourlyRate,
        totalHours,
        activeCustomers,
        activePlatforms,
        activeProducts,
        period: periodStr,
      };
    } catch (error) {
      logger.error('Get BI metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Export data to CSV format
   */
  async exportToCSV(data: any[]): Promise<string> {
    try {
      if (data.length === 0) {
        return '';
      }

      const fields = Object.keys(data[0]);
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      return csv;
    } catch (error) {
      logger.error('Export to CSV error:', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to export to CSV');
    }
  }

  /**
   * Export data to JSON format
   */
  async exportToJSON(data: any): Promise<string> {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      logger.error('Export to JSON error:', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to export to JSON');
    }
  }

  /**
   * Get LookML metadata for Looker integration
   */
  async getLookMLMetadata(): Promise<any> {
    return {
      connection: 'earntrack',
      includes: ['*.view.lkml', '*.dashboard.lookml'],
      fiscal_month_offset: 0,
      week_start_day: 'sunday',
      datagroups: [
        {
          name: 'earntrack_default_datagroup',
          max_cache_age: '1 hour',
          sql_trigger: 'SELECT MAX(created_at) FROM analytics_events',
        },
      ],
      explores: [
        {
          name: 'earnings',
          from: 'earnings_fact',
          joins: [
            { name: 'user_dim', type: 'left_outer', sql_on: '${earnings.user_id} = ${user_dim.user_id}' },
            { name: 'date_dim', type: 'left_outer', sql_on: '${earnings.date} = ${date_dim.date}' },
          ],
        },
        {
          name: 'sales',
          from: 'sales_fact',
          joins: [
            { name: 'user_dim', type: 'left_outer', sql_on: '${sales.user_id} = ${user_dim.user_id}' },
            { name: 'product_dim', type: 'left_outer', sql_on: '${sales.product_id} = ${product_dim.product_id}' },
            { name: 'date_dim', type: 'left_outer', sql_on: '${sales.sale_date} = ${date_dim.date}' },
          ],
        },
        {
          name: 'invoices',
          from: 'invoices_fact',
          joins: [
            { name: 'user_dim', type: 'left_outer', sql_on: '${invoices.user_id} = ${user_dim.user_id}' },
            { name: 'customer_dim', type: 'left_outer', sql_on: '${invoices.customer_id} = ${customer_dim.customer_id}' },
            { name: 'date_dim', type: 'left_outer', sql_on: '${invoices.invoice_date} = ${date_dim.date}' },
          ],
        },
      ],
    };
  }

  /**
   * Get Tableau Web Data Connector schema
   */
  async getTableauSchema(): Promise<any> {
    return {
      id: 'earntrack_wdc',
      alias: 'EarnTrack Data',
      tables: [
        {
          id: 'earnings_fact',
          alias: 'Earnings',
          columns: [
            { id: 'id', dataType: 'string' },
            { id: 'user_id', dataType: 'string' },
            { id: 'platform_id', dataType: 'string' },
            { id: 'platform_name', dataType: 'string' },
            { id: 'date', dataType: 'date' },
            { id: 'year', dataType: 'int' },
            { id: 'quarter', dataType: 'int' },
            { id: 'month', dataType: 'int' },
            { id: 'hours', dataType: 'float' },
            { id: 'amount', dataType: 'float' },
            { id: 'hourly_rate', dataType: 'float' },
          ],
        },
        {
          id: 'sales_fact',
          alias: 'Sales',
          columns: [
            { id: 'id', dataType: 'string' },
            { id: 'user_id', dataType: 'string' },
            { id: 'product_id', dataType: 'string' },
            { id: 'product_name', dataType: 'string' },
            { id: 'sale_date', dataType: 'date' },
            { id: 'year', dataType: 'int' },
            { id: 'quarter', dataType: 'int' },
            { id: 'month', dataType: 'int' },
            { id: 'quantity', dataType: 'float' },
            { id: 'unit_price', dataType: 'float' },
            { id: 'total_amount', dataType: 'float' },
            { id: 'status', dataType: 'string' },
          ],
        },
        {
          id: 'invoices_fact',
          alias: 'Invoices',
          columns: [
            { id: 'id', dataType: 'string' },
            { id: 'user_id', dataType: 'string' },
            { id: 'customer_id', dataType: 'string' },
            { id: 'customer_name', dataType: 'string' },
            { id: 'invoice_number', dataType: 'string' },
            { id: 'invoice_date', dataType: 'date' },
            { id: 'due_date', dataType: 'date' },
            { id: 'year', dataType: 'int' },
            { id: 'quarter', dataType: 'int' },
            { id: 'month', dataType: 'int' },
            { id: 'subtotal', dataType: 'float' },
            { id: 'tax_amount', dataType: 'float' },
            { id: 'discount_amount', dataType: 'float' },
            { id: 'total_amount', dataType: 'float' },
            { id: 'status', dataType: 'string' },
          ],
        },
      ],
    };
  }

  /**
   * Get measure definitions for BI tools
   */
  getMeasureDefinitions(): MeasureDefinition[] {
    return [
      { name: 'total_earnings', aggregation: 'sum', field: 'amount', description: 'Total earnings amount' },
      { name: 'total_hours', aggregation: 'sum', field: 'hours', description: 'Total hours worked' },
      { name: 'avg_hourly_rate', aggregation: 'avg', field: 'hourly_rate', description: 'Average hourly rate' },
      { name: 'total_sales', aggregation: 'sum', field: 'total_amount', description: 'Total sales amount' },
      { name: 'avg_sale_amount', aggregation: 'avg', field: 'total_amount', description: 'Average sale amount' },
      { name: 'total_quantity', aggregation: 'sum', field: 'quantity', description: 'Total quantity sold' },
      { name: 'total_invoices', aggregation: 'count', field: 'id', description: 'Total number of invoices' },
      { name: 'avg_invoice_amount', aggregation: 'avg', field: 'total_amount', description: 'Average invoice amount' },
    ];
  }

  /**
   * Track analytics event
   */
  async trackEvent(userId: string, eventType: string, properties: Record<string, any>): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId,
          eventType,
          properties: JSON.stringify(properties),
        },
      });
    } catch (error) {
      logger.error('Track event error:', error instanceof Error ? error : new Error(String(error)));
      // Don't throw - event tracking should not break the application
    }
  }

  /**
   * Get analytics events
   */
  async getEvents(
    userId: string,
    eventType?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const where: Prisma.AnalyticsEventWhereInput = { userId };

      if (eventType) {
        where.eventType = eventType;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const events = await prisma.analyticsEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return events.map(e => ({
        id: e.id,
        userId: e.userId,
        eventType: e.eventType,
        properties: JSON.parse(e.properties),
        timestamp: e.timestamp.toISOString(),
      }));
    } catch (error) {
      logger.error('Get events error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Store dashboard metric
   */
  async storeDashboardMetric(
    userId: string,
    metricName: string,
    value: number,
    dimension?: string,
    period?: string
  ): Promise<void> {
    try {
      await prisma.dashboardMetric.create({
        data: {
          userId,
          metricName,
          value,
          dimension,
          period: period || new Date().toISOString().split('T')[0],
        },
      });
    } catch (error) {
      logger.error('Store dashboard metric error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(
    userId: string,
    metricName?: string,
    period?: string
  ): Promise<any[]> {
    try {
      const where: Prisma.DashboardMetricWhereInput = { userId };

      if (metricName) {
        where.metricName = metricName;
      }

      if (period) {
        where.period = period;
      }

      const metrics = await prisma.dashboardMetric.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return metrics.map(m => ({
        id: m.id,
        userId: m.userId,
        metricName: m.metricName,
        value: Number(m.value),
        dimension: m.dimension,
        period: m.period,
        createdAt: m.createdAt.toISOString(),
      }));
    } catch (error) {
      logger.error('Get dashboard metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Helper: Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Helper: Get day of year
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
}

export const biService = new BIService();
