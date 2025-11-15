import { Router } from 'express';
import {
  generateReport,
  createScheduledReport,
  getScheduledReports,
  deleteScheduledReport,
  getReportHistory,
  getAnalyticsDashboard,
} from '../controllers/report.controller';
import { auth } from '../middleware/auth.middleware';
import { requireFeature } from '../middleware/tier.middleware';

const router = Router();

// Report generation
router.post('/generate', auth, generateReport);

// Scheduled reports (Pro+)
router.post('/scheduled', auth, requireFeature('advancedAnalytics'), createScheduledReport);
router.get('/scheduled', auth, getScheduledReports);
router.delete('/scheduled/:reportId', auth, deleteScheduledReport);

// Report history
router.get('/history', auth, getReportHistory);

// Analytics dashboard
router.get('/dashboard', auth, getAnalyticsDashboard);

export default router;
