import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getExpenseCategories,
  getExpenseAnalytics,
  setBudget,
  getBudgets,
  getBudgetStatus,
  generateExpenseReport,
  getExpenseStatistics,
  createTeamExpense,
  getTeamExpenses,
  approveExpense,
  rejectExpense,
} from '../controllers/expense.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Expense Management
router.post('/expenses', auth, createExpense);
router.get('/expenses', auth, getExpenses);
router.get('/expenses/:expenseId', auth, getExpenseById);
router.put('/expenses/:expenseId', auth, updateExpense);
router.delete('/expenses/:expenseId', auth, deleteExpense);

// Project Management
router.post('/projects', auth, createProject);
router.get('/projects', auth, getProjects);
router.get('/projects/:projectId', auth, getProjectById);
router.put('/projects/:projectId', auth, updateProject);
router.delete('/projects/:projectId', auth, deleteProject);

// Expense Categories
router.get('/categories', getExpenseCategories);

// Expense Analytics
router.get('/analytics', auth, getExpenseAnalytics);

// Budget Management
router.post('/budgets', auth, setBudget);
router.get('/budgets', auth, getBudgets);
router.get('/budgets/status', auth, getBudgetStatus);

// Reports & Statistics
router.post('/reports/generate', auth, generateExpenseReport);
router.get('/statistics', auth, getExpenseStatistics);

// Team Expenses
router.post('/team-expenses', auth, createTeamExpense);
router.get('/team-expenses', auth, getTeamExpenses);

// Approval Workflow
router.put('/expenses/:expenseId/approve', auth, approveExpense);
router.put('/expenses/:expenseId/reject', auth, rejectExpense);

export default router;
