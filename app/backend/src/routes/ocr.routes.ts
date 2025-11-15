import { Router } from 'express';
import {
  uploadReceipt,
  processReceipt,
  extractExpenseData,
  getReceipts,
  getReceiptById,
  updateReceiptData,
  deleteReceipt,
  getExtractedExpenses,
  updateExpenseData,
  confirmExpense,
  getReceiptAnalytics,
  getReceiptCategories,
  getOCRResults,
  generateReceiptReport,
  getReceiptStatistics,
} from '../controllers/ocr.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Receipt Management
router.post('/receipts', auth, uploadReceipt);
router.get('/receipts', auth, getReceipts);
router.get('/receipts/:receiptId', auth, getReceiptById);
router.put('/receipts/:receiptId', auth, updateReceiptData);
router.delete('/receipts/:receiptId', auth, deleteReceipt);

// OCR Processing
router.post('/receipts/:receiptId/process', auth, processReceipt);
router.get('/ocr-results', auth, getOCRResults);

// Expense Extraction
router.post('/extract-expense', auth, extractExpenseData);
router.get('/expenses', auth, getExtractedExpenses);
router.put('/expenses/:expenseId', auth, updateExpenseData);
router.post('/expenses/:expenseId/confirm', auth, confirmExpense);

// Analytics & Reports
router.get('/analytics', auth, getReceiptAnalytics);
router.get('/statistics', auth, getReceiptStatistics);
router.post('/reports/generate', auth, generateReceiptReport);

// Categories
router.get('/categories', getReceiptCategories);

export default router;
