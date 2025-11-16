import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getMetrics,
  getDimensions,
  getFacts,
  exportData,
  getEvents,
  trackEvent,
  getLookerMetadata,
  getTableauSchema,
  getMeasures,
  getDashboardMetrics,
} from '../controllers/bi.controller';

const router = Router();

// All BI routes require authentication
router.use(authenticate);

// Metrics endpoints
router.get('/metrics', getMetrics);
router.get('/dashboard-metrics', getDashboardMetrics);
router.get('/measures', getMeasures);

// Dimension endpoints
router.get('/dimensions', getDimensions);

// Fact table endpoints
router.get('/facts', getFacts);

// Export endpoint
router.get('/export', exportData);

// Analytics events endpoints
router.get('/events', getEvents);
router.post('/events', trackEvent);

// BI tool integration endpoints
router.get('/looker/metadata', getLookerMetadata);
router.get('/tableau/schema', getTableauSchema);

export default router;
