import express from 'express';
import { auth } from '../middleware/auth.middleware';
import {
  createFinancialPlan,
  getFinancialPlans,
  getFinancialPlanById,
  updateFinancialPlan,
  deleteFinancialPlan,
  createScenario,
  getScenarios,
  createForecast,
  getForecasts,
  createGoal,
  getGoals,
  updateGoalProgress,
  createRiskAnalysis,
  getRiskAnalyses,
  createAlert,
  getAlerts,
  getFinancialAnalytics,
  compareScenariosAnalysis,
  getFinancialRecommendations,
  getFinancialStatistics,
} from '../controllers/financialplan.controller';

const router = express.Router();

// Financial Plans CRUD
router.post('/plans', auth, createFinancialPlan);
router.get('/plans', auth, getFinancialPlans);
router.get('/plans/:planId', auth, getFinancialPlanById);
router.put('/plans/:planId', auth, updateFinancialPlan);
router.delete('/plans/:planId', auth, deleteFinancialPlan);

// Scenarios
router.post('/plans/:planId/scenarios', auth, createScenario);
router.get('/plans/:planId/scenarios', auth, getScenarios);

// Forecasts
router.post('/plans/:planId/forecasts', auth, createForecast);
router.get('/plans/:planId/forecasts', auth, getForecasts);

// Goals
router.post('/plans/:planId/goals', auth, createGoal);
router.get('/plans/:planId/goals', auth, getGoals);
router.put('/goals/:goalId/progress', auth, updateGoalProgress);

// Risk Analysis
router.post('/plans/:planId/risks', auth, createRiskAnalysis);
router.get('/plans/:planId/risks', auth, getRiskAnalyses);

// Alerts
router.post('/plans/:planId/alerts', auth, createAlert);
router.get('/plans/:planId/alerts', auth, getAlerts);

// Analytics & Reporting
router.get('/analytics', auth, getFinancialAnalytics);
router.post('/compare-scenarios', auth, compareScenariosAnalysis);
router.get('/recommendations', auth, getFinancialRecommendations);
router.get('/statistics', auth, getFinancialStatistics);

export default router;
