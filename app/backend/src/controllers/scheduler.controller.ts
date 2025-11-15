import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

// Schedule manager for running cron jobs
const activeSchedules = new Map<string, cron.ScheduledTask>();

// Create scheduled task
export const createScheduledTask = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const {
      name,
      description,
      taskType,
      cronExpression,
      actionConfig,
      isActive,
      timezone,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate cron expression
    if (!isValidCronExpression(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const scheduledTask = await prisma.scheduledTask.create({
      data: {
        userId,
        name,
        description,
        taskType, // recurring_earning, reminder, report, cleanup
        cronExpression,
        actionConfig: actionConfig || {},
        isActive: isActive !== false,
        timezone: timezone || 'UTC',
        lastRunAt: null,
        nextRunAt: calculateNextRun(cronExpression, timezone),
      },
    });

    // Start the schedule if active
    if (scheduledTask.isActive) {
      startScheduledTask(userId, scheduledTask.id, cronExpression, scheduledTask);
    }

    res.status(201).json({
      message: 'Scheduled task created',
      task: scheduledTask,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's scheduled tasks
export const getScheduledTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tasks = await prisma.scheduledTask.findMany({
      where: { userId },
      orderBy: { nextRunAt: 'asc' },
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// Update scheduled task
export const updateScheduledTask = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;
    const { name, description, cronExpression, actionConfig, isActive, timezone } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existingTask = await prisma.scheduledTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Stop old schedule if it exists
    stopScheduledTask(existingTask.id);

    const updatedTask = await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        name: name || existingTask.name,
        description: description || existingTask.description,
        cronExpression: cronExpression || existingTask.cronExpression,
        actionConfig: actionConfig || existingTask.actionConfig,
        isActive: isActive !== undefined ? isActive : existingTask.isActive,
        timezone: timezone || existingTask.timezone,
        nextRunAt: cronExpression
          ? calculateNextRun(cronExpression, timezone || existingTask.timezone)
          : existingTask.nextRunAt,
      },
    });

    // Start new schedule if active
    if (updatedTask.isActive) {
      startScheduledTask(userId, updatedTask.id, updatedTask.cronExpression, updatedTask);
    }

    res.json({
      message: 'Task updated',
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// Delete scheduled task
export const deleteScheduledTask = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.scheduledTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Stop the schedule
    stopScheduledTask(taskId);

    await prisma.scheduledTask.delete({ where: { id: taskId } });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

// Get task execution history
export const getTaskExecutionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify task belongs to user
    const task = await prisma.scheduledTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const executions = await prisma.taskExecution.findMany({
      where: { taskId },
      orderBy: { executedAt: 'desc' },
      take: Number(limit) || 50,
      skip: Number(offset) || 0,
    });

    const total = await prisma.taskExecution.count({ where: { taskId } });

    res.json({
      executions,
      pagination: { total, limit: Number(limit) || 50, offset: Number(offset) || 0 },
    });
  } catch (error) {
    next(error);
  }
};

// Bulk scheduler
export const createBulkEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { earnings } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(earnings) || earnings.length === 0) {
      return res.status(400).json({ error: 'Invalid earnings data' });
    }

    const created = await prisma.earning.createMany({
      data: earnings.map((e: any) => ({
        userId,
        platformId: e.platformId,
        date: new Date(e.date),
        amount: e.amount,
        hours: e.hours || null,
        notes: e.notes || null,
      })),
    });

    res.status(201).json({
      message: `${created.count} earnings created`,
      count: created.count,
    });
  } catch (error) {
    next(error);
  }
};

// Get upcoming tasks
export const getUpcomingTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { days = 7 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));

    const tasks = await prisma.scheduledTask.findMany({
      where: {
        userId,
        isActive: true,
        nextRunAt: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// Run task immediately
export const runTaskNow = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { taskId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.scheduledTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Execute the task
    const execution = await executeTask(task);

    res.json({
      message: 'Task executed',
      execution,
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function isValidCronExpression(expression: string): boolean {
  try {
    cron.validate(expression);
    return true;
  } catch {
    return false;
  }
}

function calculateNextRun(cronExpression: string, timezone: string): Date {
  try {
    const nextDate = cron.nextDate(cronExpression);
    return nextDate instanceof Date ? nextDate : new Date();
  } catch {
    return new Date();
  }
}

function startScheduledTask(
  userId: string,
  taskId: string,
  cronExpression: string,
  task: any
) {
  try {
    const scheduleKey = `${userId}-${taskId}`;

    const scheduledTask = cron.schedule(cronExpression, async () => {
      await executeTask(task);
    });

    activeSchedules.set(scheduleKey, scheduledTask);
  } catch (error) {
    console.error('Error starting scheduled task:', error);
  }
}

function stopScheduledTask(taskId: string) {
  for (const [key, schedule] of activeSchedules.entries()) {
    if (key.endsWith(taskId)) {
      schedule.stop();
      activeSchedules.delete(key);
      break;
    }
  }
}

async function executeTask(task: any) {
  try {
    const startTime = new Date();

    let result: any = {};

    // Execute based on task type
    switch (task.taskType) {
      case 'recurring_earning':
        // Create a recurring earning entry
        if (task.actionConfig.platformId && task.actionConfig.amount) {
          await prisma.earning.create({
            data: {
              userId: task.userId,
              platformId: task.actionConfig.platformId,
              date: new Date(),
              amount: task.actionConfig.amount,
              hours: task.actionConfig.hours || null,
              notes: `Auto-created by schedule: ${task.name}`,
            },
          });
          result = { type: 'earning_created', amount: task.actionConfig.amount };
        }
        break;

      case 'reminder':
        // Create a reminder/notification
        result = { type: 'reminder', message: task.actionConfig.message };
        break;

      case 'report':
        // Trigger report generation
        result = { type: 'report_triggered', reportType: task.actionConfig.reportType };
        break;

      case 'cleanup':
        // Cleanup old data
        const daysOld = task.actionConfig.daysOld || 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const deleted = await prisma.earning.deleteMany({
          where: {
            userId: task.userId,
            createdAt: { lt: cutoffDate },
          },
        });

        result = { type: 'cleanup', deletedCount: deleted.count };
        break;

      default:
        result = { type: 'unknown' };
    }

    // Record execution
    const execution = await prisma.taskExecution.create({
      data: {
        taskId: task.id,
        status: 'completed',
        result: result,
        executedAt: startTime,
        durationMs: Date.now() - startTime.getTime(),
      },
    });

    // Update task's last run
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        lastRunAt: startTime,
        nextRunAt: calculateNextRun(task.cronExpression, task.timezone),
      },
    });

    return execution;
  } catch (error) {
    console.error('Error executing task:', error);

    // Record failed execution
    await prisma.taskExecution.create({
      data: {
        taskId: task.id,
        status: 'failed',
        result: { error: String(error) },
        executedAt: new Date(),
        durationMs: 0,
      },
    });

    throw error;
  }
}

// Initialize all active tasks on server startup
export const initializeScheduledTasks = async () => {
  try {
    const activeTasks = await prisma.scheduledTask.findMany({
      where: { isActive: true },
    });

    for (const task of activeTasks) {
      startScheduledTask(task.userId, task.id, task.cronExpression, task);
    }

    console.log(`Initialized ${activeTasks.length} scheduled tasks`);
  } catch (error) {
    console.error('Error initializing scheduled tasks:', error);
  }
};
