import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getInventory,
  updateProductStock,
  logInventoryChange,
  getInventoryHistory,
  getLowStockAlerts,
} from '../controllers/inventory.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getInventory);
router.get('/history', getInventoryHistory);
router.get('/alerts/low-stock', getLowStockAlerts);
router.post('/log', logInventoryChange);
router.put('/:id/stock', updateProductStock);

export default router;
