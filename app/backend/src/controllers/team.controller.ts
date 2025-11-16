import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { teamService } from '../services/team.service';
import { TeamRole } from '@prisma/client';

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'MANAGER', 'MEMBER']).optional(),
});

const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'MANAGER', 'MEMBER']),
});

const setPermissionSchema = z.object({
  memberId: z.string().uuid(),
  permission: z.enum(['MANAGE', 'VIEW', 'EDIT']),
  resource: z.string().min(1),
});

/**
 * POST /api/v1/teams
 * Create a new team
 */
export async function createTeam(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = createTeamSchema.parse(req.body);

    const team = await teamService.createTeam({
      ...validatedData,
      ownerId: userId,
    });

    logger.info(`[Team] Team created: ${team.id} by user ${userId}`);

    res.status(201).json(team);
  } catch (error) {
    logger.error('[Team] Error creating team:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create team',
    });
  }
}

/**
 * GET /api/v1/teams
 * Get all teams for the authenticated user
 */
export async function getTeams(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teams = await teamService.getUserTeams(userId);

    res.json(teams);
  } catch (error) {
    logger.error('[Team] Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

/**
 * GET /api/v1/teams/:id
 * Get a specific team
 */
export async function getTeam(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const team = await teamService.getTeam(id, userId);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    logger.error('[Team] Error fetching team:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch team' });
  }
}

/**
 * PUT /api/v1/teams/:id
 * Update a team
 */
export async function updateTeam(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const validatedData = updateTeamSchema.parse(req.body);

    const team = await teamService.updateTeam(id, userId, validatedData);

    logger.info(`[Team] Team updated: ${id} by user ${userId}`);

    res.json(team);
  } catch (error) {
    logger.error('[Team] Error updating team:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update team',
    });
  }
}

/**
 * DELETE /api/v1/teams/:id
 * Delete a team (owner only)
 */
export async function deleteTeam(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await teamService.deleteTeam(id, userId);

    logger.info(`[Team] Team deleted: ${id} by user ${userId}`);

    res.json(result);
  } catch (error) {
    logger.error('[Team] Error deleting team:', error);
    if (error instanceof Error && error.message.includes('Only the team owner')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete team',
    });
  }
}

/**
 * POST /api/v1/teams/:id/invite
 * Invite a member to the team
 */
export async function inviteMember(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: teamId } = req.params;
    const validatedData = inviteMemberSchema.parse(req.body);

    // Check if user is owner or manager
    const members = await teamService.getTeamMembers(teamId, userId);
    const requester = members.find((m) => m.userId === userId);

    if (!requester || ![TeamRole.OWNER, TeamRole.MANAGER].includes(requester.role)) {
      return res.status(403).json({ error: 'Not authorized to invite members' });
    }

    const invitation = await teamService.inviteMember({
      teamId,
      email: validatedData.email,
      role: validatedData.role as TeamRole | undefined,
    });

    logger.info(`[Team] Invitation sent: ${invitation.id} to ${validatedData.email} for team ${teamId}`);

    res.status(201).json(invitation);
  } catch (error) {
    logger.error('[Team] Error inviting member:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to invite member',
    });
  }
}

/**
 * POST /api/v1/teams/invitations/:token/accept
 * Accept a team invitation
 */
export async function acceptInvitation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { token } = req.params;

    const member = await teamService.acceptInvitation(token, userId);

    logger.info(`[Team] Invitation accepted: ${token} by user ${userId}`);

    res.json(member);
  } catch (error) {
    logger.error('[Team] Error accepting invitation:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to accept invitation',
    });
  }
}

/**
 * POST /api/v1/teams/invitations/:token/reject
 * Reject a team invitation
 */
export async function rejectInvitation(req: AuthRequest, res: Response) {
  try {
    const { token } = req.params;

    const result = await teamService.rejectInvitation(token);

    logger.info(`[Team] Invitation rejected: ${token}`);

    res.json(result);
  } catch (error) {
    logger.error('[Team] Error rejecting invitation:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to reject invitation',
    });
  }
}

/**
 * GET /api/v1/teams/:id/members
 * Get all members of a team
 */
export async function getTeamMembers(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: teamId } = req.params;

    const members = await teamService.getTeamMembers(teamId, userId);

    res.json(members);
  } catch (error) {
    logger.error('[Team] Error fetching team members:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
}

/**
 * DELETE /api/v1/teams/:id/members/:userId
 * Remove a member from the team
 */
export async function removeMember(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: teamId, userId: memberIdToRemove } = req.params;

    const result = await teamService.removeMember(teamId, userId, memberIdToRemove);

    logger.info(`[Team] Member removed: ${memberIdToRemove} from team ${teamId} by user ${userId}`);

    res.json(result);
  } catch (error) {
    logger.error('[Team] Error removing member:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remove member',
    });
  }
}

/**
 * PUT /api/v1/teams/:id/members/:userId/role
 * Update a member's role
 */
export async function updateMemberRole(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: teamId, userId: memberUserId } = req.params;
    const { role } = req.body;

    if (!role || !['OWNER', 'MANAGER', 'MEMBER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const member = await teamService.updateMemberRole({
      teamId,
      userId: memberUserId,
      role: role as TeamRole,
    });

    logger.info(`[Team] Member role updated: ${memberUserId} to ${role} in team ${teamId}`);

    res.json(member);
  } catch (error) {
    logger.error('[Team] Error updating member role:', error);
    if (error instanceof Error && error.message.includes('Only team owners')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update member role',
    });
  }
}

/**
 * POST /api/v1/teams/:id/permissions
 * Set permissions for a team member
 */
export async function setTeamPermission(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: teamId } = req.params;
    const validatedData = setPermissionSchema.parse(req.body);

    const permission = await teamService.setTeamPermission(
      {
        teamId,
        ...validatedData,
      },
      userId
    );

    logger.info(`[Team] Permission set: ${permission.id} for team ${teamId}`);

    res.json(permission);
  } catch (error) {
    logger.error('[Team] Error setting permission:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to set permission',
    });
  }
}

/**
 * GET /api/v1/teams/:id/analytics
 * Get team analytics
 */
export async function getTeamAnalytics(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: teamId } = req.params;

    const analytics = await teamService.getTeamAnalytics(teamId, userId);

    res.json(analytics);
  } catch (error) {
    logger.error('[Team] Error fetching team analytics:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch team analytics' });
  }
}
