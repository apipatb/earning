import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createEmailTemplate,
  getUserEmailTemplates,
  updateEmailTemplate,
  deleteEmailTemplate,
  createEmailSequence,
  getUserEmailSequences,
  updateEmailSequence,
  deleteEmailSequence,
  getEmailLogs,
  getEmailStats,
  unsubscribeEmail,
} from '../controllers/email.controller';

const router = Router();

// Unsubscribe endpoint (no auth required)
router.get('/unsubscribe', unsubscribeEmail);

// All other email routes require authentication
router.use(authenticate);

// Email template management
router.post('/templates', createEmailTemplate);
router.get('/templates', getUserEmailTemplates);
router.put('/templates/:id', updateEmailTemplate);
router.delete('/templates/:id', deleteEmailTemplate);

// Email sequence management
router.post('/sequences', createEmailSequence);
router.get('/sequences', getUserEmailSequences);
router.put('/sequences/:id', updateEmailSequence);
router.delete('/sequences/:id', deleteEmailSequence);

// Email logs and statistics
router.get('/logs', getEmailLogs);
router.get('/stats', getEmailStats);

export default router;
