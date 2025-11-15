import { Router } from 'express';
import {
  getReferralLink,
  trackReferralSignup,
  trackConversion,
  getAffiliateStats,
  getAffiliateLeaderboard,
  getPayoutStatus,
  requestPayout,
  getAffiliateResources,
} from '../controllers/affiliate.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/leaderboard', getAffiliateLeaderboard);
router.get('/resources', getAffiliateResources);
router.post('/track/signup', trackReferralSignup);
router.post('/track/conversion', trackConversion);

// Protected routes
router.get('/link', auth, getReferralLink);
router.get('/stats', auth, getAffiliateStats);
router.get('/payout', auth, getPayoutStatus);
router.post('/payout/request', auth, requestPayout);

export default router;
