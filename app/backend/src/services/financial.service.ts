import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface IncomeStatement {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  taxLiability: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenueBreakdown: {
    earnings: number;
    sales: number;
    invoices: number;
  };
  expenseBreakdown: {
    byCategory: Record<string, number>;
    total: number;
  };
}

export interface CashFlowAnalysis {
  period: {
    startDate: Date;
    endDate: Date;
  };
  operatingCashFlow: number;
  cashInflows: {
    earnings: number;
    sales: number;
    invoices: number;
    total: number;
  };
  cashOutflows: {
    expenses: number;
    taxPayments: number;
    total: number;
  };
  netCashFlow: number;
  cashFlowTrend: Array<{
    date: string;
    amount: number;
  }>;
}

export interface TaxReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalTaxLiability: number;
  taxByCategory: Array<{
    categoryName: string;
    percentage: number;
    baseAmount: number;
    taxAmount: number;
  }>;
  deductibleExpenses: number;
  taxableIncome: number;
  quarterlyBreakdown?: Array<{
    quarter: string;
    taxLiability: number;
  }>;
}

export interface FinancialRatios {
  profitMargin: number;
  roi: number;
  cashFlow: number;
  debtRatio: number;
  assetTurnover: number;
}

export interface ProfitAndLossStatement {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    earnings: number;
    sales: number;
    invoices: number;
    total: number;
  };
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: {
    byCategory: Record<string, number>;
    total: number;
  };
  operatingIncome: number;
  taxes: number;
  netIncome: number;
  profitMargin: number;
}

class FinancialService {
  /**
   * Calculate income statement for a given period
   */
  async calculateIncomeStatement(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IncomeStatement> {
    // Fetch all earnings in the period
    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalEarnings = earnings.reduce(
      (sum, earning) => sum + Number(earning.amount),
      0
    );

    // Fetch all sales in the period
    const sales = await prisma.sale.findMany({
      where: {
        userId,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
    });

    const totalSales = sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );

    // Fetch all paid invoices in the period
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        status: 'PAID',
        paidDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalInvoices = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0
    );

    const totalRevenue = totalEarnings + totalSales + totalInvoices;

    // Fetch all expenses in the period
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const expenseBreakdown: Record<string, number> = {};
    let totalExpenses = 0;

    expenses.forEach((expense) => {
      const amount = Number(expense.amount);
      totalExpenses += amount;
      expenseBreakdown[expense.category] =
        (expenseBreakdown[expense.category] || 0) + amount;
    });

    // Calculate tax liability
    const taxCategories = await prisma.taxCategory.findMany({
      where: { userId },
    });

    let taxLiability = 0;
    if (taxCategories.length > 0) {
      // Apply tax categories to revenue
      taxCategories.forEach((category) => {
        taxLiability += totalRevenue * (Number(category.percentage) / 100);
      });
    }

    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit - taxLiability;

    return {
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit,
      taxLiability,
      period: {
        startDate,
        endDate,
      },
      revenueBreakdown: {
        earnings: totalEarnings,
        sales: totalSales,
        invoices: totalInvoices,
      },
      expenseBreakdown: {
        byCategory: expenseBreakdown,
        total: totalExpenses,
      },
    };
  }

  /**
   * Calculate cash flow analysis
   */
  async calculateCashFlow(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CashFlowAnalysis> {
    const incomeStatement = await this.calculateIncomeStatement(
      userId,
      startDate,
      endDate
    );

    // Calculate daily cash flow trend
    const cashFlowTrend: Array<{ date: string; amount: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyEarnings = await prisma.earning.aggregate({
        where: {
          userId,
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const dailyExpenses = await prisma.expense.aggregate({
        where: {
          userId,
          expenseDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const dailyCashFlow =
        Number(dailyEarnings._sum.amount || 0) -
        Number(dailyExpenses._sum.amount || 0);

      cashFlowTrend.push({
        date: currentDate.toISOString().split('T')[0],
        amount: dailyCashFlow,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const cashInflows = {
      earnings: incomeStatement.revenueBreakdown.earnings,
      sales: incomeStatement.revenueBreakdown.sales,
      invoices: incomeStatement.revenueBreakdown.invoices,
      total: incomeStatement.totalRevenue,
    };

    const cashOutflows = {
      expenses: incomeStatement.totalExpenses,
      taxPayments: incomeStatement.taxLiability,
      total: incomeStatement.totalExpenses + incomeStatement.taxLiability,
    };

    const netCashFlow = cashInflows.total - cashOutflows.total;

    return {
      period: {
        startDate,
        endDate,
      },
      operatingCashFlow: netCashFlow,
      cashInflows,
      cashOutflows,
      netCashFlow,
      cashFlowTrend,
    };
  }

  /**
   * Generate tax report
   */
  async generateTaxReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaxReport> {
    const incomeStatement = await this.calculateIncomeStatement(
      userId,
      startDate,
      endDate
    );

    const taxCategories = await prisma.taxCategory.findMany({
      where: { userId },
    });

    const taxByCategory = taxCategories.map((category) => {
      const baseAmount = incomeStatement.totalRevenue;
      const taxAmount = baseAmount * (Number(category.percentage) / 100);

      return {
        categoryName: category.name,
        percentage: Number(category.percentage),
        baseAmount,
        taxAmount,
      };
    });

    // Calculate deductible expenses
    const deductibleExpenses = await prisma.expense.aggregate({
      where: {
        userId,
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
        isTaxDeductible: true,
      },
      _sum: {
        amount: true,
      },
    });

    const taxableIncome =
      incomeStatement.totalRevenue - Number(deductibleExpenses._sum.amount || 0);

    // Calculate quarterly breakdown if period spans multiple quarters
    const quarterlyBreakdown: Array<{ quarter: string; taxLiability: number }> = [];
    const yearStart = startDate.getFullYear();
    const yearEnd = endDate.getFullYear();

    for (let year = yearStart; year <= yearEnd; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const qStart = new Date(year, (quarter - 1) * 3, 1);
        const qEnd = new Date(year, quarter * 3, 0);

        if (qStart >= startDate && qEnd <= endDate) {
          const qStatement = await this.calculateIncomeStatement(
            userId,
            qStart,
            qEnd
          );
          quarterlyBreakdown.push({
            quarter: `${year}-Q${quarter}`,
            taxLiability: qStatement.taxLiability,
          });
        }
      }
    }

    return {
      period: {
        startDate,
        endDate,
      },
      totalTaxLiability: incomeStatement.taxLiability,
      taxByCategory,
      deductibleExpenses: Number(deductibleExpenses._sum.amount || 0),
      taxableIncome,
      quarterlyBreakdown:
        quarterlyBreakdown.length > 0 ? quarterlyBreakdown : undefined,
    };
  }

  /**
   * Calculate financial metrics and ratios
   */
  async calculateFinancialMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialRatios> {
    const incomeStatement = await this.calculateIncomeStatement(
      userId,
      startDate,
      endDate
    );

    const cashFlow = await this.calculateCashFlow(userId, startDate, endDate);

    // Profit Margin = (Net Profit / Total Revenue) * 100
    const profitMargin =
      incomeStatement.totalRevenue > 0
        ? (incomeStatement.netProfit / incomeStatement.totalRevenue) * 100
        : 0;

    // ROI = (Net Profit / Total Expenses) * 100
    const roi =
      incomeStatement.totalExpenses > 0
        ? (incomeStatement.netProfit / incomeStatement.totalExpenses) * 100
        : 0;

    // Cash Flow (net)
    const netCashFlow = cashFlow.netCashFlow;

    // Debt Ratio = Total Expenses / Total Revenue
    const debtRatio =
      incomeStatement.totalRevenue > 0
        ? (incomeStatement.totalExpenses / incomeStatement.totalRevenue) * 100
        : 0;

    // Asset Turnover = Total Revenue / Total Expenses (simplified)
    const assetTurnover =
      incomeStatement.totalExpenses > 0
        ? incomeStatement.totalRevenue / incomeStatement.totalExpenses
        : 0;

    return {
      profitMargin: Math.round(profitMargin * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      cashFlow: Math.round(netCashFlow * 100) / 100,
      debtRatio: Math.round(debtRatio * 100) / 100,
      assetTurnover: Math.round(assetTurnover * 100) / 100,
    };
  }

  /**
   * Generate Profit & Loss Statement
   */
  async generateProfitAndLoss(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProfitAndLossStatement> {
    const incomeStatement = await this.calculateIncomeStatement(
      userId,
      startDate,
      endDate
    );

    // Calculate Cost of Goods Sold (COGS) from sales
    const sales = await prisma.sale.findMany({
      where: {
        userId,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        product: true,
      },
    });

    let costOfGoodsSold = 0;
    sales.forEach((sale) => {
      if (sale.product.supplierCost) {
        costOfGoodsSold +=
          Number(sale.product.supplierCost) * Number(sale.quantity);
      }
    });

    const grossProfit = incomeStatement.totalRevenue - costOfGoodsSold;
    const operatingIncome = grossProfit - incomeStatement.totalExpenses;
    const netIncome = operatingIncome - incomeStatement.taxLiability;

    const profitMargin =
      incomeStatement.totalRevenue > 0
        ? (netIncome / incomeStatement.totalRevenue) * 100
        : 0;

    return {
      period: {
        startDate,
        endDate,
      },
      revenue: {
        earnings: incomeStatement.revenueBreakdown.earnings,
        sales: incomeStatement.revenueBreakdown.sales,
        invoices: incomeStatement.revenueBreakdown.invoices,
        total: incomeStatement.totalRevenue,
      },
      costOfGoodsSold,
      grossProfit,
      operatingExpenses: {
        byCategory: incomeStatement.expenseBreakdown.byCategory,
        total: incomeStatement.totalExpenses,
      },
      operatingIncome,
      taxes: incomeStatement.taxLiability,
      netIncome,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  }

  /**
   * Create a tax category
   */
  async createTaxCategory(
    userId: string,
    name: string,
    percentage: number,
    description?: string
  ) {
    return await prisma.taxCategory.create({
      data: {
        userId,
        name,
        percentage: new Decimal(percentage),
        description,
      },
    });
  }

  /**
   * Get all tax categories for a user
   */
  async getTaxCategories(userId: string) {
    return await prisma.taxCategory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Save financial report
   */
  async saveFinancialReport(
    userId: string,
    reportDate: Date,
    data: IncomeStatement
  ) {
    return await prisma.financialReport.create({
      data: {
        userId,
        reportDate,
        totalRevenue: new Decimal(data.totalRevenue),
        totalExpenses: new Decimal(data.totalExpenses),
        grossProfit: new Decimal(data.grossProfit),
        netProfit: new Decimal(data.netProfit),
        taxLiability: new Decimal(data.taxLiability),
      },
    });
  }

  /**
   * Save financial metrics
   */
  async saveFinancialMetrics(
    userId: string,
    period: string,
    metrics: FinancialRatios
  ) {
    return await prisma.financialMetrics.upsert({
      where: {
        userId_period: {
          userId,
          period,
        },
      },
      create: {
        userId,
        period,
        profitMargin: new Decimal(metrics.profitMargin),
        roi: new Decimal(metrics.roi),
        cashFlow: new Decimal(metrics.cashFlow),
        debtRatio: new Decimal(metrics.debtRatio),
        assetTurnover: new Decimal(metrics.assetTurnover),
      },
      update: {
        profitMargin: new Decimal(metrics.profitMargin),
        roi: new Decimal(metrics.roi),
        cashFlow: new Decimal(metrics.cashFlow),
        debtRatio: new Decimal(metrics.debtRatio),
        assetTurnover: new Decimal(metrics.assetTurnover),
      },
    });
  }

  /**
   * Get period dates based on period type
   */
  getPeriodDates(periodType: string, date?: Date): { startDate: Date; endDate: Date } {
    const now = date || new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (periodType) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'annual':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }
}

export default new FinancialService();
