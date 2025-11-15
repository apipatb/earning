import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Workspace Management
export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, color } = req.body;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        icon: icon || '📊',
        color: color || '#3B82F6',
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create workspace' });
  }
};

export const getWorkspaces = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { role } = req.query;

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
            ...(role && { role: role as string }),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

export const getWorkspaceById = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, timezone: true },
            },
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        sharedDashboards: {
          include: {
            dashboard: true,
          },
        },
        projects: true,
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is a member
    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
};

export const updateWorkspace = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, icon, color } = req.body;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is owner
    if (workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Only owner can update workspace' });
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(icon && { icon }),
        ...(color && { color }),
      },
      include: { members: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update workspace' });
  }
};

export const deleteWorkspace = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Only owner can delete workspace' });
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    res.json({ message: 'Workspace deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
};

// Workspace Members & Roles
export const inviteMembers = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { emails, role } = req.body;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invitations = await Promise.all(
      emails.map((email: string) =>
        prisma.workspaceInvitation.create({
          data: {
            workspaceId,
            email,
            role: role || 'member',
            invitedBy: userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })
      )
    );

    res.status(201).json(invitations);
  } catch (error) {
    res.status(400).json({ error: 'Failed to send invitations' });
  }
};

export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = (req as any).userId;
    const userEmail = (req as any).userEmail;

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.email !== userEmail) {
      return res.status(403).json({ error: 'Invalid invitation' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation expired' });
    }

    // Add user to workspace
    await prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      },
    });

    // Delete invitation
    await prisma.workspaceInvitation.delete({
      where: { id: invitationId },
    });

    res.json({ message: 'Joined workspace successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to accept invitation' });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update member role' });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to remove member' });
  }
};

// Shared Dashboards
export const shareWorkspaceDashboard = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { dashboardId, permission } = req.body;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace || !workspace.members.find((m) => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shared = await prisma.sharedDashboard.create({
      data: {
        workspaceId,
        dashboardId,
        permission: permission || 'view',
        sharedBy: userId,
      },
    });

    res.status(201).json(shared);
  } catch (error) {
    res.status(400).json({ error: 'Failed to share dashboard' });
  }
};

export const getSharedDashboards = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace || !workspace.members.find((m) => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shared = await prisma.sharedDashboard.findMany({
      where: { workspaceId },
      include: {
        dashboard: true,
        sharedBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(shared);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shared dashboards' });
  }
};

// Workspace Projects
export const createWorkspaceProject = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, icon, color } = req.body;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace || !workspace.members.find((m) => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await prisma.workspaceProject.create({
      data: {
        workspaceId,
        name,
        description,
        icon: icon || '📁',
        color: color || '#10B981',
        createdBy: userId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create project' });
  }
};

export const getWorkspaceProjects = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace || !workspace.members.find((m) => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const projects = await prisma.workspaceProject.findMany({
      where: { workspaceId },
      include: {
        tasks: true,
        createdByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Workspace Activity & Audit
export const getWorkspaceActivity = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace || !workspace.members.find((m) => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const activity = await prisma.workspaceActivity.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

export const getWorkspaceStats = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace || !workspace.members.find((m) => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = {
      totalMembers: workspace.members.length,
      membersByRole: {
        owner: workspace.members.filter((m) => m.role === 'owner').length,
        admin: workspace.members.filter((m) => m.role === 'admin').length,
        member: workspace.members.filter((m) => m.role === 'member').length,
        viewer: workspace.members.filter((m) => m.role === 'viewer').length,
      },
      totalProjects: await prisma.workspaceProject.count({ where: { workspaceId } }),
      totalSharedDashboards: await prisma.sharedDashboard.count({ where: { workspaceId } }),
      recentActivity: await prisma.workspaceActivity.count({
        where: {
          workspaceId,
          timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspace stats' });
  }
};

export const leaveWorkspace = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).userId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (workspace.ownerId === userId) {
      return res.status(400).json({ error: 'Owner cannot leave workspace' });
    }

    await prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId },
    });

    res.json({ message: 'Left workspace' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to leave workspace' });
  }
};
