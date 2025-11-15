import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllPassiveIncomes,
  createPassiveIncome,
  updatePassiveIncome,
  deletePassiveIncome,
} from '../controllers/passive-income.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllPassiveIncomes);
router.post('/', createPassiveIncome);
router.put('/:id', updatePassiveIncome);
router.delete('/:id', deletePassiveIncome);

export default router;
