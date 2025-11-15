import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Automation Rules
export const createAutomationRule = async (req: Request, res: Response) => {
  try {
    const { name, description, trigger, conditions, actions, enabled } = req.body;
    const userId = (req as any).userId;

    const rule = await prisma.automationRule.create({
      data: {
        userId,
        name,
        description,
        trigger: JSON.stringify(trigger),
        conditions: JSON.stringify(conditions),
        actions: JSON.stringify(actions),
        enabled: enabled !== false,
        executionCount: 0,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create automation rule' });
  }
};

export const getAutomationRules = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { enabled } = req.query;

    const rules = await prisma.automationRule.findMany({
      where: {
        userId,
        ...(enabled !== undefined && { enabled: enabled === 'true' }),
      },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
};

export const getAutomationRuleById = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const userId = (req as any).userId;

    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!rule || rule.userId !== userId) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation rule' });
  }
};

export const updateAutomationRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { name, description, trigger, conditions, actions, enabled } = req.body;
    const userId = (req as any).userId;

    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.userId !== userId) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updated = await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(trigger && { trigger: JSON.stringify(trigger) }),
        ...(conditions && { conditions: JSON.stringify(conditions) }),
        ...(actions && { actions: JSON.stringify(actions) }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update automation rule' });
  }
};

export const deleteAutomationRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const userId = (req as any).userId;

    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.userId !== userId) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    await prisma.automationRule.delete({
      where: { id: ruleId },
    });

    res.json({ message: 'Automation rule deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
};

// Workflow Management
export const createWorkflow = async (req: Request, res: Response) => {
  try {
    const { name, description, steps, triggerType, enabled } = req.body;
    const userId = (req as any).userId;

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name,
        description,
        steps: JSON.stringify(steps),
        triggerType, // manual, scheduled, event-based
        enabled: enabled !== false,
        version: 1,
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
    const { triggerType, enabled } = req.query;

    const workflows = await prisma.workflow.findMany({
      where: {
        userId,
        ...(triggerType && { triggerType: triggerType as string }),
        ...(enabled !== undefined && { enabled: enabled === 'true' }),
      },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
};

export const executeWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { variables } = req.body;
    const userId = (req as any).userId;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || workflow.userId !== userId) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        status: 'running',
        startedAt: new Date(),
        variables: JSON.stringify(variables || {}),
      },
    });

    // Simulate workflow execution
    setTimeout(async () => {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }, 1000);

    res.status(201).json(execution);
  } catch (error) {
    res.status(400).json({ error: 'Failed to execute workflow' });
  }
};

export const getWorkflowExecutions = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = (req as any).userId;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || workflow.userId !== userId) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.workflowExecution.count({
      where: { workflowId },
    });

    res.json({ executions, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow executions' });
  }
};

// Workflow Templates
export const getWorkflowTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow templates' });
  }
};

export const createWorkflowFromTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId, name } = req.body;
    const userId = (req as any).userId;

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: name || template.name,
        description: template.description,
        steps: template.steps,
        triggerType: template.triggerType,
        enabled: false,
        version: 1,
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create workflow from template' });
  }
};

// Automation Analytics
export const getAutomationStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const stats = {
      totalRules: await prisma.automationRule.count({ where: { userId } }),
      enabledRules: await prisma.automationRule.count({
        where: { userId, enabled: true },
      }),
      totalWorkflows: await prisma.workflow.count({ where: { userId } }),
      enabledWorkflows: await prisma.workflow.count({
        where: { userId, enabled: true },
      }),
      totalExecutions: await prisma.workflowExecution.count({
        where: {
          workflow: { userId },
        },
      }),
      successfulExecutions: await prisma.workflowExecution.count({
        where: {
          workflow: { userId },
          status: 'completed',
        },
      }),
      failedExecutions: await prisma.workflowExecution.count({
        where: {
          workflow: { userId },
          status: 'failed',
        },
      }),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation stats' });
  }
};

export const getAutomationAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const dailyExecutions = await prisma.workflowExecution.groupBy({
      by: ['startedAt'],
      where: {
        workflow: { userId },
        startedAt: { gte: startDate },
      },
      _count: true,
    });

    const executionsByType = await prisma.workflowExecution.groupBy({
      by: ['status'],
      where: {
        workflow: { userId },
        startedAt: { gte: startDate },
      },
      _count: true,
    });

    res.json({ dailyExecutions, executionsByType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation analytics' });
  }
};

// Scheduled Automations
export const createScheduledAutomation = async (req: Request, res: Response) => {
  try {
    const { name, description, schedule, action, enabled } = req.body;
    const userId = (req as any).userId;

    const scheduled = await prisma.scheduledAutomation.create({
      data: {
        userId,
        name,
        description,
        schedule, // cron expression
        action: JSON.stringify(action),
        enabled: enabled !== false,
        nextRun: new Date(),
      },
    });

    res.status(201).json(scheduled);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create scheduled automation' });
  }
};

export const getScheduledAutomations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { enabled } = req.query;

    const automations = await prisma.scheduledAutomation.findMany({
      where: {
        userId,
        ...(enabled !== undefined && { enabled: enabled === 'true' }),
      },
      orderBy: { nextRun: 'asc' },
    });

    res.json(automations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scheduled automations' });
  }
};

export const updateScheduledAutomation = async (req: Request, res: Response) => {
  try {
    const { automationId } = req.params;
    const { name, description, schedule, action, enabled } = req.body;
    const userId = (req as any).userId;

    const automation = await prisma.scheduledAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation || automation.userId !== userId) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const updated = await prisma.scheduledAutomation.update({
      where: { id: automationId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(schedule && { schedule }),
        ...(action && { action: JSON.stringify(action) }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update scheduled automation' });
  }
};

export const deleteScheduledAutomation = async (req: Request, res: Response) => {
  try {
    const { automationId } = req.params;
    const userId = (req as any).userId;

    const automation = await prisma.scheduledAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation || automation.userId !== userId) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    await prisma.scheduledAutomation.delete({
      where: { id: automationId },
    });

    res.json({ message: 'Scheduled automation deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete scheduled automation' });
  }
};

// Automation History
export const getAutomationHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { limit = 100, offset = 0 } = req.query;

    const history = await prisma.automationHistory.findMany({
      where: {
        userId,
      },
      orderBy: { executedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation history' });
  }
};

export const clearAutomationHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { olderThanDays = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.automationHistory.deleteMany({
      where: {
        userId,
        executedAt: { lt: cutoffDate },
      },
    });

    res.json({ deletedCount: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear automation history' });
  }
};
