import prisma from '../lib/prisma';
import { Prisma, WidgetType } from '@prisma/client';
import { logger } from '../utils/logger';

export interface DashboardConfig {
  name: string;
  layout: any;
  isDefault?: boolean;
}

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  config: any;
  positionX: number;
  positionY: number;
  sizeW: number;
  sizeH: number;
  dataSource: string;
  refreshInterval?: number;
}

export interface WidgetData {
  id: string;
  type: WidgetType;
  title: string;
  data: any;
  config: any;
}

class DashboardService {
  /**
   * Get all dashboards for a user
   */
  async getDashboards(userId: string) {
    try {
      const dashboards = await prisma.dashboard.findMany({
        where: { userId },
        include: {
          widgets: true,
          _count: {
            select: {
              widgets: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return dashboards.map(dashboard => ({
        ...dashboard,
        layout: JSON.parse(dashboard.layout),
        widgets: dashboard.widgets.map(widget => ({
          ...widget,
          config: JSON.parse(widget.config),
        })),
      }));
    } catch (error) {
      logger.error('Get dashboards error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get a single dashboard with its widgets
   */
  async getDashboard(userId: string, dashboardId: string) {
    try {
      const dashboard = await prisma.dashboard.findFirst({
        where: {
          id: dashboardId,
          userId,
        },
        include: {
          widgets: true,
        },
      });

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      return {
        ...dashboard,
        layout: JSON.parse(dashboard.layout),
        widgets: dashboard.widgets.map(widget => ({
          ...widget,
          config: JSON.parse(widget.config),
        })),
      };
    } catch (error) {
      logger.error('Get dashboard error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(userId: string, config: DashboardConfig) {
    try {
      // If this is set as default, unset other defaults
      if (config.isDefault) {
        await prisma.dashboard.updateMany({
          where: {
            userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const dashboard = await prisma.dashboard.create({
        data: {
          userId,
          name: config.name,
          layout: JSON.stringify(config.layout || {}),
          isDefault: config.isDefault || false,
        },
        include: {
          widgets: true,
        },
      });

      return {
        ...dashboard,
        layout: JSON.parse(dashboard.layout),
      };
    } catch (error) {
      logger.error('Create dashboard error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    userId: string,
    dashboardId: string,
    updates: Partial<DashboardConfig>
  ) {
    try {
      // Verify ownership
      const existing = await prisma.dashboard.findFirst({
        where: { id: dashboardId, userId },
      });

      if (!existing) {
        throw new Error('Dashboard not found');
      }

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await prisma.dashboard.updateMany({
          where: {
            userId,
            isDefault: true,
            id: { not: dashboardId },
          },
          data: {
            isDefault: false,
          },
        });
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.layout !== undefined) updateData.layout = JSON.stringify(updates.layout);
      if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;

      const dashboard = await prisma.dashboard.update({
        where: { id: dashboardId },
        data: updateData,
        include: {
          widgets: true,
        },
      });

      return {
        ...dashboard,
        layout: JSON.parse(dashboard.layout),
        widgets: dashboard.widgets.map(widget => ({
          ...widget,
          config: JSON.parse(widget.config),
        })),
      };
    } catch (error) {
      logger.error('Update dashboard error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(userId: string, dashboardId: string) {
    try {
      const dashboard = await prisma.dashboard.findFirst({
        where: { id: dashboardId, userId },
      });

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      await prisma.dashboard.delete({
        where: { id: dashboardId },
      });
    } catch (error) {
      logger.error('Delete dashboard error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(userId: string, dashboardId: string, widgetConfig: WidgetConfig) {
    try {
      // Verify dashboard ownership
      const dashboard = await prisma.dashboard.findFirst({
        where: { id: dashboardId, userId },
      });

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const widget = await prisma.dashboardWidget.create({
        data: {
          dashboardId,
          type: widgetConfig.type,
          title: widgetConfig.title,
          config: JSON.stringify(widgetConfig.config),
          positionX: widgetConfig.positionX,
          positionY: widgetConfig.positionY,
          sizeW: widgetConfig.sizeW,
          sizeH: widgetConfig.sizeH,
          dataSource: widgetConfig.dataSource,
          refreshInterval: widgetConfig.refreshInterval,
        },
      });

      return {
        ...widget,
        config: JSON.parse(widget.config),
      };
    } catch (error) {
      logger.error('Add widget error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update widget
   */
  async updateWidget(
    userId: string,
    dashboardId: string,
    widgetId: string,
    updates: Partial<WidgetConfig>
  ) {
    try {
      // Verify ownership through dashboard
      const dashboard = await prisma.dashboard.findFirst({
        where: { id: dashboardId, userId },
      });

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const updateData: any = {};
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.config !== undefined) updateData.config = JSON.stringify(updates.config);
      if (updates.positionX !== undefined) updateData.positionX = updates.positionX;
      if (updates.positionY !== undefined) updateData.positionY = updates.positionY;
      if (updates.sizeW !== undefined) updateData.sizeW = updates.sizeW;
      if (updates.sizeH !== undefined) updateData.sizeH = updates.sizeH;
      if (updates.dataSource !== undefined) updateData.dataSource = updates.dataSource;
      if (updates.refreshInterval !== undefined) updateData.refreshInterval = updates.refreshInterval;

      const widget = await prisma.dashboardWidget.update({
        where: { id: widgetId },
        data: updateData,
      });

      return {
        ...widget,
        config: JSON.parse(widget.config),
      };
    } catch (error) {
      logger.error('Update widget error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Delete widget
   */
  async deleteWidget(userId: string, dashboardId: string, widgetId: string) {
    try {
      // Verify ownership through dashboard
      const dashboard = await prisma.dashboard.findFirst({
        where: { id: dashboardId, userId },
      });

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      await prisma.dashboardWidget.delete({
        where: { id: widgetId },
      });
    } catch (error) {
      logger.error('Delete widget error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get widget data based on its configuration
   */
  async getWidgetData(userId: string, widgetId: string): Promise<WidgetData> {
    try {
      const widget = await prisma.dashboardWidget.findFirst({
        where: { id: widgetId },
        include: {
          dashboard: true,
        },
      });

      if (!widget || widget.dashboard.userId !== userId) {
        throw new Error('Widget not found');
      }

      const config = JSON.parse(widget.config);
      let data: any = null;

      // Fetch data based on data source
      switch (widget.dataSource) {
        case 'earnings':
          data = await this.getEarningsData(userId, config);
          break;
        case 'sales':
          data = await this.getSalesData(userId, config);
          break;
        case 'expenses':
          data = await this.getExpensesData(userId, config);
          break;
        case 'revenue':
          data = await this.getRevenueData(userId, config);
          break;
        case 'goals':
          data = await this.getGoalsData(userId, config);
          break;
        case 'invoices':
          data = await this.getInvoicesData(userId, config);
          break;
        case 'platforms':
          data = await this.getPlatformsData(userId, config);
          break;
        case 'products':
          data = await this.getProductsData(userId, config);
          break;
        default:
          data = { message: 'No data available' };
      }

      return {
        id: widget.id,
        type: widget.type,
        title: widget.title,
        data,
        config,
      };
    } catch (error) {
      logger.error('Get widget data error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get earnings data for widgets
   */
  private async getEarningsData(userId: string, config: any) {
    const dateRange = this.getDateRange(config.period || 'month');

    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      include: {
        platform: {
          select: {
            name: true,
            category: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const total = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const avgPerDay = earnings.length > 0 ? total / earnings.length : 0;

    // Group by date for time series
    const byDate = earnings.reduce((acc: any, e) => {
      const date = e.date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += Number(e.amount);
      return acc;
    }, {});

    // Group by platform
    const byPlatform = earnings.reduce((acc: any, e) => {
      const platform = e.platform.name;
      if (!acc[platform]) {
        acc[platform] = 0;
      }
      acc[platform] += Number(e.amount);
      return acc;
    }, {});

    return {
      total,
      avgPerDay,
      count: earnings.length,
      byDate: Object.entries(byDate).map(([date, amount]) => ({ date, amount })),
      byPlatform: Object.entries(byPlatform).map(([name, amount]) => ({ name, amount })),
      trend: this.calculateTrend(Object.values(byDate) as number[]),
    };
  }

  /**
   * Get sales data for widgets
   */
  private async getSalesData(userId: string, config: any) {
    const dateRange = this.getDateRange(config.period || 'month');

    const sales = await prisma.sale.findMany({
      where: {
        userId,
        saleDate: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
        status: 'COMPLETED',
      },
      include: {
        product: {
          select: {
            name: true,
            category: true,
          },
        },
      },
      orderBy: { saleDate: 'asc' },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalQuantity = sales.reduce((sum, s) => sum + Number(s.quantity), 0);

    // Group by date
    const byDate = sales.reduce((acc: any, s) => {
      const date = s.saleDate.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { revenue: 0, quantity: 0 };
      }
      acc[date].revenue += Number(s.totalAmount);
      acc[date].quantity += Number(s.quantity);
      return acc;
    }, {});

    // Group by product
    const byProduct = sales.reduce((acc: any, s) => {
      const product = s.product.name;
      if (!acc[product]) {
        acc[product] = { revenue: 0, quantity: 0 };
      }
      acc[product].revenue += Number(s.totalAmount);
      acc[product].quantity += Number(s.quantity);
      return acc;
    }, {});

    return {
      totalRevenue,
      totalQuantity,
      count: sales.length,
      avgOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      byDate: Object.entries(byDate).map(([date, data]) => ({ date, ...data })),
      byProduct: Object.entries(byProduct).map(([name, data]) => ({ name, ...data })),
      trend: this.calculateTrend(Object.values(byDate).map((d: any) => d.revenue)),
    };
  }

  /**
   * Get expenses data for widgets
   */
  private async getExpensesData(userId: string, config: any) {
    const dateRange = this.getDateRange(config.period || 'month');

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        expenseDate: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      orderBy: { expenseDate: 'asc' },
    });

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Group by category
    const byCategory = expenses.reduce((acc: any, e) => {
      const category = e.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Number(e.amount);
      return acc;
    }, {});

    // Group by date
    const byDate = expenses.reduce((acc: any, e) => {
      const date = e.expenseDate.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += Number(e.amount);
      return acc;
    }, {});

    return {
      total,
      count: expenses.length,
      avgPerExpense: expenses.length > 0 ? total / expenses.length : 0,
      byCategory: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })),
      byDate: Object.entries(byDate).map(([date, amount]) => ({ date, amount })),
      trend: this.calculateTrend(Object.values(byDate) as number[]),
    };
  }

  /**
   * Get revenue data (combined earnings + sales)
   */
  private async getRevenueData(userId: string, config: any) {
    const dateRange = this.getDateRange(config.period || 'month');

    const [earnings, sales, expenses] = await Promise.all([
      prisma.earning.aggregate({
        where: {
          userId,
          date: { gte: dateRange.from, lte: dateRange.to },
        },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: {
          userId,
          saleDate: { gte: dateRange.from, lte: dateRange.to },
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: dateRange.from, lte: dateRange.to },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalEarnings = Number(earnings._sum.amount || 0);
    const totalSales = Number(sales._sum.amount || 0);
    const totalExpenses = Number(expenses._sum.amount || 0);
    const totalRevenue = totalEarnings + totalSales;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalEarnings,
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      period: config.period || 'month',
    };
  }

  /**
   * Get goals data
   */
  private async getGoalsData(userId: string, config: any) {
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        status: config.status || 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: config.limit || 5,
    });

    return goals.map(goal => ({
      id: goal.id,
      title: goal.title,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      progress: (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100,
      deadline: goal.deadline,
      status: goal.status,
    }));
  }

  /**
   * Get invoices data
   */
  private async getInvoicesData(userId: string, config: any) {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        ...(config.status && { status: config.status }),
      },
      orderBy: { invoiceDate: 'desc' },
      take: config.limit || 10,
    });

    const total = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const paid = invoices.filter(i => i.status === 'PAID').length;
    const overdue = invoices.filter(i => i.status === 'OVERDUE').length;

    return {
      total,
      count: invoices.length,
      paid,
      overdue,
      pending: invoices.length - paid - overdue,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: Number(inv.totalAmount),
        status: inv.status,
        dueDate: inv.dueDate,
      })),
    };
  }

  /**
   * Get platforms data
   */
  private async getPlatformsData(userId: string, config: any) {
    const dateRange = this.getDateRange(config.period || 'month');

    const platforms = await prisma.platform.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        earnings: {
          where: {
            date: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        },
      },
    });

    return platforms.map(platform => ({
      id: platform.id,
      name: platform.name,
      category: platform.category,
      totalEarnings: platform.earnings.reduce((sum, e) => sum + Number(e.amount), 0),
      earningsCount: platform.earnings.length,
      avgEarning: platform.earnings.length > 0
        ? platform.earnings.reduce((sum, e) => sum + Number(e.amount), 0) / platform.earnings.length
        : 0,
    }));
  }

  /**
   * Get products data
   */
  private async getProductsData(userId: string, config: any) {
    const products = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        sales: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
      orderBy: config.orderBy === 'quantity'
        ? { quantity: 'asc' }
        : { name: 'asc' },
      take: config.limit || 10,
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      quantity: Number(product.quantity),
      price: Number(product.price),
      reorderPoint: Number(product.reorderPoint),
      lowStock: Number(product.quantity) <= Number(product.reorderPoint),
      totalSales: product.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
      unitsSold: product.sales.reduce((sum, s) => sum + Number(s.quantity), 0),
    }));
  }

  /**
   * Get widget templates
   */
  async getWidgetTemplates(category?: string) {
    try {
      const templates = await prisma.widgetTemplate.findMany({
        where: category ? { category } : undefined,
        orderBy: { name: 'asc' },
      });

      return templates.map(template => ({
        ...template,
        config: JSON.parse(template.config),
      }));
    } catch (error) {
      logger.error('Get widget templates error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create preset dashboards for new users
   */
  async createPresetDashboards(userId: string) {
    try {
      // Executive Summary Dashboard
      await this.createDashboard(userId, {
        name: 'Executive Summary',
        isDefault: true,
        layout: {
          cols: 12,
          rowHeight: 100,
        },
      });

      // Sales Analytics Dashboard
      await this.createDashboard(userId, {
        name: 'Sales Analytics',
        layout: {
          cols: 12,
          rowHeight: 100,
        },
      });

      // Financial Overview Dashboard
      await this.createDashboard(userId, {
        name: 'Financial Overview',
        layout: {
          cols: 12,
          rowHeight: 100,
        },
      });

      logger.info(`Created preset dashboards for user ${userId}`);
    } catch (error) {
      logger.error('Create preset dashboards error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Helper: Get date range based on period
   */
  private getDateRange(period: string): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();

    switch (period) {
      case 'week':
        from.setDate(to.getDate() - 7);
        break;
      case 'month':
        from.setMonth(to.getMonth() - 1);
        break;
      case 'quarter':
        from.setMonth(to.getMonth() - 3);
        break;
      case 'year':
        from.setFullYear(to.getFullYear() - 1);
        break;
      default:
        from.setMonth(to.getMonth() - 1);
    }

    return { from, to };
  }

  /**
   * Helper: Calculate trend percentage
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    if (firstAvg === 0) return 0;

    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }
}

export const dashboardService = new DashboardService();
