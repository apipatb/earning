import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
} from '../controllers/platform.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllPlatforms);
router.post('/', createPlatform);
router.put('/:id', updatePlatform);
router.delete('/:id', deletePlatform);

export default router;
