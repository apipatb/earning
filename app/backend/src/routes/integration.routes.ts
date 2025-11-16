import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAuthUrl,
  connectIntegration,
  getUserIntegrations,
  getIntegrationById,
  disconnectIntegration,
  testIntegration,
  syncIntegration,
  batchSyncIntegration,
  getIntegrationLogs,
  handleOAuthCallback,
  handleZapierWebhook,
  handleMakeWebhook,
  handleSlackWebhook,
  handleTeamsWebhook,
} from '../controllers/integration.controller';

const router = Router();

// OAuth routes (public for callbacks)
router.get('/callback/:platform', handleOAuthCallback);

// Webhook endpoints (public, but require API key in header)
router.post('/webhooks/zapier', handleZapierWebhook);
router.post('/webhooks/make', handleMakeWebhook);
router.post('/webhooks/slack', handleSlackWebhook);
router.post('/webhooks/teams', handleTeamsWebhook);

// All other integration routes require authentication
router.use(authenticate);

// OAuth authorization
router.get('/auth/:platform', getAuthUrl);

// Integration management
router.post('/', connectIntegration);
router.get('/', getUserIntegrations);
router.get('/:id', getIntegrationById);
router.delete('/:id', disconnectIntegration);

// Integration operations
router.post('/:id/test', testIntegration);
router.post('/:id/sync', syncIntegration);
router.post('/:id/batch-sync', batchSyncIntegration);
router.get('/:id/logs', getIntegrationLogs);

export default router;
