import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSummary } from '../controllers/analytics.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);

export default router;
