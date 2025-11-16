import { PrismaClient, DataScope, PermissionLevel } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Redis client initialization (with fallback)
let redis: any = null;
let redisAvailable = false;

try {
  const ioredis = require('ioredis');
  redis = new ioredis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.warn('Redis connection failed after 3 retries, rate limiting will use fallback');
        return null;
      }
      return Math.min(times * 100, 3000);
    }
  });

  redis.on('ready', () => {
    redisAvailable = true;
    logger.info('Redis connected successfully for rate limiting');
  });

  redis.on('error', (err: Error) => {
    redisAvailable = false;
    logger.warn('Redis connection error, rate limiting will use fallback:', err.message);
  });

  redis.on('end', () => {
    redisAvailable = false;
    logger.warn('Redis connection ended, rate limiting will use fallback');
  });
} catch (error) {
  logger.warn('Redis not available, rate limiting will use fallback mode');
  redisAvailable = false;
}

// In-memory fallback for rate limiting (when Redis is unavailable)
interface RateLimitEntry {
  count: number;
  windowStart: Date;
}

const rateLimitCache = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (!redis) {
  setInterval(() => {
    const now = new Date();
    for (const [key, entry] of rateLimitCache.entries()) {
      const hoursSinceStart = (now.getTime() - entry.windowStart.getTime()) / (1000 * 60 * 60);
      if (hoursSinceStart > 1) {
        rateLimitCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

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
 * Rate Limit Status
 */
export interface RateLimitStatus {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  windowMinutes: number;
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
    // Enhance context with userId and action for rate limiting
    const enhancedContext = {
      ...context,
      userId,
      action: `${resource}:${action}` // Format: resource:action (e.g., "ticket:create")
    };

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
        enhancedContext
      );

      if (conditionCheck.granted) {
        return {
          granted: true,
          scope: conditionCheck.scope,
          conditions: conditionCheck.conditions
        };
      } else {
        // Return the specific reason from condition check (e.g., rate limit exceeded)
        return conditionCheck;
      }
    }

    // Check team permissions
    const teamPermissions = await this.getUserTeamPermissions(userId, resource, action);

    for (const teamPerm of teamPermissions) {
      const conditionCheck = await this.checkConditions(
        teamPerm.conditions,
        enhancedContext
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
   * Check if action is allowed based on rate limit
   * @param action The action being performed (e.g., 'create_ticket', 'send_message')
   * @param userId The user performing the action
   * @param maxActions Maximum allowed actions in the window
   * @param windowMinutes Time window in minutes
   * @returns RateLimitStatus indicating if action is allowed
   */
  async checkRateLimit(
    action: string,
    userId: string,
    maxActions: number,
    windowMinutes: number
  ): Promise<RateLimitStatus> {
    try {
      const status = await this.getRateLimitStatus(action, userId, maxActions, windowMinutes);

      if (!status.allowed) {
        logger.warn('Rate limit exceeded', {
          userId,
          action,
          current: status.current,
          limit: status.limit,
          resetAt: status.resetAt
        });
      }

      return status;
    } catch (error) {
      logger.error('Rate limit check error:', error);
      // On error, allow the action (fail open for better UX)
      return {
        allowed: true,
        current: 0,
        limit: maxActions,
        remaining: maxActions,
        resetAt: new Date(Date.now() + windowMinutes * 60 * 1000),
        windowMinutes
      };
    }
  }

  /**
   * Increment rate limit counter for an action
   * Should be called after an action is successfully performed
   * @param action The action being performed
   * @param userId The user performing the action
   * @param windowMinutes Time window in minutes (default: 60)
   * @returns Current count after increment
   */
  async incrementRateLimit(
    action: string,
    userId: string,
    windowMinutes: number = 60
  ): Promise<number> {
    const key = this.getRateLimitKey(action, userId, windowMinutes);
    const expirationSeconds = windowMinutes * 60;

    try {
      // Try Redis first
      if (redisAvailable && redis) {
        const count = await redis.incr(key);
        // Set expiration only on first increment (when count === 1)
        if (count === 1) {
          await redis.expire(key, expirationSeconds);
        }
        return count;
      }

      // Fallback to in-memory cache
      return this.incrementRateLimitFallback(key, windowMinutes);
    } catch (error) {
      logger.error('Rate limit increment error:', error);
      // Use fallback on error
      return this.incrementRateLimitFallback(key, windowMinutes);
    }
  }

  /**
   * Get current rate limit status for an action
   * @param action The action to check
   * @param userId The user to check
   * @param maxActions Maximum allowed actions
   * @param windowMinutes Time window in minutes
   * @returns RateLimitStatus with current usage
   */
  async getRateLimitStatus(
    action: string,
    userId: string,
    maxActions: number,
    windowMinutes: number
  ): Promise<RateLimitStatus> {
    const key = this.getRateLimitKey(action, userId, windowMinutes);

    try {
      let current = 0;
      let ttl = windowMinutes * 60;

      // Try Redis first
      if (redisAvailable && redis) {
        const [count, remaining] = await Promise.all([
          redis.get(key),
          redis.ttl(key)
        ]);
        current = count ? parseInt(count) : 0;
        ttl = remaining > 0 ? remaining : windowMinutes * 60;
      } else {
        // Fallback to in-memory cache
        const entry = rateLimitCache.get(key);
        if (entry) {
          const elapsed = Date.now() - entry.windowStart.getTime();
          const windowMs = windowMinutes * 60 * 1000;
          if (elapsed < windowMs) {
            current = entry.count;
            ttl = Math.floor((windowMs - elapsed) / 1000);
          }
        }
      }

      const remaining = Math.max(0, maxActions - current);
      const resetAt = new Date(Date.now() + ttl * 1000);

      return {
        allowed: current < maxActions,
        current,
        limit: maxActions,
        remaining,
        resetAt,
        windowMinutes
      };
    } catch (error) {
      logger.error('Get rate limit status error:', error);
      // On error, return permissive status
      return {
        allowed: true,
        current: 0,
        limit: maxActions,
        remaining: maxActions,
        resetAt: new Date(Date.now() + windowMinutes * 60 * 1000),
        windowMinutes
      };
    }
  }

  /**
   * Reset rate limit for a specific action and user
   * Useful for admin operations or testing
   * @param action The action to reset
   * @param userId The user to reset for
   * @param windowMinutes Time window in minutes
   */
  async resetRateLimit(
    action: string,
    userId: string,
    windowMinutes: number = 60
  ): Promise<void> {
    const key = this.getRateLimitKey(action, userId, windowMinutes);

    try {
      if (redisAvailable && redis) {
        await redis.del(key);
      }
      rateLimitCache.delete(key);
      logger.info('Rate limit reset', { userId, action });
    } catch (error) {
      logger.error('Reset rate limit error:', error);
      // Still try to delete from fallback cache
      rateLimitCache.delete(key);
    }
  }

  /**
   * Get rate limit key for Redis/cache
   * Format: ratelimit:{action}:{userId}:{windowStart}
   * @private
   */
  private getRateLimitKey(action: string, userId: string, windowMinutes: number): string {
    // Calculate current window start time
    const now = new Date();
    const windowMs = windowMinutes * 60 * 1000;
    const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
    const windowHour = new Date(windowStart).toISOString().slice(0, 13); // YYYY-MM-DDTHH

    return `ratelimit:${action}:${userId}:${windowHour}`;
  }

  /**
   * Increment rate limit using in-memory fallback
   * @private
   */
  private incrementRateLimitFallback(key: string, windowMinutes: number): number {
    const now = new Date();
    const entry = rateLimitCache.get(key);

    if (!entry) {
      rateLimitCache.set(key, { count: 1, windowStart: now });
      return 1;
    }

    // Check if window has expired
    const windowMs = windowMinutes * 60 * 1000;
    const elapsed = now.getTime() - entry.windowStart.getTime();

    if (elapsed >= windowMs) {
      // Start new window
      rateLimitCache.set(key, { count: 1, windowStart: now });
      return 1;
    }

    // Increment existing window
    entry.count++;
    return entry.count;
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

      // Check rate limits using Redis-based tracking
      if (condition.rateLimit && context?.userId && context?.action) {
        const rateLimitStatus = await this.checkRateLimit(
          context.action,
          context.userId,
          condition.rateLimit.maxActions,
          condition.rateLimit.windowMinutes
        );

        if (!rateLimitStatus.allowed) {
          const resetTime = rateLimitStatus.resetAt.toLocaleTimeString();
          const resetMinutes = Math.ceil((rateLimitStatus.resetAt.getTime() - Date.now()) / 60000);

          return {
            granted: false,
            reason: `Rate limit exceeded: ${rateLimitStatus.current}/${rateLimitStatus.limit} actions in ${rateLimitStatus.windowMinutes} minutes. Resets in ${resetMinutes} minute(s) at ${resetTime}.`
          };
        }

        // Increment counter after successful check
        await this.incrementRateLimit(
          context.action,
          context.userId,
          condition.rateLimit.windowMinutes
        );
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
      logger.error('Error checking conditions:', error);
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
   * Verifies if user can access data based on team membership
   */
  private async checkTeamDataAccess(
    userId: string,
    dataType: string,
    dataId: string
  ): Promise<boolean> {
    try {
      // Get user's teams with their roles
      const userTeams = await this.getUserTeams(userId);

      if (userTeams.length === 0) {
        logger.warn(`[TeamAccess] User ${userId} is not a member of any team`);
        return false;
      }

      // Map resource type to Prisma model
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

      const model = resourceMap[dataType];
      if (!model) {
        logger.error(`[TeamAccess] Unknown resource type: ${dataType}`);
        return false;
      }

      // Get the resource data
      const resource = await model.findUnique({
        where: { id: dataId },
        select: { id: true, userId: true }
      });

      if (!resource) {
        logger.warn(`[TeamAccess] Resource not found: ${dataType}/${dataId}`);
        return false;
      }

      // Check if the resource owner is in any of the user's teams
      const resourceOwnerId = resource.userId;

      // If user owns the resource, grant access
      if (resourceOwnerId === userId) {
        return true;
      }

      // Check each team the user belongs to
      for (const userTeam of userTeams) {
        const isTeammate = await this.checkTeamAccess(resourceOwnerId, userTeam.teamId);

        if (isTeammate) {
          logger.info(`[TeamAccess] Access granted: User ${userId} can access ${dataType}/${dataId} via team ${userTeam.teamId} (role: ${userTeam.role})`);
          return true;
        }
      }

      logger.warn(`[TeamAccess] Access denied: Resource owner ${resourceOwnerId} is not in any of user ${userId}'s teams`);
      return false;
    } catch (error) {
      logger.error(`[TeamAccess] Error checking team data access:`, error);
      return false;
    }
  }

  /**
   * Check organization data access (private helper)
   * Verifies if user can access data based on organization membership
   *
   * NOTE: This implementation requires an Organization model to be fully functional.
   * Current implementation provides a foundation that can be extended when:
   * - Organization model is added to schema.prisma with fields:
   *   - id, name, description, ownerId, isActive, etc.
   * - OrganizationMember model is created for membership tracking
   * - Data models are extended with organizationId field
   */
  private async checkOrganizationDataAccess(
    userId: string,
    dataType: string,
    dataId: string
  ): Promise<boolean> {
    try {
      // Get user's organizations (when Organization model exists)
      const userOrgs = await this.getUserOrganizations(userId);

      if (userOrgs.length === 0) {
        logger.warn(`[OrgAccess] User ${userId} is not a member of any organization`);
        return false;
      }

      // Map resource type to Prisma model
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

      const model = resourceMap[dataType];
      if (!model) {
        logger.error(`[OrgAccess] Unknown resource type: ${dataType}`);
        return false;
      }

      // Get the resource data
      const resource = await model.findUnique({
        where: { id: dataId },
        select: { id: true, userId: true }
      });

      if (!resource) {
        logger.warn(`[OrgAccess] Resource not found: ${dataType}/${dataId}`);
        return false;
      }

      const resourceOwnerId = resource.userId;

      // If user owns the resource, grant access
      if (resourceOwnerId === userId) {
        return true;
      }

      // Check each organization the user belongs to
      for (const userOrg of userOrgs) {
        const hasAccess = await this.checkOrgAccess(resourceOwnerId, userOrg.orgId, userOrg.role);

        if (hasAccess) {
          logger.info(`[OrgAccess] Access granted: User ${userId} can access ${dataType}/${dataId} via org ${userOrg.orgId} (role: ${userOrg.role})`);
          return true;
        }
      }

      logger.warn(`[OrgAccess] Access denied: Resource owner ${resourceOwnerId} is not in any of user ${userId}'s organizations`);
      return false;
    } catch (error) {
      logger.error(`[OrgAccess] Error checking organization data access:`, error);
      return false;
    }
  }

  /**
   * Check if a user is a member of a specific team
   * @param userId - User ID to check
   * @param teamId - Team ID to verify membership
   * @returns true if user is a member of the team
   */
  private async checkTeamAccess(userId: string, teamId: string): Promise<boolean> {
    try {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        }
      });

      return !!membership;
    } catch (error) {
      logger.error(`[TeamAccess] Error checking team membership for user ${userId} in team ${teamId}:`, error);
      return false;
    }
  }

  /**
   * Check if a user has access within an organization
   * Supports role-based access within the organization
   *
   * @param userId - User ID to check
   * @param orgId - Organization ID
   * @param requesterRole - Role of the user requesting access (for hierarchy checks)
   * @returns true if user has organization access
   */
  private async checkOrgAccess(
    userId: string,
    orgId: string,
    requesterRole?: string
  ): Promise<boolean> {
    try {
      // TODO: When Organization model is implemented, replace this with:
      // const membership = await prisma.organizationMember.findUnique({
      //   where: {
      //     organizationId_userId: {
      //       organizationId: orgId,
      //       userId
      //     }
      //   }
      // });

      // For now, fallback to checking if both users are in the same team
      // This provides basic cross-user access until Organization model is added
      const userTeams = await this.getUserTeams(userId);
      const targetUserTeams = await this.getUserTeams(userId);

      // Check if they share any teams
      const sharedTeams = userTeams.filter(ut =>
        targetUserTeams.some(tut => tut.teamId === ut.teamId)
      );

      if (sharedTeams.length > 0) {
        logger.info(`[OrgAccess] Users share ${sharedTeams.length} team(s), granting organization-level access`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`[OrgAccess] Error checking org membership for user ${userId} in org ${orgId}:`, error);
      return false;
    }
  }

  /**
   * Get all teams a user belongs to with their roles
   * @param userId - User ID
   * @returns Array of team memberships with teamId, teamName, and role
   */
  private async getUserTeams(userId: string): Promise<Array<{
    teamId: string;
    teamName: string;
    role: string;
  }>> {
    try {
      const memberships = await prisma.teamMember.findMany({
        where: { userId },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      });

      return memberships
        .filter(m => m.team.isActive)
        .map(m => ({
          teamId: m.team.id,
          teamName: m.team.name,
          role: m.role
        }));
    } catch (error) {
      logger.error(`[TeamAccess] Error fetching teams for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get all organizations a user belongs to with their roles
   *
   * NOTE: This is a placeholder implementation. When Organization model is added:
   * 1. Create Organization model in schema.prisma with fields:
   *    - id, name, description, ownerId, isActive, etc.
   * 2. Create OrganizationMember model with:
   *    - id, organizationId, userId, role (OWNER, ADMIN, MEMBER), joinedAt, etc.
   * 3. Add organizationId field to data models (optional, for direct org ownership)
   * 4. Update this method to query OrganizationMember table
   *
   * @param userId - User ID
   * @returns Array of organization memberships with orgId, orgName, and role
   */
  private async getUserOrganizations(userId: string): Promise<Array<{
    orgId: string;
    orgName: string;
    role: string;
  }>> {
    try {
      // TODO: When Organization model is implemented, replace with:
      // const memberships = await prisma.organizationMember.findMany({
      //   where: { userId },
      //   include: {
      //     organization: {
      //       select: {
      //         id: true,
      //         name: true,
      //         isActive: true
      //       }
      //     }
      //   }
      // });
      //
      // return memberships
      //   .filter(m => m.organization.isActive)
      //   .map(m => ({
      //     orgId: m.organization.id,
      //     orgName: m.organization.name,
      //     role: m.role
      //   }));

      // Temporary implementation: Use teams as organization-level access
      // This allows the code to work while providing a clear upgrade path
      const teams = await this.getUserTeams(userId);

      // Map teams to organization structure (temporary)
      return teams.map(team => ({
        orgId: `team-${team.teamId}`, // Prefix to distinguish from real org IDs later
        orgName: `${team.teamName} (Team)`,
        role: team.role
      }));
    } catch (error) {
      logger.error(`[OrgAccess] Error fetching organizations for user ${userId}:`, error);
      return [];
    }
  }
}

export const permissionService = new PermissionService();
