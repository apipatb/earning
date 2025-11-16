import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCustomerProfile,
  listCustomerTickets,
  getCustomerTicket,
  createCustomerTicket,
  listCustomerInvoices,
  getCustomerInvoice,
  listCustomerDocuments,
  getCustomerDocument,
  updateCustomerPreferences,
  getCustomerStats,
} from '../controllers/customer-portal.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.get('/profile', getCustomerProfile);
router.get('/stats', getCustomerStats);

// Tickets
router.get('/tickets', listCustomerTickets);
router.get('/tickets/:id', getCustomerTicket);
router.post('/tickets', createCustomerTicket);

// Invoices
router.get('/invoices', listCustomerInvoices);
router.get('/invoices/:id', getCustomerInvoice);

// Documents
router.get('/documents', listCustomerDocuments);
router.get('/documents/:id', getCustomerDocument);

// Preferences
router.put('/preferences', updateCustomerPreferences);

export default router;
