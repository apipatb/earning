import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunitiesByStatus,
} from '../controllers/opportunity.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllOpportunities);
router.post('/', createOpportunity);
router.put('/:id', updateOpportunity);
router.delete('/:id', deleteOpportunity);
router.get('/stats/by-status', getOpportunitiesByStatus);

export default router;
