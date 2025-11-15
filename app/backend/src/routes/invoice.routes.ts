import { Router } from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  publishInvoice,
  deleteInvoice,
  setInvoiceTax,
  getInvoiceTaxes,
  recordPayment,
  getPayments,
  getInvoiceAnalytics,
  generateInvoiceReport,
  getInvoiceStatistics,
  createInvoiceTemplate,
  getInvoiceTemplate,
  createRecurringInvoice,
  getRecurringInvoices,
} from '../controllers/invoice.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Invoice Management
router.post('/invoices', auth, createInvoice);
router.get('/invoices', auth, getInvoices);
router.get('/invoices/:invoiceId', auth, getInvoiceById);
router.put('/invoices/:invoiceId', auth, updateInvoice);
router.put('/invoices/:invoiceId/publish', auth, publishInvoice);
router.delete('/invoices/:invoiceId', auth, deleteInvoice);

// Invoice Tax Management
router.post('/invoices/:invoiceId/tax', auth, setInvoiceTax);
router.get('/taxes', auth, getInvoiceTaxes);

// Payment Tracking
router.post('/payments', auth, recordPayment);
router.get('/payments', auth, getPayments);

// Analytics & Reports
router.get('/analytics', auth, getInvoiceAnalytics);
router.post('/reports/generate', auth, generateInvoiceReport);
router.get('/statistics', auth, getInvoiceStatistics);

// Invoice Templates
router.post('/templates', auth, createInvoiceTemplate);
router.get('/templates', auth, getInvoiceTemplate);

// Recurring Invoices
router.post('/recurring', auth, createRecurringInvoice);
router.get('/recurring', auth, getRecurringInvoices);

export default router;
