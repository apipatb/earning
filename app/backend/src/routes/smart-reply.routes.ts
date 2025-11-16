import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSuggestions,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  acceptSuggestion,
  getStats,
} from '../controllers/smart-reply.controller';

const router = Router();

// All smart reply routes require authentication
router.use(authenticate);

// Smart reply suggestions
router.get('/suggestions/:messageId', getSuggestions);
router.post('/:id/accept', acceptSuggestion);

// Reply templates
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// Statistics
router.get('/stats', getStats);

export default router;
