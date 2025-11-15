import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Expense Management
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { projectId, categoryId, amount, description, date, paymentMethod, attachments } = req.body;
    const userId = (req as any).userId;

    const expense = await prisma.expense.create({
      data: {
        userId,
        projectId,
        categoryId,
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        paymentMethod: paymentMethod || 'cash',
        attachments: attachments ? JSON.stringify(attachments) : null,
        status: 'approved',
        createdAt: new Date(),
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create expense' });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, categoryId, status, dateFrom, dateTo, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (projectId) where.projectId = projectId;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const userId = (req as any).userId;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const { amount, description, categoryId, status } = req.body;
    const userId = (req as any).userId;

    const expense = await prisma.expense.updateMany({
      where: { id: expenseId, userId },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        description,
        categoryId,
        status,
        updatedAt: new Date(),
      },
    });

    res.json({ success: expense.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const userId = (req as any).userId;

    await prisma.expense.deleteMany({
      where: { id: expenseId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete expense' });
  }
};

// Project Management
export const createProject = async (req: Request, res: Response) => {
  try {
    const { projectName, clientName, description, budget, startDate, endDate } = req.body;
    const userId = (req as any).userId;

    const project = await prisma.project.create({
      data: {
        userId,
        projectName,
        clientName,
        description,
        budget: parseFloat(budget),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: 'active',
        createdAt: new Date(),
      },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create project' });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, limit = 50 } = req.query;

    const projects = await prisma.project.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        expenses: true,
      },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        expenses: true,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { projectName, description, budget, status } = req.body;
    const userId = (req as any).userId;

    const project = await prisma.project.updateMany({
      where: { id: projectId, userId },
      data: {
        projectName,
        description,
        ...(budget && { budget: parseFloat(budget) }),
        status,
        updatedAt: new Date(),
      },
    });

    res.json({ success: project.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).userId;

    await prisma.project.deleteMany({
      where: { id: projectId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete project' });
  }
};

// Expense Categories
export const getExpenseCategories = async (req: Request, res: Response) => {
  try {
    const categories = [
      { id: 'salaries', name: 'Salaries & Wages', icon: '👤' },
      { id: 'office', name: 'Office Supplies', icon: '📝' },
      { id: 'utilities', name: 'Utilities', icon: '💡' },
      { id: 'marketing', name: 'Marketing', icon: '📢' },
      { id: 'software', name: 'Software & Subscriptions', icon: '💻' },
      { id: 'travel', name: 'Travel & Transport', icon: '✈️' },
      { id: 'meals', name: 'Meals & Entertainment', icon: '🍽️' },
      { id: 'equipment', name: 'Equipment', icon: '🔧' },
      { id: 'insurance', name: 'Insurance', icon: '🛡️' },
      { id: 'other', name: 'Other Expenses', icon: '📦' },
    ];

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Expense Analytics
export const getExpenseAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        ...(projectId && { projectId: projectId as string }),
        date: { gte: startDate },
      },
      include: {
        project: true,
      },
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

    const expensesByCategory = {} as any;
    expenses.forEach((exp) => {
      if (!expensesByCategory[exp.categoryId]) {
        expensesByCategory[exp.categoryId] = { count: 0, total: 0 };
      }
      expensesByCategory[exp.categoryId].count++;
      expensesByCategory[exp.categoryId].total += exp.amount;
    });

    const analytics = {
      period: days,
      totalExpenses: expenses.length,
      totalAmount: totalExpenses,
      avgExpense,
      expensesByCategory,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Budget Management
export const setBudget = async (req: Request, res: Response) => {
  try {
    const { projectId, budgetAmount, period } = req.body;
    const userId = (req as any).userId;

    const budget = await prisma.projectBudget.create({
      data: {
        userId,
        projectId,
        budgetAmount: parseFloat(budgetAmount),
        period: period || 'monthly', // monthly, quarterly, yearly
        createdAt: new Date(),
      },
    });

    res.status(201).json(budget);
  } catch (error) {
    res.status(400).json({ error: 'Failed to set budget' });
  }
};

export const getBudgets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.query;

    const budgets = await prisma.projectBudget.findMany({
      where: {
        userId,
        ...(projectId && { projectId: projectId as string }),
      },
    });

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

// Budget Tracking
export const getBudgetStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.query;

    const where: any = { userId };
    if (projectId) where.projectId = projectId as string;

    const budgets = await prisma.projectBudget.findMany({
      where,
      include: {
        project: {
          include: {
            expenses: true,
          },
        },
      },
    });

    const budgetStatus = budgets.map((budget) => {
      const spent = budget.project?.expenses.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const remaining = budget.budgetAmount - spent;
      const percentageUsed = (spent / budget.budgetAmount) * 100;

      return {
        budgetId: budget.id,
        projectName: budget.project?.projectName,
        budgetAmount: budget.budgetAmount,
        spent,
        remaining,
        percentageUsed,
        status: percentageUsed > 100 ? 'overbudget' : percentageUsed > 80 ? 'warning' : 'healthy',
      };
    });

    res.json(budgetStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budget status' });
  }
};

// Expense Reports
export const generateExpenseReport = async (req: Request, res: Response) => {
  try {
    const { projectId, startDate, endDate, groupBy } = req.body;
    const userId = (req as any).userId;

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        ...(projectId && { projectId }),
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const report = {
      period: { start: startDate, end: endDate },
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      avgExpense: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0,
      expenses,
      generatedAt: new Date(),
    };

    res.json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate report' });
  }
};

// Expense Statistics
export const getExpenseStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 90 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
    });

    const stats = {
      period: days,
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      avgExpense: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0,
      maxExpense: expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0,
      minExpense: expenses.length > 0 ? Math.min(...expenses.map((e) => e.amount)) : 0,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Team Expense Tracking
export const createTeamExpense = async (req: Request, res: Response) => {
  try {
    const { projectId, description, amount, date, members } = req.body;
    const userId = (req as any).userId;

    const teamExpense = await prisma.teamExpense.create({
      data: {
        userId,
        projectId,
        description,
        totalAmount: parseFloat(amount),
        date: new Date(date),
        members: JSON.stringify(members),
        status: 'pending',
        createdAt: new Date(),
      },
    });

    res.status(201).json(teamExpense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create team expense' });
  }
};

export const getTeamExpenses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, limit = 50 } = req.query;

    const teamExpenses = await prisma.teamExpense.findMany({
      where: {
        userId,
        ...(projectId && { projectId: projectId as string }),
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(teamExpenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team expenses' });
  }
};

// Approval Workflow
export const approveExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const userId = (req as any).userId;

    const expense = await prisma.expense.updateMany({
      where: { id: expenseId, userId },
      data: { status: 'approved' },
    });

    res.json({ success: expense.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to approve expense' });
  }
};

export const rejectExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).userId;

    const expense = await prisma.expense.updateMany({
      where: { id: expenseId, userId },
      data: { status: 'rejected', notes: reason || null },
    });

    res.json({ success: expense.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to reject expense' });
  }
};
