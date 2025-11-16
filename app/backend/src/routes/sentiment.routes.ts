import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  analyzeText,
  getMessageSentiment,
  getTicketSentiment,
  getSentimentAlerts,
  resolveSentimentAlert,
  analyzeTicket,
  getSentimentStats,
} from '../controllers/sentiment.controller';

const router = Router();

// All sentiment routes require authentication
router.use(authenticate);

// Sentiment analysis
router.post('/analyze', analyzeText);
router.get('/message/:id', getMessageSentiment);
router.get('/ticket/:id', getTicketSentiment);
router.post('/ticket/:id/analyze', analyzeTicket);

// Sentiment alerts
router.get('/alerts', getSentimentAlerts);
router.post('/alerts/resolve', resolveSentimentAlert);

// Statistics
router.get('/stats', getSentimentStats);

export default router;
