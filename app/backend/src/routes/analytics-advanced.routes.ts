import { Router } from 'express';
import {
  createDashboard,
  getDashboards,
  updateDashboard,
  deleteDashboard,
  getFilteredEarnings,
  getTrendAnalysis,
  getComparativeAnalysis,
  getPlatformAnalysis,
  getGoalAnalysis,
  getRevenueSegmentation,
  getAdvancedInsights,
  exportAnalytics,
} from '../controllers/analytics-advanced.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Custom Dashboards
router.post('/dashboards', auth, createDashboard);
router.get('/dashboards', auth, getDashboards);
router.put('/dashboards/:dashboardId', auth, updateDashboard);
router.delete('/dashboards/:dashboardId', auth, deleteDashboard);

// Advanced Filtering
router.get('/filtered', auth, getFilteredEarnings);

// Trend Analysis
router.get('/trends', auth, getTrendAnalysis);

// Comparative Analysis
router.get('/compare', auth, getComparativeAnalysis);

// Platform Analysis
router.get('/platforms', auth, getPlatformAnalysis);

// Goal Analysis
router.get('/goals', auth, getGoalAnalysis);

// Revenue Segmentation
router.get('/segmentation', auth, getRevenueSegmentation);

// Advanced Insights
router.get('/insights', auth, getAdvancedInsights);

// Export
router.get('/export', auth, exportAnalytics);

export default router;
