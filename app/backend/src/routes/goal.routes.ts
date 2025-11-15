import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
} from '../controllers/goal.controller';

const router = Router();

router.use(authenticate);

router.get('/', getGoals);
router.get('/:id', getGoal);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.post('/:id/update-progress', updateGoalProgress);

export default router;
