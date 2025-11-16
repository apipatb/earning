import { PrismaClient, DataScope, PermissionLevel } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Permission Condition Interface
 */
export interface PermissionCondition {
  scope: DataScope;
  filters?: Record<string, any>;
  timeRestriction?: {
    startTime?: string; // HH:mm format
    endTime?: string;
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  };
  rateLimit?: {
    maxActions: number;
    windowMinutes: number;
  };
}

/**
 * Permission Check Result
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  scope?: DataScope;
  conditions?: PermissionCondition;
}

/**
 * Resource Permission Input
 */
export interface ResourcePermissionInput {
  userId: string;
  resource: string;
  action: string;
  condition?: PermissionCondition;
  grantedBy: string;
  expiresAt?: Date;
}

/**
 * Team Permission Input
 */
export interface TeamPermissionInput {
  teamId: string;
  userId?: string;
  permission: string;
  resource: string;
  level: PermissionLevel;
  scope?: DataScope;
  conditions?: PermissionCondition;
}

/**
 * Permission Service
 * Manages granular resource and team permissions with conditions
 */
export class PermissionService {
  /**
   * Check if user has permission to perform an action on a resource
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    // Check resource-level permission
    const resourcePermission = await prisma.resourcePermission.findFirst({
      where: {
        userId,
        resource,
        action,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (resourcePermission) {
      const conditionCheck = await this.checkConditions(
        resourcePermission.condition,
        context
      );

      if (conditionCheck.granted) {
        return {
          granted: true,
          scope: conditionCheck.scope,
          conditions: conditionCheck.conditions
        };
      }
    }

    // Check team permissions
    const teamPermissions = await this.getUserTeamPermissions(userId, resource, action);

    for (const teamPerm of teamPermissions) {
      const conditionCheck = await this.checkConditions(
        teamPerm.conditions,
        context
      );

      if (conditionCheck.granted) {
        return {
          granted: true,
          scope: teamPerm.scope,
          conditions: conditionCheck.conditions
        };
      }
    }

    // Check role-based permissions (fallback to RBAC)
    const hasRolePermission = await this.checkRoleBasedPermission(userId, resource, action);

    if (hasRolePermission) {
      return { granted: true, scope: DataScope.ALL };
    }

    return {
      granted: false,
      reason: `No permission found for ${action} on ${resource}`
    };
  }

  /**
   * Check multiple permissions with AND logic
   */
  async checkPermissionsAnd(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    for (const perm of permissions) {
      const result = await this.checkPermission(userId, perm.resource, perm.action, context);
      if (!result.granted) {
        return result;
      }
    }

    return { granted: true };
  }

  /**
   * Check multiple permissions with OR logic
   */
  async checkPermissionsOr(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    for (const perm of permissions) {
      const result = await this.checkPermission(userId, perm.resource, perm.action, context);
      if (result.granted) {
        return result;
      }
    }

    return {
      granted: false,
      reason: 'None of the required permissions found'
    };
  }

  /**
   * Check team permission
   */
  async checkTeamPermission(
    userId: string,
    teamId: string,
    resource: string,
    action: string
  ): Promise<PermissionCheckResult> {
    const teamPermission = await prisma.teamPermissionExtended.findFirst({
      where: {
        teamId,
        OR: [
          { userId }, // User-specific permission
          { userId: null } // Team-wide permission
        ],
        resource,
        permission: action
      }
    });

    if (!teamPermission) {
      return {
        granted: false,
        reason: `No team permission found for ${action} on ${resource}`
      };
    }

    const conditionCheck = await this.checkConditions(teamPermission.conditions);

    if (!conditionCheck.granted) {
      return conditionCheck;
    }

    return {
      granted: true,
      scope: teamPermission.scope,
      conditions: conditionCheck.conditions
    };
  }

  /**
   * Check resource ownership
   */
  async checkOwnership(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const resourceMap: Record<string, any> = {
      ticket: prisma.supportTicket,
      customer: prisma.customer,
      invoice: prisma.invoice,
      earning: prisma.earning,
      product: prisma.product,
      sale: prisma.sale,
      expense: prisma.expense,
      report: prisma.report
    };

    const model = resourceMap[resourceType];
    if (!model) {
      return false;
    }

    const resource = await model.findFirst({
      where: { id: resourceId, userId }
    });

    return !!resource;
  }

  /**
   * Check data visibility based on scope and user context
   */
  async checkDataVisibility(
    userId: string,
    dataType: string,
    dataId: string,
    requiredScope: DataScope = DataScope.OWN
  ): Promise<boolean> {
    switch (requiredScope) {
      case DataScope.OWN:
        return await this.checkOwnership(userId, dataType, dataId);

      case DataScope.TEAM:
        return await this.checkTeamDataAccess(userId, dataType, dataId);

      case DataScope.ORGANIZATION:
        return await this.checkOrganizationDataAccess(userId, dataType, dataId);

      case DataScope.ALL:
        return true;

      default:
        return false;
    }
  }

  /**
   * Get all permissions for a user (aggregated)
   */
  async getUserPermissions(userId: string): Promise<{
    resourcePermissions: any[];
    teamPermissions: any[];
    rolePermissions: any[];
  }> {
    const resourcePermissions = await prisma.resourcePermission.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            permissionsExtended: {
              where: {
                OR: [
                  { userId },
                  { userId: null }
                ]
              }
            }
          }
        }
      }
    });

    const teamPermissions = userTeams.flatMap(tm =>
      tm.team.permissionsExtended.map(p => ({
        ...p,
        teamName: tm.team.name
      }))
    );

    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    const rolePermissions = userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => ({
        ...rp.permission,
        roleName: ur.role.name
      }))
    );

    return {
      resourcePermissions,
      teamPermissions,
      rolePermissions
    };
  }

  /**
   * Grant resource permission to user
   */
  async grantPermission(data: ResourcePermissionInput): Promise<any> {
    const conditionJson = data.condition ? JSON.stringify(data.condition) : null;

    return await prisma.resourcePermission.create({
      data: {
        userId: data.userId,
        resource: data.resource,
        action: data.action,
        condition: conditionJson,
        grantedBy: data.grantedBy,
        expiresAt: data.expiresAt
      }
    });
  }

  /**
   * Revoke resource permission from user
   */
  async revokePermission(userId: string, resource: string, action: string): Promise<void> {
    await prisma.resourcePermission.deleteMany({
      where: {
        userId,
        resource,
        action
      }
    });
  }

  /**
   * Grant team permission
   */
  async grantTeamPermission(data: TeamPermissionInput): Promise<any> {
    const conditionsJson = data.conditions ? JSON.stringify(data.conditions) : null;

    return await prisma.teamPermissionExtended.create({
      data: {
        teamId: data.teamId,
        userId: data.userId,
        permission: data.permission,
        resource: data.resource,
        level: data.level,
        scope: data.scope || DataScope.TEAM,
        conditions: conditionsJson
      }
    });
  }

  /**
   * Update permission conditions
   */
  async updatePermissionConditions(
    permissionId: string,
    conditions: PermissionCondition
  ): Promise<any> {
    const conditionsJson = JSON.stringify(conditions);

    return await prisma.resourcePermission.update({
      where: { id: permissionId },
      data: { condition: conditionsJson }
    });
  }

  /**
   * Get permissions by resource
   */
  async getPermissionsByResource(resource: string): Promise<any[]> {
    return await prisma.resourcePermission.findMany({
      where: { resource },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get hierarchical permissions (role -> team -> resource)
   */
  async getHierarchicalPermissions(
    userId: string,
    resource: string
  ): Promise<{
    level: 'ROLE' | 'TEAM' | 'RESOURCE';
    permission: any;
    scope: DataScope;
  }[]> {
    const permissions: any[] = [];

    // Get role permissions
    const rolePerms = await this.getRolePermissionsForResource(userId, resource);
    permissions.push(...rolePerms.map(p => ({
      level: 'ROLE' as const,
      permission: p,
      scope: DataScope.ALL
    })));

    // Get team permissions
    const teamPerms = await this.getUserTeamPermissions(userId, resource);
    permissions.push(...teamPerms.map(p => ({
      level: 'TEAM' as const,
      permission: p,
      scope: p.scope
    })));

    // Get resource permissions
    const resourcePerms = await prisma.resourcePermission.findMany({
      where: {
        userId,
        resource,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    permissions.push(...resourcePerms.map(p => {
      const condition = p.condition ? JSON.parse(p.condition) : null;
      return {
        level: 'RESOURCE' as const,
        permission: p,
        scope: condition?.scope || DataScope.OWN
      };
    }));

    return permissions;
  }

  /**
   * Bulk grant permissions
   */
  async bulkGrantPermissions(
    permissions: ResourcePermissionInput[]
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const perm of permissions) {
      try {
        await this.grantPermission(perm);
        successful++;
      } catch (error) {
        console.error('Failed to grant permission:', error);
        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Check conditions (private helper)
   */
  private async checkConditions(
    conditionJson: string | null,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    if (!conditionJson) {
      return { granted: true };
    }

    try {
      const condition: PermissionCondition = JSON.parse(conditionJson);

      // Check time restrictions
      if (condition.timeRestriction) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const dayOfWeek = now.getDay();

        if (condition.timeRestriction.startTime && currentTime < condition.timeRestriction.startTime) {
          return { granted: false, reason: 'Outside allowed time window' };
        }

        if (condition.timeRestriction.endTime && currentTime > condition.timeRestriction.endTime) {
          return { granted: false, reason: 'Outside allowed time window' };
        }

        if (condition.timeRestriction.daysOfWeek &&
            !condition.timeRestriction.daysOfWeek.includes(dayOfWeek)) {
          return { granted: false, reason: 'Not allowed on this day of week' };
        }
      }

      // Check rate limits (simplified - would need Redis or similar in production)
      if (condition.rateLimit) {
        // This would require tracking action counts in a separate store
        // For now, we'll just acknowledge the limit exists
      }

      // Check custom filters against context
      if (condition.filters && context) {
        for (const [key, value] of Object.entries(condition.filters)) {
          if (context[key] !== value) {
            return { granted: false, reason: `Filter mismatch: ${key}` };
          }
        }
      }

      return {
        granted: true,
        scope: condition.scope,
        conditions: condition
      };
    } catch (error) {
      console.error('Error checking conditions:', error);
      return { granted: false, reason: 'Invalid conditions format' };
    }
  }

  /**
   * Get user team permissions (private helper)
   */
  private async getUserTeamPermissions(
    userId: string,
    resource?: string,
    action?: string
  ): Promise<any[]> {
    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true }
    });

    const teamIds = userTeams.map(t => t.teamId);

    const where: any = {
      teamId: { in: teamIds },
      OR: [
        { userId },
        { userId: null }
      ]
    };

    if (resource) {
      where.resource = resource;
    }

    if (action) {
      where.permission = action;
    }

    return await prisma.teamPermissionExtended.findMany({ where });
  }

  /**
   * Check role-based permission (private helper)
   */
  private async checkRoleBasedPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    for (const userRole of userRoles) {
      const hasPermission = userRole.role.rolePermissions.some(
        rp => rp.permission.resource === resource &&
              (rp.permission.action === action || rp.permission.action === 'MANAGE')
      );

      if (hasPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get role permissions for resource (private helper)
   */
  private async getRolePermissionsForResource(
    userId: string,
    resource: string
  ): Promise<any[]> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              },
              where: {
                permission: {
                  resource
                }
              }
            }
          }
        }
      }
    });

    return userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission)
    );
  }

  /**
   * Check team data access (private helper)
   */
  private async checkTeamDataAccess(
    userId: string,
    dataType: string,
    dataId: string
  ): Promise<boolean> {
    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true }
    });

    if (userTeams.length === 0) {
      return false;
    }

    // This is simplified - in production, you'd check if the data belongs to the team
    // For now, we'll check if the user owns it (fallback)
    return await this.checkOwnership(userId, dataType, dataId);
  }

  /**
   * Check organization data access (private helper)
   */
  private async checkOrganizationDataAccess(
    userId: string,
    dataType: string,
    dataId: string
  ): Promise<boolean> {
    // This is simplified - in production, you'd have organization models
    // For now, we'll check if user has ADMIN role
    const hasAdminRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: 'ADMIN' }
      }
    });

    return !!hasAdminRole;
  }
}

export const permissionService = new PermissionService();
