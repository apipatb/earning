import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  registerWebhook,
  getUserWebhooks,
  getWebhookById,
  deleteWebhook,
  getWebhookLogs,
  sendTestWebhook,
  updateWebhookStatus,
} from '../controllers/webhook.controller';

const router = Router();

// All webhook routes require authentication
router.use(authenticate);

// Webhook management
router.post('/', registerWebhook);
router.get('/', getUserWebhooks);
router.get('/:id', getWebhookById);
router.delete('/:id', deleteWebhook);

// Webhook logs and testing
router.get('/:id/logs', getWebhookLogs);
router.post('/:id/test', sendTestWebhook);

// Webhook status management
router.patch('/:id/status', updateWebhookStatus);

export default router;
