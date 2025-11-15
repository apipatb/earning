import { Router } from 'express';
import {
  getAvailableIntegrations,
  connectIntegration,
  getUserIntegrations,
  disconnectIntegration,
  createAutomationRule,
  getAutomationRules,
  updateAutomationRule,
  testAutomation,
  getIntegrationStats,
} from '../controllers/integration.controller';
import { auth } from '../middleware/auth.middleware';
import { requirePaidTier } from '../middleware/tier.middleware';

const router = Router();

// Public routes
router.get('/available', getAvailableIntegrations);

// Protected routes
router.post('/connect', auth, requirePaidTier, connectIntegration);
router.get('/list', auth, getUserIntegrations);
router.delete('/:integrationId', auth, disconnectIntegration);
router.post('/test', auth, testAutomation);
router.get('/stats', auth, getIntegrationStats);

// Automation rules
router.post('/automation', auth, requirePaidTier, createAutomationRule);
router.get('/automation', auth, getAutomationRules);
router.put('/automation/:ruleId', auth, updateAutomationRule);

export default router;
