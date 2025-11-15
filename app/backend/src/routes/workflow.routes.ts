import { Router } from 'express';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getWorkflowExecutions,
  createWorkflowTemplate,
  getWorkflowTemplates,
  createTrigger,
  getTriggers,
  createAction,
  getActions,
  createScheduledTask,
  getScheduledTasks,
  updateScheduledTask,
  getWorkflowAnalytics,
  getWorkflowStatistics,
} from '../controllers/workflow.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Workflow Management
router.post('/workflows', auth, createWorkflow);
router.get('/workflows', auth, getWorkflows);
router.get('/workflows/:workflowId', auth, getWorkflowById);
router.put('/workflows/:workflowId', auth, updateWorkflow);
router.delete('/workflows/:workflowId', auth, deleteWorkflow);

// Workflow Execution
router.post('/workflows/:workflowId/execute', auth, executeWorkflow);
router.get('/executions', auth, getWorkflowExecutions);

// Workflow Templates
router.post('/templates', auth, createWorkflowTemplate);
router.get('/templates', auth, getWorkflowTemplates);

// Workflow Triggers
router.post('/triggers', auth, createTrigger);
router.get('/triggers', auth, getTriggers);

// Workflow Actions
router.post('/actions', auth, createAction);
router.get('/actions', auth, getActions);

// Scheduled Tasks
router.post('/tasks', auth, createScheduledTask);
router.get('/tasks', auth, getScheduledTasks);
router.put('/tasks/:taskId', auth, updateScheduledTask);

// Analytics
router.get('/analytics', auth, getWorkflowAnalytics);
router.get('/statistics', auth, getWorkflowStatistics);

export default router;
