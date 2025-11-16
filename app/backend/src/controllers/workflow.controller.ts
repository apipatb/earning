import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { WorkflowService } from '../services/workflow.service';
import { logger } from '../utils/logger';
import { WorkflowTrigger } from '@prisma/client';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';

// Validation schemas
const workflowActionSchema = z.object({
  type: z.enum(['send_email', 'create_task', 'update_record', 'call_webhook']),
  config: z.record(z.any()),
});

const workflowSchema = z.object({
  name: z.string().min(1).max(255),
  trigger: z.nativeEnum(WorkflowTrigger),
  actions: z.array(workflowActionSchema).min(1),
  isActive: z.boolean().default(true),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  trigger: z.nativeEnum(WorkflowTrigger).optional(),
  actions: z.array(workflowActionSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

const executeWorkflowSchema = z.object({
  data: z.record(z.any()).optional(),
});

/**
 * Create a new workflow
 * POST /api/v1/workflows
 */
export const createWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = workflowSchema.parse(req.body);

    const workflow = await WorkflowService.createWorkflow(userId, data);

    res.status(201).json({
      workflow,
      message: 'Workflow created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Create workflow error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create workflow',
    });
  }
};

/**
 * Get all workflows for the authenticated user
 * GET /api/v1/workflows
 */
export const getUserWorkflows = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workflows = await WorkflowService.getUserWorkflows(userId);

    res.json({
      workflows,
      total: workflows.length,
    });
  } catch (error) {
    logger.error('Get user workflows error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch workflows',
    });
  }
};

/**
 * Get a specific workflow by ID
 * GET /api/v1/workflows/:id
 */
export const getWorkflowById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const workflow = await WorkflowService.getWorkflow(userId, id);

    if (!workflow) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Workflow not found',
      });
    }

    res.json({ workflow });
  } catch (error) {
    logger.error('Get workflow error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch workflow',
    });
  }
};

/**
 * Update a workflow
 * PUT /api/v1/workflows/:id
 */
export const updateWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateWorkflowSchema.parse(req.body);

    const updated = await WorkflowService.updateWorkflow(userId, id, data);

    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Workflow not found',
      });
    }

    res.json({
      message: 'Workflow updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Update workflow error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update workflow',
    });
  }
};

/**
 * Delete a workflow
 * DELETE /api/v1/workflows/:id
 */
export const deleteWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await WorkflowService.deleteWorkflow(userId, id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Workflow not found',
      });
    }

    res.json({
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    logger.error('Delete workflow error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete workflow',
    });
  }
};

/**
 * Manually execute a workflow
 * POST /api/v1/workflows/:id/execute
 */
export const executeWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { data = {} } = executeWorkflowSchema.parse(req.body);

    const executed = await WorkflowService.executeWorkflow(userId, id, data);

    if (!executed) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Workflow not found',
      });
    }

    res.json({
      message: 'Workflow execution queued successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Execute workflow error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to execute workflow',
    });
  }
};

/**
 * Get workflow execution history
 * GET /api/v1/workflows/:id/executions
 */
export const getWorkflowExecutions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { limit, offset } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const result = await WorkflowService.getExecutionHistory(
      userId,
      id,
      parsedLimit,
      parsedOffset
    );

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Workflow not found',
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('Get workflow executions error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch workflow executions',
    });
  }
};
