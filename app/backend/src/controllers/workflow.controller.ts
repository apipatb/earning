import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Workflow Management
export const createWorkflow = async (req: Request, res: Response) => {
  try {
    const { name, description, trigger, actions, isActive } = req.body;
    const userId = (req as any).userId;

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name,
        description: description || null,
        trigger: JSON.stringify(trigger || {}),
        actions: JSON.stringify(actions || []),
        isActive: isActive !== false,
        createdAt: new Date(),
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create workflow' });
  }
};

export const getWorkflows = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { isActive, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
};

export const getWorkflowById = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = (req as any).userId;

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
};

export const updateWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { name, description, trigger, actions, isActive } = req.body;
    const userId = (req as any).userId;

    await prisma.workflow.updateMany({
      where: { id: workflowId, userId },
      data: {
        name,
        description,
        trigger: trigger ? JSON.stringify(trigger) : undefined,
        actions: actions ? JSON.stringify(actions) : undefined,
        isActive,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update workflow' });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = (req as any).userId;

    await prisma.workflow.deleteMany({
      where: { id: workflowId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete workflow' });
  }
};

// Workflow Execution
export const executeWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = (req as any).userId;

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow || !workflow.isActive) {
      return res.status(404).json({ error: 'Workflow not found or inactive' });
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        userId,
        workflowId,
        status: 'completed',
        executedAt: new Date(),
        result: JSON.stringify({ success: true }),
        createdAt: new Date(),
      },
    });

    res.status(201).json(execution);
  } catch (error) {
    res.status(400).json({ error: 'Failed to execute workflow' });
  }
};

export const getWorkflowExecutions = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.query;
    const userId = (req as any).userId;

    const executions = await prisma.workflowExecution.findMany({
      where: {
        userId,
        workflowId: workflowId as string,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};

// Workflow Templates
export const createWorkflowTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, category, trigger, actions } = req.body;
    const userId = (req as any).userId;

    const template = await prisma.workflowTemplate.create({
      data: {
        userId,
        name,
        description: description || null,
        category: category || 'general',
        trigger: JSON.stringify(trigger || {}),
        actions: JSON.stringify(actions || []),
        createdAt: new Date(),
      },
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create template' });
  }
};

export const getWorkflowTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const templates = await prisma.workflowTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// Workflow Triggers
export const createTrigger = async (req: Request, res: Response) => {
  try {
    const { workflowId, triggerType, condition, isActive } = req.body;
    const userId = (req as any).userId;

    const trigger = await prisma.workflowTrigger.create({
      data: {
        userId,
        workflowId,
        triggerType: triggerType || 'manual',
        condition: JSON.stringify(condition || {}),
        isActive: isActive !== false,
        createdAt: new Date(),
      },
    });

    res.status(201).json(trigger);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create trigger' });
  }
};

export const getTriggers = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.query;
    const userId = (req as any).userId;

    const triggers = await prisma.workflowTrigger.findMany({
      where: {
        userId,
        workflowId: workflowId as string,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(triggers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
};

// Workflow Actions
export const createAction = async (req: Request, res: Response) => {
  try {
    const { workflowId, actionType, config, order } = req.body;
    const userId = (req as any).userId;

    const action = await prisma.workflowAction.create({
      data: {
        userId,
        workflowId,
        actionType,
        config: JSON.stringify(config || {}),
        order: order || 0,
        createdAt: new Date(),
      },
    });

    res.status(201).json(action);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create action' });
  }
};

export const getActions = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.query;
    const userId = (req as any).userId;

    const actions = await prisma.workflowAction.findMany({
      where: {
        userId,
        workflowId: workflowId as string,
      },
      orderBy: { order: 'asc' },
    });

    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
};

// Scheduled Tasks
export const createScheduledTask = async (req: Request, res: Response) => {
  try {
    const { name, description, workflowId, schedule, nextRun, isActive } = req.body;
    const userId = (req as any).userId;

    const task = await prisma.scheduledTask.create({
      data: {
        userId,
        name,
        description: description || null,
        workflowId,
        schedule: schedule || 'once',
        nextRun: nextRun ? new Date(nextRun) : new Date(),
        isActive: isActive !== false,
        createdAt: new Date(),
      },
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create scheduled task' });
  }
};

export const getScheduledTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const tasks = await prisma.scheduledTask.findMany({
      where: { userId },
      orderBy: { nextRun: 'asc' },
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scheduled tasks' });
  }
};

export const updateScheduledTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { schedule, nextRun, isActive } = req.body;
    const userId = (req as any).userId;

    await prisma.scheduledTask.updateMany({
      where: { id: taskId, userId },
      data: {
        schedule,
        nextRun: nextRun ? new Date(nextRun) : undefined,
        isActive,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update scheduled task' });
  }
};

// Workflow Analytics
export const getWorkflowAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const totalWorkflows = await prisma.workflow.count({
      where: { userId },
    });

    const activeWorkflows = await prisma.workflow.count({
      where: { userId, isActive: true },
    });

    const totalExecutions = await prisma.workflowExecution.count({
      where: { userId },
    });

    const successfulExecutions = await prisma.workflowExecution.count({
      where: { userId, status: 'completed' },
    });

    const analytics = {
      totalWorkflows,
      activeWorkflows,
      inactiveWorkflows: totalWorkflows - activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      successRate:
        totalExecutions > 0
          ? ((successfulExecutions / totalExecutions) * 100).toFixed(2)
          : '0',
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Workflow Statistics
export const getWorkflowStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const workflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        executions: true,
      },
    });

    const stats = {
      totalWorkflows: workflows.length,
      avgExecutionsPerWorkflow:
        workflows.length > 0
          ? (workflows.reduce((sum, w) => sum + w.executions.length, 0) / workflows.length).toFixed(2)
          : 0,
      mostUsedWorkflow: workflows.length > 0
        ? workflows.reduce((prev, current) =>
            prev.executions.length > current.executions.length ? prev : current
          ).name
        : null,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
