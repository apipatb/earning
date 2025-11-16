import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
  sendMessage,
  getTokenUsage,
  getRateLimitStatus,
  getChatConfig,
  updateChatConfig,
} from '../controllers/chatbot.controller';

const router = Router();

// All chatbot routes require authentication
router.use(authenticate);

// Conversation management
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

// Message handling
router.post('/messages', sendMessage);

// Usage and monitoring
router.get('/usage', getTokenUsage);
router.get('/rate-limit', getRateLimitStatus);

// Configuration
router.get('/config', getChatConfig);
router.put('/config', updateChatConfig);

export default router;
