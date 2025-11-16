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

const router = Router();

// All routes require authentication
router.use(authenticate);

// Global search
router.get('/', globalSearch);

// Entity-specific search
router.get('/tickets', searchTickets);
router.get('/messages', searchMessages);
router.get('/customers', searchCustomers);
router.get('/documents', searchDocuments);

// Autocomplete/suggestions
router.get('/suggestions', getSuggestions);

// Analytics
router.get('/analytics', getSearchAnalytics);

// Health check
router.get('/health', healthCheck);

// Admin operations (role check implemented in controller)
router.post('/reindex', reindexAll);

export default router;
