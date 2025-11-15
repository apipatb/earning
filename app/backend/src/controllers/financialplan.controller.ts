import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createFinancialPlan = async (req: Request, res: Response) => {
  const { name, description, timeHorizon, startDate, endDate, riskProfile, goals } = req.body;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.create({
    data: {
      userId,
      name,
      description,
      timeHorizon: timeHorizon || 'medium_term', // short_term, medium_term, long_term
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      riskProfile: riskProfile || 'moderate', // conservative, moderate, aggressive
      goals: JSON.stringify(goals || []),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  res.status(201).json(plan);
};

export const getFinancialPlans = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const plans = await prisma.financialPlan.findMany({
    where: { userId },
    include: {
      scenarios: true,
      forecasts: true,
      goals: true,
      alerts: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(plans);
};

export const getFinancialPlanById = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({
    where: { id: planId },
    include: {
      scenarios: true,
      forecasts: { orderBy: { date: 'asc' } },
      goals: true,
      alerts: true
    }
  });

  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  res.json(plan);
};

export const updateFinancialPlan = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;
  const { name, description, status, riskProfile } = req.body;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const updated = await prisma.financialPlan.update({
    where: { id: planId },
    data: {
      ...(name && { name }),
      ...(description && { description }),
      ...(status && { status }),
      ...(riskProfile && { riskProfile }),
      updatedAt: new Date()
    }
  });

  res.json(updated);
};

export const deleteFinancialPlan = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  await prisma.financialPlan.delete({ where: { id: planId } });

  res.json({ success: true, message: 'Plan deleted' });
};

export const createScenario = async (req: Request, res: Response) => {
  const { planId, name, description, incomeGrowth, expenseGrowth, savingsRate, assumptions } = req.body;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const scenario = await prisma.financialScenario.create({
    data: {
      userId,
      planId,
      name,
      description,
      incomeGrowth: parseFloat(incomeGrowth) || 0,
      expenseGrowth: parseFloat(expenseGrowth) || 0,
      savingsRate: parseFloat(savingsRate) || 0,
      assumptions: JSON.stringify(assumptions || {}),
      createdAt: new Date()
    }
  });

  res.status(201).json(scenario);
};

export const getScenarios = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const scenarios = await prisma.financialScenario.findMany({
    where: { planId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(scenarios);
};

export const createForecast = async (req: Request, res: Response) => {
  const { planId, scenarioId, date, incomeProjection, expenseProjection, savingsProjection, cashFlow, netWorth } = req.body;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const forecast = await prisma.financialForecast.create({
    data: {
      userId,
      planId,
      scenarioId: scenarioId || null,
      date: new Date(date),
      incomeProjection: parseFloat(incomeProjection) || 0,
      expenseProjection: parseFloat(expenseProjection) || 0,
      savingsProjection: parseFloat(savingsProjection) || 0,
      cashFlow: parseFloat(cashFlow) || 0,
      netWorth: parseFloat(netWorth) || 0,
      createdAt: new Date()
    }
  });

  res.status(201).json(forecast);
};

export const getForecasts = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const forecasts = await prisma.financialForecast.findMany({
    where: { planId },
    orderBy: { date: 'asc' }
  });

  res.json(forecasts);
};

export const createGoal = async (req: Request, res: Response) => {
  const { planId, name, description, targetAmount, targetDate, category, priority } = req.body;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const goal = await prisma.FinancialGoal.create({
    data: {
      userId,
      planId,
      name,
      description,
      targetAmount: parseFloat(targetAmount) || 0,
      targetDate: new Date(targetDate),
      category: category || 'general',
      priority: priority || 'medium',
      currentAmount: 0,
      status: 'active',
      createdAt: new Date()
    }
  });

  res.status(201).json(goal);
};

export const getGoals = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const goals = await prisma.FinancialGoal.findMany({
    where: { planId },
    orderBy: { targetDate: 'asc' }
  });

  res.json(goals);
};

export const updateGoalProgress = async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const userId = (req as any).userId;
  const { currentAmount, status } = req.body;

  const goal = await prisma.FinancialGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) {
    return res.status(404).json({ error: 'Goal not found' });
  }

  const updated = await prisma.FinancialGoal.update({
    where: { id: goalId },
    data: {
      ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
      ...(status && { status }),
      updatedAt: new Date()
    }
  });

  res.json(updated);
};

export const createRiskAnalysis = async (req: Request, res: Response) => {
  const { planId, riskType, probability, impact, mitigation } = req.body;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const analysis = await prisma.financialRiskAnalysis.create({
    data: {
      userId,
      planId,
      riskType,
      probability: parseFloat(probability) || 0,
      impact: parseFloat(impact) || 0,
      mitigation: JSON.stringify(mitigation || {}),
      createdAt: new Date()
    }
  });

  res.status(201).json(analysis);
};

export const getRiskAnalyses = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const risks = await prisma.financialRiskAnalysis.findMany({
    where: { planId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(risks);
};

export const createAlert = async (req: Request, res: Response) => {
  const { planId, type, threshold, condition, message } = req.body;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const alert = await prisma.financialAlert.create({
    data: {
      userId,
      planId,
      type, // spending_alert, income_alert, goal_alert, threshold_alert
      threshold: parseFloat(threshold) || 0,
      condition,
      message,
      isActive: true,
      createdAt: new Date()
    }
  });

  res.status(201).json(alert);
};

export const getAlerts = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const userId = (req as any).userId;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const alerts = await prisma.financialAlert.findMany({
    where: { planId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(alerts);
};

export const getFinancialAnalytics = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const totalPlans = await prisma.financialPlan.count({ where: { userId } });
  const activePlans = await prisma.financialPlan.count({ where: { userId, status: 'active' } });

  const goals = await prisma.FinancialGoal.findMany({ where: { userId } });
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const completionRate = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;

  const totalGoalAmount = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const progressPercentage = totalGoalAmount > 0 ? (totalCurrentAmount / totalGoalAmount) * 100 : 0;

  const risks = await prisma.financialRiskAnalysis.findMany({ where: { userId } });
  const highRisks = risks.filter(r => (r.probability || 0) * (r.impact || 0) > 0.5).length;

  const latestForecasts = await prisma.financialForecast.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 12
  });

  res.json({
    planMetrics: {
      totalPlans,
      activePlans,
      inactivePlans: totalPlans - activePlans
    },
    goalMetrics: {
      totalGoals: goals.length,
      completedGoals,
      completionRate: completionRate.toFixed(2),
      totalTargetAmount: totalGoalAmount,
      totalCurrentAmount,
      progressPercentage: progressPercentage.toFixed(2)
    },
    riskMetrics: {
      totalRisks: risks.length,
      highRisks,
      mediumRisks: risks.filter(r => (r.probability || 0) * (r.impact || 0) > 0.25 && (r.probability || 0) * (r.impact || 0) <= 0.5).length
    },
    forecastTrends: latestForecasts.map(f => ({
      date: f.date,
      income: f.incomeProjection,
      expense: f.expenseProjection,
      savings: f.savingsProjection,
      cashFlow: f.cashFlow
    }))
  });
};

export const compareScenariosAnalysis = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { planId, scenarioIds } = req.body;

  const plan = await prisma.financialPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const scenarios = await prisma.financialScenario.findMany({
    where: { id: { in: scenarioIds } }
  });

  const comparison = scenarios.map(s => ({
    id: s.id,
    name: s.name,
    incomeGrowth: s.incomeGrowth,
    expenseGrowth: s.expenseGrowth,
    savingsRate: s.savingsRate
  }));

  res.json({ comparison });
};

export const getFinancialRecommendations = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const recommendations = [];

  const goals = await prisma.FinancialGoal.findMany({ where: { userId } });
  const atRiskGoals = goals.filter(g => {
    const daysUntilTarget = (new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    const needed = g.targetAmount - (g.currentAmount || 0);
    const dailyRate = needed / Math.max(daysUntilTarget, 1);
    return dailyRate > 100;
  });

  if (atRiskGoals.length > 0) {
    recommendations.push({
      type: 'goal_at_risk',
      severity: 'high',
      message: `${atRiskGoals.length} financial goal(s) at risk. Consider increasing savings rate.`,
      affectedGoals: atRiskGoals.map(g => g.id)
    });
  }

  const plans = await prisma.financialPlan.findMany({ where: { userId } });
  const diverseRisks = plans.length > 0 && plans.some(p => p.riskProfile === 'aggressive');
  if (diverseRisks) {
    recommendations.push({
      type: 'risk_management',
      severity: 'medium',
      message: 'Consider diversifying investments to manage aggressive risk profile.'
    });
  }

  res.json({ recommendations });
};

export const getFinancialStatistics = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const plans = await prisma.financialPlan.findMany({ where: { userId } });
  const scenarios = await prisma.financialScenario.findMany({ where: { userId } });
  const forecasts = await prisma.financialForecast.findMany({ where: { userId } });
  const goals = await prisma.FinancialGoal.findMany({ where: { userId } });
  const risks = await prisma.financialRiskAnalysis.findMany({ where: { userId } });

  const avgIncomeProjection = forecasts.length > 0
    ? (forecasts.reduce((sum, f) => sum + (f.incomeProjection || 0), 0) / forecasts.length)
    : 0;

  const avgExpenseProjection = forecasts.length > 0
    ? (forecasts.reduce((sum, f) => sum + (f.expenseProjection || 0), 0) / forecasts.length)
    : 0;

  const maxNetWorth = Math.max(...forecasts.map(f => f.netWorth || 0), 0);

  res.json({
    planStatistics: {
      totalPlans: plans.length,
      byTimeHorizon: {
        shortTerm: plans.filter(p => p.timeHorizon === 'short_term').length,
        mediumTerm: plans.filter(p => p.timeHorizon === 'medium_term').length,
        longTerm: plans.filter(p => p.timeHorizon === 'long_term').length
      },
      byRiskProfile: {
        conservative: plans.filter(p => p.riskProfile === 'conservative').length,
        moderate: plans.filter(p => p.riskProfile === 'moderate').length,
        aggressive: plans.filter(p => p.riskProfile === 'aggressive').length
      }
    },
    scenarioStatistics: {
      totalScenarios: scenarios.length,
      avgIncomeGrowth: scenarios.length > 0
        ? (scenarios.reduce((sum, s) => sum + (s.incomeGrowth || 0), 0) / scenarios.length).toFixed(2)
        : 0,
      avgExpenseGrowth: scenarios.length > 0
        ? (scenarios.reduce((sum, s) => sum + (s.expenseGrowth || 0), 0) / scenarios.length).toFixed(2)
        : 0
    },
    forecastStatistics: {
      totalForecasts: forecasts.length,
      avgIncomeProjection: avgIncomeProjection.toFixed(2),
      avgExpenseProjection: avgExpenseProjection.toFixed(2),
      maxNetWorth: maxNetWorth.toFixed(2)
    },
    goalStatistics: {
      totalGoals: goals.length,
      byCategory: {
        retirement: goals.filter(g => g.category === 'retirement').length,
        education: goals.filter(g => g.category === 'education').length,
        homeOwnership: goals.filter(g => g.category === 'home_ownership').length,
        general: goals.filter(g => g.category === 'general').length
      }
    },
    riskStatistics: {
      totalRisks: risks.length,
      avgProbability: risks.length > 0
        ? (risks.reduce((sum, r) => sum + (r.probability || 0), 0) / risks.length).toFixed(2)
        : 0,
      avgImpact: risks.length > 0
        ? (risks.reduce((sum, r) => sum + (r.impact || 0), 0) / risks.length).toFixed(2)
        : 0
    }
  });
};
