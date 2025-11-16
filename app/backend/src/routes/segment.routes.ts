import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createSegment,
  getSegments,
  getSegmentById,
  updateSegment,
  deleteSegment,
  getSegmentAnalytics,
  addCustomersToSegment,
  removeCustomersFromSegment,
  refreshSegment,
  createPredefinedSegments,
  refreshAllSegments,
} from '../controllers/segment.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Segment operations
router.get('/', getSegments);
router.post('/', createSegment);
router.get('/:id', getSegmentById);
router.put('/:id', updateSegment);
router.delete('/:id', deleteSegment);

// Segment analytics
router.get('/:id/analytics', getSegmentAnalytics);

// Segment membership
router.post('/:id/members', addCustomersToSegment);
router.delete('/:id/members', removeCustomersFromSegment);

// Segment refresh
router.post('/:id/refresh', refreshSegment);

// Utility routes
router.post('/predefined', createPredefinedSegments);
router.post('/refresh-all', refreshAllSegments);

export default router;
