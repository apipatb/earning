import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllAffiliateLinks,
  createAffiliateLink,
  updateAffiliateLink,
  deleteAffiliateLink,
  recordClick,
  addAffiliateEarning,
  getAffiliateStats,
} from '../controllers/affiliate-link.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllAffiliateLinks);
router.post('/', createAffiliateLink);
router.put('/:id', updateAffiliateLink);
router.delete('/:id', deleteAffiliateLink);
router.post('/:id/click', recordClick);
router.post('/:id/earnings', addAffiliateEarning);
router.get('/:id/stats', getAffiliateStats);

export default router;
