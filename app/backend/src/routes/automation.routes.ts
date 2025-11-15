import { Router } from 'express';
import {
  createAutomationRule,
  getAutomationRules,
  getAutomationRuleById,
  updateAutomationRule,
  deleteAutomationRule,
  createWorkflow,
  getWorkflows,
  executeWorkflow,
  getWorkflowExecutions,
  getWorkflowTemplates,
  createWorkflowFromTemplate,
  getAutomationStats,
  getAutomationAnalytics,
  createScheduledAutomation,
  getScheduledAutomations,
  updateScheduledAutomation,
  deleteScheduledAutomation,
  getAutomationHistory,
  clearAutomationHistory,
} from '../controllers/automation.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Automation Rules
router.post('/rules', auth, createAutomationRule);
router.get('/rules', auth, getAutomationRules);
router.get('/rules/:ruleId', auth, getAutomationRuleById);
router.put('/rules/:ruleId', auth, updateAutomationRule);
router.delete('/rules/:ruleId', auth, deleteAutomationRule);

// Workflows
router.post('/workflows', auth, createWorkflow);
router.get('/workflows', auth, getWorkflows);
router.post('/workflows/:workflowId/execute', auth, executeWorkflow);
router.get('/workflows/:workflowId/executions', auth, getWorkflowExecutions);

// Workflow Templates
router.get('/templates', getWorkflowTemplates);
router.post('/workflows/from-template', auth, createWorkflowFromTemplate);

// Scheduled Automations
router.post('/scheduled', auth, createScheduledAutomation);
router.get('/scheduled', auth, getScheduledAutomations);
router.put('/scheduled/:automationId', auth, updateScheduledAutomation);
router.delete('/scheduled/:automationId', auth, deleteScheduledAutomation);

// Analytics
router.get('/stats', auth, getAutomationStats);
router.get('/analytics', auth, getAutomationAnalytics);

// History
router.get('/history', auth, getAutomationHistory);
router.post('/history/clear', auth, clearAutomationHistory);

export default router;
