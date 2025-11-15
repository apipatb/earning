import { Router, raw } from 'express';
import {
  getPricing,
  createCheckoutSession,
  handleWebhook,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getCustomerPortal,
} from '../controllers/payment.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/pricing', getPricing);
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  handleWebhook
);

// Protected routes
router.post('/checkout', auth, createCheckoutSession);
router.get('/subscription', auth, getSubscription);
router.put('/subscription', auth, updateSubscription);
router.delete('/subscription', auth, cancelSubscription);
router.get('/portal', auth, getCustomerPortal);

export default router;
