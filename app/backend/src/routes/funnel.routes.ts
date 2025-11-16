import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getFunnels,
  getFunnel,
  createFunnel,
  updateFunnel,
  deleteFunnel,
  trackEvent,
  getFunnelMetrics,
  calculateMetrics,
  getFunnelAnalysis,
  getCohortAnalysis,
  getSegmentAnalysis,
  createPresetFunnels,
} from '../controllers/funnel.controller';

const router = Router();

router.use(authenticate);

// Funnel management
router.get('/', getFunnels);
router.post('/', createFunnel);
router.post('/presets', createPresetFunnels);
router.get('/:id', getFunnel);
router.put('/:id', updateFunnel);
router.delete('/:id', deleteFunnel);

// Event tracking
router.post('/events', trackEvent);

// Metrics and analysis
router.get('/:id/metrics', getFunnelMetrics);
router.post('/:id/metrics/calculate', calculateMetrics);
router.get('/:id/analysis', getFunnelAnalysis);
router.get('/:id/cohort-analysis', getCohortAnalysis);
router.get('/:id/segment-analysis', getSegmentAnalysis);

export default router;
