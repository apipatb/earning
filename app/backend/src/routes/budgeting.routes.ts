import { Router } from 'express';
import {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetAnalysis,
  getSpendingForecast,
  createCategoryBudget,
  getCategoryBudgets,
  getBudgetTemplates,
  createFromTemplate,
  createFinancialPlan,
  getFinancialPlans,
  updateFinancialPlan,
  getBudgetReport,
  getBudgetInsights,
} from '../controllers/budgeting.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Budget CRUD
router.post('/', auth, createBudget);
router.get('/', auth, getBudgets);
router.get('/:budgetId', auth, getBudgetById);
router.put('/:budgetId', auth, updateBudget);
router.delete('/:budgetId', auth, deleteBudget);

// Budget Analysis
router.get('/:budgetId/analysis', auth, getBudgetAnalysis);
router.get('/:budgetId/forecast/:months', auth, getSpendingForecast);

// Category Budgets
router.post('/categories', auth, createCategoryBudget);
router.get('/categories', auth, getCategoryBudgets);

// Templates
router.get('/templates', getBudgetTemplates);
router.post('/templates/create', auth, createFromTemplate);

// Financial Plans
router.post('/plans', auth, createFinancialPlan);
router.get('/plans', auth, getFinancialPlans);
router.put('/plans/:planId', auth, updateFinancialPlan);

// Reports & Insights
router.get('/reports/:period', auth, getBudgetReport);
router.get('/insights', auth, getBudgetInsights);

export default router;
