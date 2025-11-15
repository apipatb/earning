import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllEarnings,
  createEarning,
  updateEarning,
  deleteEarning,
} from '../controllers/earning.controller';

const router = Router();

router.use(authenticate);

router.get('/', getAllEarnings);
router.post('/', createEarning);
router.put('/:id', updateEarning);
router.delete('/:id', deleteEarning);

export default router;
