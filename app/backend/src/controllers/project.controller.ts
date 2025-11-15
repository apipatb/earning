import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Project Management
export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      status,
      clientId,
      startDate,
      endDate,
      budget,
      priority,
      category,
    } = req.body;
    const userId = (req as any).userId;

    const project = await prisma.project.create({
      data: {
        userId,
        clientId: clientId || null,
        name,
        description: description || null,
        status: status || 'planning', // planning, active, on-hold, completed, archived
        priority: priority || 'medium', // low, medium, high, critical
        category: category || 'other',
        budget: budget || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        createdAt: new Date(),
      },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create project' });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, priority, search, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      include: {
        tasks: true,
        milestones: true,
        team: true,
      },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        team: true,
        documents: true,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, description, status, priority, budget, startDate, endDate } = req.body;
    const userId = (req as any).userId;

    await prisma.project.updateMany({
      where: { id: projectId, userId },
      data: {
        name,
        description,
        status,
        priority,
        budget,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).userId;

    await prisma.project.deleteMany({
      where: { id: projectId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete project' });
  }
};

// Task Management
export const createTask = async (req: Request, res: Response) => {
  try {
    const { projectId, title, description, status, priority, assignedTo, dueDate, estimatedHours } = req.body;
    const userId = (req as any).userId;

    const task = await prisma.task.create({
      data: {
        userId,
        projectId,
        title,
        description: description || null,
        status: status || 'todo', // todo, in-progress, review, blocked, completed
        priority: priority || 'medium',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours || null,
        createdAt: new Date(),
      },
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create task' });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, status, priority, limit = 100, page = 1 } = req.query;

    const where: any = { userId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      include: {
        subtasks: true,
      },
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).userId;

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        subtasks: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, assignedTo, dueDate, estimatedHours } = req.body;
    const userId = (req as any).userId;

    await prisma.task.updateMany({
      where: { id: taskId, userId },
      data: {
        title,
        description,
        status,
        priority,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update task' });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = (req as any).userId;

    await prisma.task.updateMany({
      where: { id: taskId, userId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update task status' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).userId;

    await prisma.task.deleteMany({
      where: { id: taskId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete task' });
  }
};

// Subtasks
export const createSubtask = async (req: Request, res: Response) => {
  try {
    const { taskId, title, completed } = req.body;
    const userId = (req as any).userId;

    const subtask = await prisma.subtask.create({
      data: {
        userId,
        taskId,
        title,
        completed: completed || false,
        createdAt: new Date(),
      },
    });

    res.status(201).json(subtask);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create subtask' });
  }
};

export const updateSubtask = async (req: Request, res: Response) => {
  try {
    const { subtaskId } = req.params;
    const { title, completed } = req.body;
    const userId = (req as any).userId;

    await prisma.subtask.updateMany({
      where: { id: subtaskId, userId },
      data: {
        title,
        completed,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update subtask' });
  }
};

// Milestones
export const createMilestone = async (req: Request, res: Response) => {
  try {
    const { projectId, name, description, dueDate, deliverables } = req.body;
    const userId = (req as any).userId;

    const milestone = await prisma.milestone.create({
      data: {
        userId,
        projectId,
        name,
        description: description || null,
        dueDate: new Date(dueDate),
        deliverables: deliverables || null,
        completed: false,
        createdAt: new Date(),
      },
    });

    res.status(201).json(milestone);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create milestone' });
  }
};

export const getMilestones = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const userId = (req as any).userId;

    const milestones = await prisma.milestone.findMany({
      where: {
        userId,
        projectId: projectId as string,
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(milestones);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
};

export const completeMilestone = async (req: Request, res: Response) => {
  try {
    const { milestoneId } = req.params;
    const userId = (req as any).userId;

    await prisma.milestone.updateMany({
      where: { id: milestoneId, userId },
      data: {
        completed: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to complete milestone' });
  }
};

// Project Analytics
export const getProjectAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const totalProjects = await prisma.project.count({
      where: { userId },
    });

    const activeProjects = await prisma.project.count({
      where: { userId, status: 'active' },
    });

    const completedProjects = await prisma.project.count({
      where: { userId, status: 'completed' },
    });

    const totalTasks = await prisma.task.count({
      where: { userId },
    });

    const completedTasks = await prisma.task.count({
      where: { userId, status: 'completed' },
    });

    const inProgressTasks = await prisma.task.count({
      where: { userId, status: 'in-progress' },
    });

    const totalBudget = await prisma.project.aggregate({
      where: { userId },
      _sum: { budget: true },
    });

    const analytics = {
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects: totalProjects - activeProjects - completedProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks: totalTasks - completedTasks - inProgressTasks,
      completionRate:
        totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : '0',
      totalBudget: totalBudget._sum.budget || 0,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Project Statistics
export const getProjectStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        tasks: true,
      },
    });

    const statusBreakdown = {
      planning: projects.filter((p) => p.status === 'planning').length,
      active: projects.filter((p) => p.status === 'active').length,
      onHold: projects.filter((p) => p.status === 'on-hold').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      archived: projects.filter((p) => p.status === 'archived').length,
    };

    const priorityBreakdown = {
      low: projects.filter((p) => p.priority === 'low').length,
      medium: projects.filter((p) => p.priority === 'medium').length,
      high: projects.filter((p) => p.priority === 'high').length,
      critical: projects.filter((p) => p.priority === 'critical').length,
    };

    const stats = {
      totalProjects: projects.length,
      avgTasksPerProject:
        projects.length > 0
          ? (projects.reduce((sum, p) => sum + p.tasks.length, 0) / projects.length).toFixed(2)
          : 0,
      statusBreakdown,
      priorityBreakdown,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Task Statistics by Project
export const getTaskStatisticsByProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const userId = (req as any).userId;

    const tasks = await prisma.task.findMany({
      where: { userId, projectId: projectId as string },
    });

    const statusBreakdown = {
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      review: tasks.filter((t) => t.status === 'review').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };

    const stats = {
      totalTasks: tasks.length,
      statusBreakdown,
      completionPercentage:
        tasks.length > 0
          ? ((statusBreakdown.completed / tasks.length) * 100).toFixed(2)
          : 0,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
};

// Task Comments
export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const { taskId, comment } = req.body;
    const userId = (req as any).userId;

    const taskComment = await prisma.taskComment.create({
      data: {
        userId,
        taskId,
        comment,
        createdAt: new Date(),
      },
    });

    res.status(201).json(taskComment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add comment' });
  }
};

export const getTaskComments = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.query;
    const userId = (req as any).userId;

    const comments = await prisma.taskComment.findMany({
      where: {
        userId,
        taskId: taskId as string,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};
