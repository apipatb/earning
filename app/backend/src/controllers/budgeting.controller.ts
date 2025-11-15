import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Budget Management
export const createBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const {
      name,
      description,
      budgetType,
      amount,
      period,
      startDate,
      endDate,
      categories,
      alertThreshold,
      isActive,
    } = req.body;

    if (!name || !amount || !period) {
      return res.status(400).json({ error: 'Name, amount, and period are required' });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        name,
        description,
        budgetType: budgetType || 'spending',
        amount: parseFloat(amount),
        period,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        categories: categories || [],
        alertThreshold: alertThreshold || 80,
        isActive: isActive !== false,
      },
    });

    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
};

export const getBudgets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { period, limit = 50, offset = 0 } = req.query;

    const where: any = { userId, isActive: true };
    if (period) {
      where.period = period;
    }

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.budget.count({ where });

    res.json({ budgets, total });
  } catch (error) {
    next(error);
  }
};

export const getBudgetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { budgetId } = req.params;

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    next(error);
  }
};

export const updateBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { budgetId } = req.params;
    const { name, amount, categories, alertThreshold } = req.body;

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const updated = await prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(name && { name }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(categories && { categories }),
        ...(alertThreshold && { alertThreshold }),
        updatedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { budgetId } = req.params;

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    await prisma.budget.update({
      where: { id: budgetId },
      data: { isActive: false },
    });

    res.json({ message: 'Budget deleted' });
  } catch (error) {
    next(error);
  }
};

// Budget vs Actual
export const getBudgetAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { budgetId } = req.params;

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Get earnings in budget period
    const earnings = await prisma.earning.findMany({
      where: {
        userId,
        date: {
          gte: budget.startDate,
          ...(budget.endDate && { lte: budget.endDate }),
        },
      },
      include: { platform: true },
    });

    const totalActual = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const remaining = budget.amount - totalActual;
    const percentageUsed = (totalActual / budget.amount) * 100;

    // Category breakdown
    const categoryBreakdown: { [key: string]: number } = {};
    if (budget.categories.length > 0) {
      earnings.forEach((e) => {
        const category = e.platform.category || 'uncategorized';
        if (budget.categories.includes(category)) {
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Number(e.amount);
        }
      });
    }

    // Alert status
    const isOverBudget = percentageUsed > 100;
    const isWarning = percentageUsed > budget.alertThreshold;

    res.json({
      budget: {
        budgeted: budget.amount,
        actual: totalActual,
        remaining,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        isOverBudget,
        isWarning,
        status: isOverBudget ? 'over_budget' : isWarning ? 'warning' : 'on_track',
      },
      categoryBreakdown,
      earnings: earnings.map((e) => ({
        date: e.date,
        platform: e.platform.name,
        amount: Number(e.amount),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Spending Forecast
export const getSpendingForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { budgetId, months = 3 } = req.params;

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Get historical earnings
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    const historicalEarnings = await prisma.earning.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
    });

    // Calculate monthly averages
    const monthlyData: { [key: string]: number } = {};
    historicalEarnings.forEach((e) => {
      const month = e.date.toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + Number(e.amount);
    });

    const monthlyAverages = Object.values(monthlyData);
    const avgMonthly = monthlyAverages.reduce((a, b) => a + b, 0) / Math.max(monthlyAverages.length, 1);

    // Forecast for next periods
    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const monthKey = forecastDate.toISOString().substring(0, 7);

      forecast.push({
        period: monthKey,
        forecastedAmount: Math.round(avgMonthly * 100) / 100,
        budgetAmount: budget.amount,
        variance: Math.round((budget.amount - avgMonthly) * 100) / 100,
        percentageOfBudget: Math.round((avgMonthly / budget.amount) * 10000) / 100,
      });
    }

    res.json({
      historicalAverage: Math.round(avgMonthly * 100) / 100,
      forecast,
      trend: avgMonthly > budget.amount ? 'over_budget' : 'on_track',
    });
  } catch (error) {
    next(error);
  }
};

// Category-based Budgeting
export const createCategoryBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { category, amount, period, alertThreshold } = req.body;

    if (!category || !amount || !period) {
      return res.status(400).json({ error: 'Category, amount, and period are required' });
    }

    const categoryBudget = await prisma.categoryBudget.create({
      data: {
        userId,
        category,
        amount: parseFloat(amount),
        period,
        alertThreshold: alertThreshold || 80,
        isActive: true,
      },
    });

    res.status(201).json(categoryBudget);
  } catch (error) {
    next(error);
  }
};

export const getCategoryBudgets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const categoryBudgets = await prisma.categoryBudget.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(categoryBudgets);
  } catch (error) {
    next(error);
  }
};

// Budget Templates
export const getBudgetTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = [
      {
        id: 'monthly_personal',
        name: 'Monthly Personal Budget',
        description: 'Basic monthly budget for personal finances',
        budgetType: 'spending',
        period: 'month',
        categories: ['freelance', 'delivery', 'services'],
      },
      {
        id: 'quarterly_professional',
        name: 'Quarterly Professional Budget',
        description: 'Quarterly budget for professional earnings',
        budgetType: 'revenue',
        period: 'quarter',
        categories: ['freelance', 'consulting'],
      },
      {
        id: 'annual_savings',
        name: 'Annual Savings Goal',
        description: 'Annual budget focused on savings targets',
        budgetType: 'savings',
        period: 'year',
        categories: [],
      },
      {
        id: 'project_budget',
        name: 'Project-based Budget',
        description: 'Custom budget for specific projects',
        budgetType: 'project',
        period: 'custom',
        categories: [],
      },
    ];

    res.json(templates);
  } catch (error) {
    next(error);
  }
};

export const createFromTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { templateId, name, amount } = req.body;

    const templates: { [key: string]: any } = {
      monthly_personal: {
        budgetType: 'spending',
        period: 'month',
        categories: ['freelance', 'delivery', 'services'],
      },
      quarterly_professional: {
        budgetType: 'revenue',
        period: 'quarter',
        categories: ['freelance', 'consulting'],
      },
      annual_savings: {
        budgetType: 'savings',
        period: 'year',
        categories: [],
      },
      project_budget: {
        budgetType: 'project',
        period: 'custom',
        categories: [],
      },
    };

    const template = templates[templateId];
    if (!template) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        name: name || `Budget from ${templateId}`,
        budgetType: template.budgetType,
        amount: parseFloat(amount),
        period: template.period,
        categories: template.categories,
        startDate: new Date(),
        isActive: true,
      },
    });

    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
};

// Financial Planning
export const createFinancialPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const {
      name,
      description,
      timeframe,
      targetAmount,
      currentAmount,
      priority,
      categories,
    } = req.body;

    if (!name || !timeframe || !targetAmount) {
      return res.status(400).json({ error: 'Name, timeframe, and target amount are required' });
    }

    const plan = await prisma.financialPlan.create({
      data: {
        userId,
        name,
        description,
        timeframe,
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        priority: priority || 'medium',
        categories: categories || [],
        status: 'active',
        createdAt: new Date(),
      },
    });

    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

export const getFinancialPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { status = 'active' } = req.query;

    const plans = await prisma.financialPlan.findMany({
      where: { userId, status: status as string },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate progress
    const plansWithProgress = plans.map((plan) => ({
      ...plan,
      progress: (plan.currentAmount / plan.targetAmount) * 100,
      remaining: plan.targetAmount - plan.currentAmount,
    }));

    res.json(plansWithProgress);
  } catch (error) {
    next(error);
  }
};

export const updateFinancialPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { planId } = req.params;
    const { currentAmount, status } = req.body;

    const plan = await prisma.financialPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.userId !== userId) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const updated = await prisma.financialPlan.update({
      where: { id: planId },
      data: {
        ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
        ...(status && { status }),
        updatedAt: new Date(),
      },
    });

    const progress = (updated.currentAmount / updated.targetAmount) * 100;

    res.json({
      ...updated,
      progress,
      remaining: updated.targetAmount - updated.currentAmount,
    });
  } catch (error) {
    next(error);
  }
};

// Budget vs Actual Report
export const getBudgetReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { period = 'month' } = req.query;

    const budgets = await prisma.budget.findMany({
      where: { userId, isActive: true, period: period as string },
    });

    const reports = await Promise.all(
      budgets.map(async (budget) => {
        const earnings = await prisma.earning.findMany({
          where: {
            userId,
            date: {
              gte: budget.startDate,
              ...(budget.endDate && { lte: budget.endDate }),
            },
          },
        });

        const actual = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
        const variance = budget.amount - actual;
        const variancePercent = (variance / budget.amount) * 100;

        return {
          budgetId: budget.id,
          budgetName: budget.name,
          budgeted: budget.amount,
          actual,
          variance,
          variancePercent: Math.round(variancePercent * 100) / 100,
          status: actual > budget.amount ? 'over' : 'under',
        };
      })
    );

    const totalBudgeted = reports.reduce((sum, r) => sum + r.budgeted, 0);
    const totalActual = reports.reduce((sum, r) => sum + r.actual, 0);

    res.json({
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance: totalBudgeted - totalActual,
        period,
      },
      budgets: reports,
    });
  } catch (error) {
    next(error);
  }
};

// Budget Insights
export const getBudgetInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const budgets = await prisma.budget.findMany({
      where: { userId, isActive: true },
    });

    const insights = [];

    // Check for overspending
    const overBudgetBudgets = await Promise.all(
      budgets.map(async (budget) => {
        const earnings = await prisma.earning.findMany({
          where: {
            userId,
            date: { gte: budget.startDate, ...(budget.endDate && { lte: budget.endDate }) },
          },
        });

        const total = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
        return { budget, actual: total };
      })
    );

    overBudgetBudgets.forEach(({ budget, actual }) => {
      if (actual > budget.amount) {
        insights.push({
          type: 'over_budget_warning',
          title: `Over Budget: ${budget.name}`,
          description: `You have exceeded your budget by $${(actual - budget.amount).toFixed(2)}`,
          severity: 'warning',
          budgetId: budget.id,
        });
      }
    });

    // Check for unused budgets
    const unusedBudgets = overBudgetBudgets.filter(({ actual }) => actual === 0);
    if (unusedBudgets.length > 0) {
      insights.push({
        type: 'unused_budgets',
        title: `${unusedBudgets.length} Unused Budgets`,
        description: 'You have budgets with no earnings recorded',
        severity: 'info',
      });
    }

    res.json(insights);
  } catch (error) {
    next(error);
  }
};
