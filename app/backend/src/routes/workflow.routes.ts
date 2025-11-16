import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createWorkflow,
  getUserWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getWorkflowExecutions,
} from '../controllers/workflow.controller';

const router = Router();

// All workflow routes require authentication
router.use(authenticate);

// Workflow management
router.post('/', createWorkflow);
router.get('/', getUserWorkflows);
router.get('/:id', getWorkflowById);
router.put('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);

// Workflow execution
router.post('/:id/execute', executeWorkflow);
router.get('/:id/executions', getWorkflowExecutions);

export default router;
