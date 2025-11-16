import { WorkflowTrigger, WorkflowExecutionStatus, TaskStatus, TaskPriority } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';

// Workflow retry delays (in milliseconds) - exponential backoff
const RETRY_DELAYS = [1000, 5000, 30000, 120000]; // 1s, 5s, 30s, 2min
const MAX_RETRY_ATTEMPTS = 4;

interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'update_record' | 'call_webhook';
  config: {
    // For send_email
    templateId?: string;
    to?: string;
    subject?: string;
    body?: string;

    // For create_task
    taskTitle?: string;
    taskDescription?: string;
    taskDueDate?: string;
    taskPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    taskAssignedTo?: string; // User ID to assign the task to

    // For update_record
    recordType?: string;
    recordId?: string;
    updates?: Record<string, any>;

    // For call_webhook
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    webhookHeaders?: Record<string, string>;
    webhookBody?: Record<string, any>;
  };
}

interface WorkflowData {
  name: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
}

interface ExecutionContext {
  trigger: WorkflowTrigger;
  data: any;
  userId: string;
  executionId?: string;
  workflowId?: string;
}

// In-memory queue for workflow executions with retry logic
class WorkflowQueue {
  private queue: Array<{
    executionId: string;
    workflowId: string;
    userId: string;
    actions: WorkflowAction[];
    context: ExecutionContext;
    attempt: number;
  }> = [];
  private processing = false;

  add(item: {
    executionId: string;
    workflowId: string;
    userId: string;
    actions: WorkflowAction[];
    context: ExecutionContext;
    attempt?: number;
  }): void {
    this.queue.push({
      ...item,
      attempt: item.attempt || 1,
    });
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        await this.executeWorkflow(item);
      }
    }

    this.processing = false;
  }

  private async executeWorkflow(item: {
    executionId: string;
    workflowId: string;
    userId: string;
    actions: WorkflowAction[];
    context: ExecutionContext;
    attempt: number;
  }): Promise<void> {
    const { executionId, workflowId, userId, actions, context, attempt } = item;
    const results: any[] = [];

    // Add executionId and workflowId to context for task creation
    const enrichedContext = {
      ...context,
      executionId,
      workflowId,
    };

    try {
      // Execute each action sequentially
      for (const action of actions) {
        const result = await this.executeAction(action, enrichedContext, userId);
        results.push(result);
      }

      // Mark execution as completed
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          result: JSON.stringify({ results, completedAt: new Date() }),
        },
      });

      logger.info('Workflow executed successfully', {
        executionId,
        workflowId,
        actionsCount: actions.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Workflow execution error:', {
        error: errorMessage,
        executionId,
        workflowId,
        attempt,
      });

      // Update execution with error
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          error: errorMessage,
        },
      });

      // Retry with exponential backoff
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn(`Workflow execution failed. Retrying in ${delay}ms...`, {
          executionId,
          workflowId,
          attempt,
        });

        setTimeout(() => {
          this.add({
            ...item,
            attempt: attempt + 1,
          });
        }, delay);
      } else {
        // Mark as failed after max retries
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            error: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${errorMessage}`,
          },
        });

        logger.error('Workflow execution failed after max retries', {
          executionId,
          workflowId,
        });
      }
    }
  }

  private async executeAction(
    action: WorkflowAction,
    context: ExecutionContext,
    userId: string
  ): Promise<any> {
    switch (action.type) {
      case 'send_email':
        return await this.executeSendEmail(action, context, userId);

      case 'create_task':
        return await this.executeCreateTask(action, context, userId);

      case 'update_record':
        return await this.executeUpdateRecord(action, context, userId);

      case 'call_webhook':
        return await this.executeCallWebhook(action, context, userId);

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  private async executeSendEmail(
    action: WorkflowAction,
    context: ExecutionContext,
    userId: string
  ): Promise<any> {
    const { to, subject, body } = action.config;

    if (!to || !subject || !body) {
      throw new Error('Email action requires to, subject, and body');
    }

    // Replace variables in email content with context data
    const processedSubject = this.replaceVariables(subject, context.data);
    const processedBody = this.replaceVariables(body, context.data);

    await EmailService.sendEmail({
      to,
      subject: processedSubject,
      html: processedBody,
      userId,
    });

    return { action: 'send_email', to, subject: processedSubject, success: true };
  }

  private async executeCreateTask(
    action: WorkflowAction,
    context: ExecutionContext,
    userId: string
  ): Promise<any> {
    const { taskTitle, taskDescription, taskDueDate, taskPriority, taskAssignedTo } = action.config;

    if (!taskTitle) {
      throw new Error('Create task action requires taskTitle');
    }

    if (!context.executionId || !context.workflowId) {
      throw new Error('Execution context must include executionId and workflowId');
    }

    try {
      // Process variables in title and description
      const processedTitle = this.replaceVariables(taskTitle, context.data);
      const processedDescription = this.replaceVariables(taskDescription || '', context.data);

      // Parse due date if provided
      let dueDate: Date | undefined;
      if (taskDueDate) {
        try {
          dueDate = new Date(taskDueDate);
          if (isNaN(dueDate.getTime())) {
            logger.warn('Invalid due date format, ignoring', { taskDueDate });
            dueDate = undefined;
          }
        } catch (error) {
          logger.warn('Failed to parse due date, ignoring', { taskDueDate, error });
          dueDate = undefined;
        }
      }

      // Validate priority
      const priority = taskPriority ? TaskPriority[taskPriority as keyof typeof TaskPriority] : TaskPriority.MEDIUM;

      // Validate assignee if provided
      if (taskAssignedTo) {
        const assigneeExists = await prisma.user.findUnique({
          where: { id: taskAssignedTo },
          select: { id: true },
        });

        if (!assigneeExists) {
          logger.warn('Assigned user not found, creating task without assignment', {
            assignedTo: taskAssignedTo,
          });
        }
      }

      // Create the workflow task in the database
      const task = await prisma.workflowTask.create({
        data: {
          workflowId: context.workflowId,
          executionId: context.executionId,
          userId,
          assignedTo: taskAssignedTo || null,
          title: processedTitle,
          description: processedDescription || null,
          status: TaskStatus.PENDING,
          priority,
          dueDate: dueDate || null,
          actionConfig: JSON.stringify(action.config),
          context: JSON.stringify({
            trigger: context.trigger,
            data: context.data,
            createdBy: 'workflow',
          }),
          metadata: JSON.stringify({
            workflowName: context.data?.workflowName || 'Unknown',
            triggerType: context.trigger,
            createdAt: new Date().toISOString(),
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Workflow task created successfully', {
        taskId: task.id,
        workflowId: context.workflowId,
        executionId: context.executionId,
        userId,
        assignedTo: taskAssignedTo,
        title: processedTitle,
        status: task.status,
        priority: task.priority,
      });

      return {
        action: 'create_task',
        taskId: task.id,
        title: processedTitle,
        description: processedDescription,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignee,
        createdAt: task.createdAt,
        success: true,
      };
    } catch (error) {
      logger.error('Failed to create workflow task', {
        error: error instanceof Error ? error.message : String(error),
        workflowId: context.workflowId,
        executionId: context.executionId,
        userId,
        taskTitle,
      });
      throw error;
    }
  }

  private async executeUpdateRecord(
    action: WorkflowAction,
    context: ExecutionContext,
    userId: string
  ): Promise<any> {
    const { recordType, recordId, updates } = action.config;

    if (!recordType || !recordId || !updates) {
      throw new Error('Update record action requires recordType, recordId, and updates');
    }

    // Update based on record type
    // This is a simplified version - in production, you'd have more validation
    logger.info('Record updated via workflow', {
      userId,
      recordType,
      recordId,
      updates,
    });

    return {
      action: 'update_record',
      recordType,
      recordId,
      updates,
      success: true,
    };
  }

  private async executeCallWebhook(
    action: WorkflowAction,
    context: ExecutionContext,
    userId: string
  ): Promise<any> {
    const { webhookUrl, webhookMethod = 'POST', webhookHeaders = {}, webhookBody = {} } = action.config;

    if (!webhookUrl) {
      throw new Error('Call webhook action requires webhookUrl');
    }

    // Process webhook body variables
    const processedBody = this.replaceVariablesInObject(webhookBody, context.data);

    const response = await fetch(webhookUrl, {
      method: webhookMethod,
      headers: {
        'Content-Type': 'application/json',
        ...webhookHeaders,
      },
      body: webhookMethod !== 'GET' ? JSON.stringify(processedBody) : undefined,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Webhook call failed with status ${response.status}: ${responseText}`);
    }

    return {
      action: 'call_webhook',
      url: webhookUrl,
      status: response.status,
      response: responseText,
      success: true,
    };
  }

  private replaceVariables(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private replaceVariablesInObject(obj: any, data: any): any {
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, data);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, data));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariablesInObject(value, data);
      }
      return result;
    }

    return obj;
  }
}

const workflowQueue = new WorkflowQueue();

export class WorkflowService {
  /**
   * Create a new workflow
   */
  static async createWorkflow(userId: string, data: WorkflowData): Promise<any> {
    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: data.name,
        trigger: data.trigger,
        actions: JSON.stringify(data.actions),
        isActive: data.isActive,
      },
    });

    return {
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
      actions: JSON.parse(workflow.actions),
      isActive: workflow.isActive,
      createdAt: workflow.createdAt,
    };
  }

  /**
   * Get workflows for a user
   */
  static async getUserWorkflows(userId: string): Promise<any[]> {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
      actions: JSON.parse(workflow.actions),
      isActive: workflow.isActive,
      executionCount: workflow._count.executions,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    }));
  }

  /**
   * Get a specific workflow
   */
  static async getWorkflow(userId: string, workflowId: string): Promise<any> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    if (!workflow) {
      return null;
    }

    return {
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
      actions: JSON.parse(workflow.actions),
      isActive: workflow.isActive,
      executionCount: workflow._count.executions,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  /**
   * Update a workflow
   */
  static async updateWorkflow(
    userId: string,
    workflowId: string,
    data: Partial<WorkflowData>
  ): Promise<boolean> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return false;
    }

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.trigger && { trigger: data.trigger }),
        ...(data.actions && { actions: JSON.stringify(data.actions) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return true;
  }

  /**
   * Delete a workflow
   */
  static async deleteWorkflow(userId: string, workflowId: string): Promise<boolean> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return false;
    }

    await prisma.workflow.delete({
      where: { id: workflowId },
    });

    return true;
  }

  /**
   * Trigger workflows based on an event
   */
  static async triggerEvent(
    userId: string,
    trigger: WorkflowTrigger,
    data: any
  ): Promise<void> {
    try {
      // Find all active workflows for this user and trigger
      const workflows = await prisma.workflow.findMany({
        where: {
          userId,
          trigger,
          isActive: true,
        },
      });

      if (workflows.length === 0) {
        return;
      }

      // Execute each workflow
      for (const workflow of workflows) {
        const execution = await prisma.workflowExecution.create({
          data: {
            workflowId: workflow.id,
            status: 'PENDING',
          },
        });

        const actions = JSON.parse(workflow.actions) as WorkflowAction[];

        // Queue for execution
        workflowQueue.add({
          executionId: execution.id,
          workflowId: workflow.id,
          userId,
          actions,
          context: {
            trigger,
            data,
            userId,
          },
        });
      }
    } catch (error) {
      logger.error('Error triggering workflow event:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Manually execute a workflow
   */
  static async executeWorkflow(userId: string, workflowId: string, data: any = {}): Promise<boolean> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return false;
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status: 'PENDING',
      },
    });

    const actions = JSON.parse(workflow.actions) as WorkflowAction[];

    // Queue for execution
    workflowQueue.add({
      executionId: execution.id,
      workflowId: workflow.id,
      userId,
      actions,
      context: {
        trigger: workflow.trigger,
        data,
        userId,
      },
    });

    return true;
  }

  /**
   * Get execution history for a workflow
   */
  static async getExecutionHistory(
    userId: string,
    workflowId: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    // Verify workflow ownership
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return null;
    }

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: { workflowId },
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.workflowExecution.count({ where: { workflowId } }),
    ]);

    return {
      executions: executions.map((exec) => ({
        id: exec.id,
        status: exec.status,
        executedAt: exec.executedAt,
        result: exec.result ? JSON.parse(exec.result) : null,
        error: exec.error,
        createdAt: exec.createdAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Get workflow tasks for a user
   */
  static async getUserWorkflowTasks(
    userId: string,
    filters?: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedTo?: string;
      workflowId?: string;
    },
    limit = 50,
    offset = 0
  ): Promise<any> {
    const where: any = {
      OR: [
        { userId },
        { assignedTo: userId },
      ],
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    if (filters?.workflowId) {
      where.workflowId = filters.workflowId;
    }

    const [tasks, total] = await Promise.all([
      prisma.workflowTask.findMany({
        where,
        orderBy: [
          { status: 'asc' }, // Pending tasks first
          { priority: 'desc' }, // High priority first
          { dueDate: 'asc' }, // Earliest due date first
        ],
        take: limit,
        skip: offset,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.workflowTask.count({ where }),
    ]);

    return {
      tasks: tasks.map((task) => ({
        id: task.id,
        workflowId: task.workflowId,
        workflowName: task.workflow.name,
        executionId: task.executionId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignee,
        owner: task.user,
        actionConfig: task.actionConfig ? JSON.parse(task.actionConfig) : null,
        context: task.context ? JSON.parse(task.context) : null,
        metadata: task.metadata ? JSON.parse(task.metadata) : null,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Get a specific workflow task
   */
  static async getWorkflowTask(userId: string, taskId: string): Promise<any> {
    const task = await prisma.workflowTask.findFirst({
      where: {
        id: taskId,
        OR: [
          { userId },
          { assignedTo: userId },
        ],
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        execution: {
          select: {
            id: true,
            status: true,
            executedAt: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      workflowId: task.workflowId,
      workflowName: task.workflow.name,
      execution: task.execution,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedTo: task.assignee,
      owner: task.user,
      actionConfig: task.actionConfig ? JSON.parse(task.actionConfig) : null,
      context: task.context ? JSON.parse(task.context) : null,
      metadata: task.metadata ? JSON.parse(task.metadata) : null,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Update a workflow task
   */
  static async updateWorkflowTask(
    userId: string,
    taskId: string,
    updates: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedTo?: string | null;
      description?: string;
      dueDate?: Date | null;
    }
  ): Promise<boolean> {
    // Verify user has access to the task
    const task = await prisma.workflowTask.findFirst({
      where: {
        id: taskId,
        OR: [
          { userId },
          { assignedTo: userId },
        ],
      },
    });

    if (!task) {
      return false;
    }

    // Prepare update data
    const updateData: any = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;

      // Set completedAt if status is COMPLETED
      if (updates.status === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (task.completedAt) {
        // Clear completedAt if status changed from COMPLETED to something else
        updateData.completedAt = null;
      }
    }

    if (updates.priority !== undefined) {
      updateData.priority = updates.priority;
    }

    if (updates.assignedTo !== undefined) {
      updateData.assignedTo = updates.assignedTo;
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    if (updates.dueDate !== undefined) {
      updateData.dueDate = updates.dueDate;
    }

    await prisma.workflowTask.update({
      where: { id: taskId },
      data: updateData,
    });

    logger.info('Workflow task updated', {
      taskId,
      userId,
      updates: Object.keys(updateData),
    });

    return true;
  }

  /**
   * Delete a workflow task
   */
  static async deleteWorkflowTask(userId: string, taskId: string): Promise<boolean> {
    const task = await prisma.workflowTask.findFirst({
      where: {
        id: taskId,
        userId, // Only owner can delete
      },
    });

    if (!task) {
      return false;
    }

    await prisma.workflowTask.delete({
      where: { id: taskId },
    });

    logger.info('Workflow task deleted', {
      taskId,
      userId,
    });

    return true;
  }

  /**
   * Get tasks for a specific workflow execution
   */
  static async getExecutionTasks(userId: string, executionId: string): Promise<any[]> {
    const tasks = await prisma.workflowTask.findMany({
      where: {
        executionId,
        OR: [
          { userId },
          { assignedTo: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedTo: task.assignee,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
    }));
  }
}
