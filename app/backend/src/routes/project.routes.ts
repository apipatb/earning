import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  createSubtask,
  updateSubtask,
  createMilestone,
  getMilestones,
  completeMilestone,
  getProjectAnalytics,
  getProjectStatistics,
  getTaskStatisticsByProject,
  addTaskComment,
  getTaskComments,
} from '../controllers/project.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Project Management
router.post('/projects', auth, createProject);
router.get('/projects', auth, getProjects);
router.get('/projects/:projectId', auth, getProjectById);
router.put('/projects/:projectId', auth, updateProject);
router.delete('/projects/:projectId', auth, deleteProject);

// Task Management
router.post('/tasks', auth, createTask);
router.get('/tasks', auth, getTasks);
router.get('/tasks/:taskId', auth, getTaskById);
router.put('/tasks/:taskId', auth, updateTask);
router.put('/tasks/:taskId/status', auth, updateTaskStatus);
router.delete('/tasks/:taskId', auth, deleteTask);

// Subtasks
router.post('/subtasks', auth, createSubtask);
router.put('/subtasks/:subtaskId', auth, updateSubtask);

// Milestones
router.post('/milestones', auth, createMilestone);
router.get('/milestones', auth, getMilestones);
router.put('/milestones/:milestoneId/complete', auth, completeMilestone);

// Task Comments
router.post('/comments', auth, addTaskComment);
router.get('/comments', auth, getTaskComments);

// Analytics & Statistics
router.get('/analytics', auth, getProjectAnalytics);
router.get('/statistics', auth, getProjectStatistics);
router.get('/statistics/tasks', auth, getTaskStatisticsByProject);

export default router;
