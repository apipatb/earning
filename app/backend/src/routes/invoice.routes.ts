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

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllInvoices);
router.get('/summary', getInvoiceSummary);
router.get('/overdue', getOverdueInvoices);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/mark-paid', markInvoicePaid);
router.delete('/:id', deleteInvoice);

export default router;
