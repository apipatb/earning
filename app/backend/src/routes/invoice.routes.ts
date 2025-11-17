import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  markInvoicePaid,
  deleteInvoice,
  getInvoiceSummary,
  getOverdueInvoices,
} from '../controllers/invoice.controller';
import { paymentLimiter } from '../middleware/rateLimit';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllInvoices);
router.get('/summary', getInvoiceSummary);
router.get('/overdue', getOverdueInvoices);
// Apply payment rate limiting to invoice create/update operations (20 per hour)
router.post('/', paymentLimiter, createInvoice);
router.put('/:id', paymentLimiter, updateInvoice);
router.patch('/:id/mark-paid', paymentLimiter, markInvoicePaid);
router.delete('/:id', deleteInvoice);

export default router;
