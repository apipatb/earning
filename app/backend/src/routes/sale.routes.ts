import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllSales,
  createSale,
  updateSale,
  deleteSale,
  getSalesSummary,
} from '../controllers/sale.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/summary', getSalesSummary);
router.get('/', getAllSales);
router.post('/', createSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;
