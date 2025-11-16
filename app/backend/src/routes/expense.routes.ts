import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getProfitMargin,
} from '../controllers/expense.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllExpenses);
router.get('/summary', getExpenseSummary);
router.get('/profit/margin', getProfitMargin);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
