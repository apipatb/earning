import { Router } from 'express';
import {
  createApiKey,
  getApiKeys,
  revokeApiKey,
  createWebhook,
  getWebhooks,
  testWebhook,
  getApiUsage,
  getApiDocs,
} from '../controllers/api.controller';
import { auth } from '../middleware/auth.middleware';
import { requirePaidTier } from '../middleware/tier.middleware';

const router = Router();

// API Key routes
router.post('/keys', auth, requirePaidTier, createApiKey);
router.get('/keys', auth, getApiKeys);
router.delete('/keys/:keyId', auth, revokeApiKey);

// Webhook routes
router.post('/webhooks', auth, requirePaidTier, createWebhook);
router.get('/webhooks', auth, getWebhooks);
router.post('/webhooks/:webhookId/test', auth, testWebhook);

// Usage and docs
router.get('/usage', auth, getApiUsage);
router.get('/docs', getApiDocs);

export default router;
