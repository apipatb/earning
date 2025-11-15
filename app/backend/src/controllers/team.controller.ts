import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ROLE_PERMISSIONS = {
  owner: ['read', 'write', 'delete', 'invite', 'manage_roles', 'billing'],
  admin: ['read', 'write', 'delete', 'invite', 'manage_roles'],
  member: ['read', 'write'],
  viewer: ['read'],
};

// Create workspace
export const createWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;
    const { name } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (tier === 'free') {
      return res.status(403).json({
        error: 'Workspaces require Pro tier',
        requiredTier: 'pro',
      });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: userId,
        inviteCode: crypto.randomBytes(16).toString('hex'),
      },
    });

    // Add owner as member
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'owner',
      },
    });

    res.status(201).json({
      message: 'Workspace created',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// Get user workspaces
export const getUserWorkspaces = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    res.json(workspaces);
  } catch (error) {
    next(error);
  }
};

// Invite user to workspace
export const inviteUserToWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { workspaceId, email, role } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is owner
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, role: 'owner' },
    });

    if (!member) {
      return res.status(403).json({ error: 'Only owners can invite' });
    }

    // Find or create user
    let invitedUser = await prisma.user.findUnique({ where: { email } });

    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: invitedUser.id },
    });

    if (existing) {
      return res.status(400).json({ error: 'User already a member' });
    }

    // Add member
    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitedUser.id,
        role: role || 'member',
      },
    });

    res.json({
      message: 'User invited',
      member: newMember,
    });
  } catch (error) {
    next(error);
  }
};

// Remove member from workspace
export const removeMemberFromWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { workspaceId, memberId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is owner
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, role: 'owner' },
    });

    if (!member) {
      return res.status(403).json({ error: 'Only owners can remove members' });
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    next(error);
  }
};

// Update member role
export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { workspaceId, memberId, role } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user is owner
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, role: 'owner' },
    });

    if (!member) {
      return res.status(403).json({ error: 'Only owners can change roles' });
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });

    res.json({ message: 'Role updated', member: updated });
  } catch (error) {
    next(error);
  }
};

// Get workspace audit log
export const getAuditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is in workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspaceId as string, userId },
    });

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const logs = await prisma.auditLog.findMany({
      where: { workspaceId: workspaceId as string },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// Log action
export const logAction = async (
  workspaceId: string,
  userId: string,
  action: string,
  details: any
) => {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};

// Get workspace settings
export const getWorkspaceSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId },
    });

    if (!settings) {
      settings = await prisma.workspaceSettings.create({
        data: {
          workspaceId,
          allowPublicReports: false,
          requireApprovalForExpenses: false,
          twoFactorRequired: false,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Update workspace settings
export const updateWorkspaceSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.params;
    const settings = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if owner
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, role: 'owner' },
    });

    if (!member) {
      return res.status(403).json({ error: 'Only owners can update settings' });
    }

    const updated = await prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: settings,
      create: { workspaceId, ...settings },
    });

    // Log the action
    await logAction(workspaceId, userId, 'workspace_settings_updated', settings);

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
