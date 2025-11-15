import { Router } from 'express';
import {
  createScheduledTask,
  getScheduledTasks,
  updateScheduledTask,
  deleteScheduledTask,
  getTaskExecutionHistory,
  createBulkEarnings,
  getUpcomingTasks,
  runTaskNow,
} from '../controllers/scheduler.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Scheduled task management
router.post('/tasks', auth, createScheduledTask);
router.get('/tasks', auth, getScheduledTasks);
router.put('/tasks/:taskId', auth, updateScheduledTask);
router.delete('/tasks/:taskId', auth, deleteScheduledTask);

// Task execution and history
router.get('/tasks/:taskId/history', auth, getTaskExecutionHistory);
router.post('/tasks/:taskId/run', auth, runTaskNow);

// Upcoming tasks
router.get('/upcoming', auth, getUpcomingTasks);

// Bulk operations
router.post('/earnings/bulk', auth, createBulkEarnings);

export default router;
