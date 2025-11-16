import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  sendMessage,
  getContacts,
  createContact,
  getContactDetails,
  updateContact,
  deleteContact,
  createTemplate,
  getTemplates,
  sendTemplateMessage,
  webhookHandler,
  getMessageStatus,
} from '../controllers/whatsapp.controller';

const router = Router();

// Webhook endpoint (no authentication required - Twilio webhook)
router.post('/webhook', webhookHandler);

// All other routes require authentication
router.use(authenticate);

// Message endpoints
router.post('/send', sendMessage);
router.post('/send-template', sendTemplateMessage);
router.get('/messages/:id/status', getMessageStatus);

// Contact endpoints
router.get('/contacts', getContacts);
router.post('/contacts', createContact);
router.get('/contacts/:id', getContactDetails);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

// Template endpoints
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);

export default router;
