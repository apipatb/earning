import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  globalSearch,
  searchTickets,
  searchMessages,
  searchCustomers,
  searchDocuments,
  getSuggestions,
  getSearchAnalytics,
  healthCheck,
  reindexAll,
} from '../controllers/search.controller';
import { searchLimiter } from '../middleware/rateLimit';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Apply rate limiting to search endpoints (50 per 15 minutes)
// Global search
router.get('/', searchLimiter, globalSearch);

// Entity-specific search
router.get('/tickets', searchLimiter, searchTickets);
router.get('/messages', searchLimiter, searchMessages);
router.get('/customers', searchLimiter, searchCustomers);
router.get('/documents', searchLimiter, searchDocuments);

// Autocomplete/suggestions
router.get('/suggestions', searchLimiter, getSuggestions);

// Analytics
router.get('/analytics', getSearchAnalytics);

// Health check
router.get('/health', healthCheck);

// Admin operations (role check implemented in controller)
router.post('/reindex', reindexAll);

export default router;
