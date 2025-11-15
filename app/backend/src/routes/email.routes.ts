import { Router } from 'express';
import {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getNewsletterSettings,
  updateNewsletterSettings,
  sendWeeklyNewsletter,
  createTemplate,
  getTemplates,
  sendBulkEmail,
  getEmailStats,
} from '../controllers/email.controller';
import { auth } from '../middleware/auth.middleware';
import { requireFeature, requirePaidTier } from '../middleware/tier.middleware';

const router = Router();

// Public routes
router.post('/subscribe', subscribeNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);

// Protected routes
router.get('/settings', auth, getNewsletterSettings);
router.put('/settings', auth, updateNewsletterSettings);
router.get('/stats', auth, getEmailStats);

// Template routes (Pro+)
router.post('/templates', auth, requireFeature('advancedAnalytics'), createTemplate);
router.get('/templates', auth, getTemplates);

// Bulk email (Business only)
router.post('/bulk', auth, requirePaidTier, sendBulkEmail);

// Admin routes
router.post('/send-weekly', sendWeeklyNewsletter); // Protected by secret key in production

export default router;
