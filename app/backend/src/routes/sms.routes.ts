import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createCampaign,
  getCampaigns,
  getCampaign,
  sendCampaign,
  getCampaignLogs,
  getContacts,
  addContact,
  updateContact,
  deleteContact,
  handleUnsubscribe,
  webhookHandler,
} from '../controllers/sms.controller';

const router = Router();

// Webhook endpoint (no authentication required - Twilio webhook)
router.post('/webhook', webhookHandler);

// All other routes require authentication
router.use(authenticate);

// Template endpoints
router.post('/templates', createTemplate);
router.get('/templates', getTemplates);
router.get('/templates/:id', getTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// Campaign endpoints
router.post('/campaigns', createCampaign);
router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaign);
router.post('/campaigns/:id/send', sendCampaign);
router.get('/campaigns/:id/logs', getCampaignLogs);

// Contact endpoints
router.get('/contacts', getContacts);
router.post('/contacts', addContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

// Unsubscribe endpoint
router.post('/unsubscribe', handleUnsubscribe);

export default router;
