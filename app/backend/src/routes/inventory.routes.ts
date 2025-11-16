import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getInventory,
  updateProductStock,
  logInventoryChange,
  getInventoryHistory,
  getLowStockAlerts,
} from '../controllers/inventory.controller';
import {
  generateForecast,
  getForecast,
  createReorderRule,
  getReorderRule,
  getAlerts,
  resolveAlert,
  triggerAutoReorder,
  getRecommendations,
  calculateSafetyStock,
  getOrderTiming,
} from '../controllers/inventory-smart.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Basic inventory routes
router.get('/', getInventory);
router.get('/history', getInventoryHistory);
router.get('/alerts/low-stock', getLowStockAlerts);
router.post('/log', logInventoryChange);
router.put('/:id/stock', updateProductStock);

// Smart inventory routes - Forecasting
router.post('/forecasts', generateForecast);
router.get('/forecasts/:productId', getForecast);

// Smart inventory routes - Reorder rules
router.post('/reorder-rules', createReorderRule);
router.get('/reorder-rules/:productId', getReorderRule);

// Smart inventory routes - Alerts
router.get('/alerts', getAlerts);
router.post('/alerts/:alertId/resolve', resolveAlert);

// Smart inventory routes - Auto-reorder
router.post('/auto-order', triggerAutoReorder);
router.get('/recommendations', getRecommendations);

// Smart inventory routes - Safety stock and timing
router.get('/safety-stock/:productId', calculateSafetyStock);
router.get('/order-timing/:productId', getOrderTiming);

export default router;
