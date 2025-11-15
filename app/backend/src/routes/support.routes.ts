import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  closeTicket,
  addResponse,
  getResponses,
  createArticle,
  getArticles,
  getArticleBySlug,
  updateArticle,
  getSupportCategories,
  getSupportMetrics,
  generateSupportReport,
  getTicketStatistics,
  createFAQ,
  getFAQs,
} from '../controllers/support.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Ticket Management
router.post('/tickets', auth, createTicket);
router.get('/tickets', auth, getTickets);
router.get('/tickets/:ticketId', auth, getTicketById);
router.put('/tickets/:ticketId', auth, updateTicket);
router.put('/tickets/:ticketId/close', auth, closeTicket);

// Ticket Responses
router.post('/tickets/:ticketId/responses', auth, addResponse);
router.get('/tickets/:ticketId/responses', auth, getResponses);

// Knowledge Base Articles
router.post('/articles', auth, createArticle);
router.get('/articles', auth, getArticles);
router.get('/articles/:slug', getArticleBySlug);
router.put('/articles/:articleId', auth, updateArticle);

// Support Categories
router.get('/categories', getSupportCategories);

// FAQ Management
router.post('/faqs', auth, createFAQ);
router.get('/faqs', auth, getFAQs);

// Support Metrics & Analytics
router.get('/metrics', auth, getSupportMetrics);
router.post('/reports/generate', auth, generateSupportReport);
router.get('/statistics', auth, getTicketStatistics);

export default router;
