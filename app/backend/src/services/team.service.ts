import { PrismaClient, TeamRole, InvitationStatus } from '@prisma/client';
import crypto from 'crypto';
import { sendEmail } from '../utils/email';

const prisma = new PrismaClient();

interface CreateTeamInput {
  name: string;
  description?: string;
  ownerId: string;
}

interface InviteMemberInput {
  teamId: string;
  email: string;
  role?: TeamRole;
}

interface UpdateMemberRoleInput {
  teamId: string;
  userId: string;
  role: TeamRole;
}

interface TeamPermissionInput {
  teamId: string;
  memberId: string;
  permission: 'MANAGE' | 'VIEW' | 'EDIT';
  resource: string;
}

class TeamService {
  /**
   * Create a new team
   */
  async createTeam(input: CreateTeamInput) {
    const { name, description, ownerId } = input;

    // Create team with owner as first member
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: TeamRole.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return team;
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string, userId: string) {
    // Check if user is a member
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!member) {
      throw new Error('Not authorized to view this team');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            permissions: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        invitations: {
          where: {
            status: InvitationStatus.PENDING,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return team;
  }

  /**
   * Get all teams for a user
   */
  async getUserTeams(userId: string) {
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return teams;
  }

  /**
   * Update team details
   */
  async updateTeam(teamId: string, userId: string, data: { name?: string; description?: string }) {
    // Check if user is owner or manager
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        role: {
          in: [TeamRole.OWNER, TeamRole.MANAGER],
        },
      },
    });

    if (!member) {
      throw new Error('Not authorized to update this team');
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return team;
  }

  /**
   * Invite a member to the team
   */
  async inviteMember(input: InviteMemberInput) {
    const { teamId, email, role = TeamRole.MEMBER } = input;

    // Check if user already exists in the team
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: existingUser.id,
        },
      });

      if (existingMember) {
        throw new Error('User is already a member of this team');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        token,
        role,
        expiresAt,
      },
      include: {
        team: {
          select: {
            name: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Send invitation email
    try {
      await sendEmail({
        to: email,
        subject: `You've been invited to join ${invitation.team.name}`,
        html: `
          <h2>Team Invitation</h2>
          <p>You've been invited to join the team <strong>${invitation.team.name}</strong> by ${invitation.team.owner.name || invitation.team.owner.email}.</p>
          <p>Role: ${role}</p>
          <p>Click the link below to accept the invitation:</p>
          <p><a href="${process.env.FRONTEND_URL}/teams/accept-invitation?token=${token}">Accept Invitation</a></p>
          <p>This invitation will expire on ${expiresAt.toLocaleDateString()}.</p>
        `,
      });
    } catch (error) {
      console.error('[Team] Failed to send invitation email:', error);
    }

    return invitation;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: true,
      },
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation has already been processed');
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new Error('Invitation has expired');
    }

    // Check if user email matches
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invitation.email) {
      throw new Error('This invitation is not for your account');
    }

    // Add user to team
    const member = await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
      },
      include: {
        team: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Update invitation status
    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    return member;
  }

  /**
   * Reject an invitation
   */
  async rejectInvitation(token: string) {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation has already been processed');
    }

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.REJECTED },
    });

    return { message: 'Invitation rejected' };
  }

  /**
   * Remove a member from the team
   */
  async removeMember(teamId: string, userId: string, memberIdToRemove: string) {
    // Check if user is owner or manager
    const requester = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        role: {
          in: [TeamRole.OWNER, TeamRole.MANAGER],
        },
      },
    });

    if (!requester) {
      throw new Error('Not authorized to remove members');
    }

    const memberToRemove = await prisma.teamMember.findFirst({
      where: {
        teamId,
        id: memberIdToRemove,
      },
    });

    if (!memberToRemove) {
      throw new Error('Member not found');
    }

    // Cannot remove the owner
    if (memberToRemove.role === TeamRole.OWNER) {
      throw new Error('Cannot remove the team owner');
    }

    // Managers can only remove regular members
    if (requester.role === TeamRole.MANAGER && memberToRemove.role === TeamRole.MANAGER) {
      throw new Error('Managers cannot remove other managers');
    }

    await prisma.teamMember.delete({
      where: { id: memberIdToRemove },
    });

    return { message: 'Member removed successfully' };
  }

  /**
   * Update member role
   */
  async updateMemberRole(input: UpdateMemberRoleInput) {
    const { teamId, userId, role } = input;

    // Only owners can update roles
    const requester = await prisma.teamMember.findFirst({
      where: {
        teamId,
        role: TeamRole.OWNER,
      },
    });

    if (!requester) {
      throw new Error('Only team owners can update member roles');
    }

    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Cannot change owner role
    if (member.role === TeamRole.OWNER) {
      throw new Error('Cannot change the owner role');
    }

    const updatedMember = await prisma.teamMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updatedMember;
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string, userId: string) {
    // Check if user is a member
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!member) {
      throw new Error('Not authorized to view team members');
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        permissions: true,
      },
      orderBy: [
        { role: 'asc' }, // Owner first, then manager, then member
        { joinedAt: 'asc' },
      ],
    });

    return members;
  }

  /**
   * Set team permission for a member
   */
  async setTeamPermission(input: TeamPermissionInput, requesterId: string) {
    const { teamId, memberId, permission, resource } = input;

    // Check if requester is owner or manager
    const requester = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: requesterId,
        role: {
          in: [TeamRole.OWNER, TeamRole.MANAGER],
        },
      },
    });

    if (!requester) {
      throw new Error('Not authorized to set permissions');
    }

    // Check if member exists
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== teamId) {
      throw new Error('Member not found in this team');
    }

    // Upsert permission
    const teamPermission = await prisma.teamPermission.upsert({
      where: {
        memberId_resource: {
          memberId,
          resource,
        },
      },
      update: {
        permission,
      },
      create: {
        teamId,
        memberId,
        permission,
        resource,
      },
    });

    return teamPermission;
  }

  /**
   * Get team analytics
   */
  async getTeamAnalytics(teamId: string, userId: string) {
    // Check if user is a member
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!member) {
      throw new Error('Not authorized to view team analytics');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: {
          select: {
            members: true,
            invitations: {
              where: {
                status: InvitationStatus.PENDING,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const roleDistribution = await prisma.teamMember.groupBy({
      by: ['role'],
      where: { teamId },
      _count: true,
    });

    return {
      totalMembers: team._count.members,
      pendingInvitations: team._count.invitations,
      roleDistribution,
      teamAge: Math.floor(
        (new Date().getTime() - team.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    };
  }

  /**
   * Delete a team (owner only)
   */
  async deleteTeam(teamId: string, userId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new Error('Only the team owner can delete the team');
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { isActive: false },
    });

    return { message: 'Team deleted successfully' };
  }
}

export const teamService = new TeamService();
