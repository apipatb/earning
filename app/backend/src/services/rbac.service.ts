import { PrismaClient, RoleName, PermissionAction } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRoleInput {
  name: RoleName;
  displayName: string;
  description?: string;
  permissions?: string[]; // Array of permission IDs
}

export interface CreatePermissionInput {
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: PermissionAction;
}

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

/**
 * RBAC Service
 * Manages Role-Based Access Control for the application
 */
export class RBACService {
  /**
   * Get all roles with their permissions
   */
  async getRoles() {
    return await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single role by ID
   */
  async getRoleById(roleId: string) {
    return await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
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
  }

  /**
   * Get a role by name
   */
  async getRoleByName(name: RoleName) {
    return await prisma.role.findUnique({
      where: { name },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleInput) {
    const { permissions, ...roleData } = data;

    const role = await prisma.role.create({
      data: roleData,
    });

    // Assign permissions if provided
    if (permissions && permissions.length > 0) {
      await this.assignPermissionsToRole(role.id, permissions);
    }

    return await this.getRoleById(role.id);
  }

  /**
   * Update a role
   */
  async updateRole(roleId: string, data: Partial<CreateRoleInput>) {
    const { permissions, ...roleData } = data;

    // Check if role is a system role
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (role?.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    await prisma.role.update({
      where: { id: roleId },
      data: roleData,
    });

    // Update permissions if provided
    if (permissions !== undefined) {
      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      // Add new permissions
      if (permissions.length > 0) {
        await this.assignPermissionsToRole(roleId, permissions);
      }
    }

    return await this.getRoleById(roleId);
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string) {
    // Check if role is a system role
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (role?.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Check if role has users
    const userCount = await prisma.userRole.count({
      where: { roleId },
    });

    if (userCount > 0) {
      throw new Error(
        `Cannot delete role. It is assigned to ${userCount} user(s). Remove all user assignments first.`
      );
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return { success: true };
  }

  /**
   * Get all permissions
   */
  async getPermissions() {
    return await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Get permissions grouped by resource
   */
  async getPermissionsGrouped() {
    const permissions = await this.getPermissions();

    const grouped: Record<string, typeof permissions> = {};

    permissions.forEach((permission) => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });

    return grouped;
  }

  /**
   * Create a new permission
   */
  async createPermission(data: CreatePermissionInput) {
    return await prisma.permission.create({
      data,
    });
  }

  /**
   * Update a permission
   */
  async updatePermission(permissionId: string, data: Partial<CreatePermissionInput>) {
    return await prisma.permission.update({
      where: { id: permissionId },
      data,
    });
  }

  /**
   * Delete a permission
   */
  async deletePermission(permissionId: string) {
    await prisma.permission.delete({
      where: { id: permissionId },
    });

    return { success: true };
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    const rolePermissions = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));

    await prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });

    return { success: true };
  }

  /**
   * Remove permissions from a role
   */
  async removePermissionsFromRole(roleId: string, permissionIds: string[]) {
    await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: {
          in: permissionIds,
        },
      },
    });

    return { success: true };
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string) {
    return await prisma.userRole.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string) {
    const userRoles = await this.getUserRoles(userId);

    const permissions = new Set<string>();

    userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rolePermission) => {
        permissions.add(rolePermission.permission.name);
      });
    });

    return Array.from(permissions);
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionName);
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, roleName: RoleName): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some((userRole) => userRole.role.name === roleName);
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId: string, roleNames: RoleName[]): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some((userRole) => roleNames.includes(userRole.role.name));
  }

  /**
   * Check if user has all of the specified roles
   */
  async hasAllRoles(userId: string, roleNames: RoleName[]): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    const userRoleNames = userRoles.map((ur) => ur.role.name);
    return roleNames.every((roleName) => userRoleNames.includes(roleName));
  }

  /**
   * Check if user has permission to access a resource with a specific action
   */
  async hasResourcePermission(
    userId: string,
    resource: string,
    action: PermissionAction
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);

    for (const userRole of userRoles) {
      const hasPermission = userRole.role.rolePermissions.some(
        (rp) => rp.permission.resource === resource && rp.permission.action === action
      );

      if (hasPermission) {
        return true;
      }

      // Check for MANAGE permission which grants all actions
      const hasManagePermission = userRole.role.rolePermissions.some(
        (rp) => rp.permission.resource === resource && rp.permission.action === 'MANAGE'
      );

      if (hasManagePermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(data: AssignRoleInput) {
    return await prisma.userRole.create({
      data,
      include: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Revoke role from user
   */
  async revokeRoleFromUser(userId: string, roleId: string) {
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });

    return { success: true };
  }

  /**
   * Bulk assign roles to users
   */
  async bulkAssignRoles(assignments: AssignRoleInput[]) {
    const results = await Promise.allSettled(
      assignments.map((assignment) => this.assignRoleToUser(assignment))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      successful,
      failed,
      total: assignments.length,
      results,
    };
  }

  /**
   * Get all users with a specific role
   */
  async getUsersByRole(roleId: string) {
    return await prisma.userRole.findMany({
      where: {
        roleId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        role: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  /**
   * Initialize default roles and permissions
   */
  async initializeDefaultRoles() {
    const resources = [
      'earnings',
      'platforms',
      'goals',
      'products',
      'sales',
      'inventory',
      'customers',
      'expenses',
      'invoices',
      'reports',
      'users',
      'roles',
      'settings',
      'webhooks',
      'integrations',
    ];

    const actions: PermissionAction[] = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'];

    // Create all permissions
    const permissions = [];
    for (const resource of resources) {
      for (const action of actions) {
        const permissionName = `${resource}.${action.toLowerCase()}`;
        const permission = await prisma.permission.upsert({
          where: {
            resource_action: {
              resource,
              action,
            },
          },
          update: {},
          create: {
            name: permissionName,
            displayName: `${action} ${resource}`,
            description: `Permission to ${action.toLowerCase()} ${resource}`,
            resource,
            action,
          },
        });
        permissions.push(permission);
      }
    }

    // Create ADMIN role with all permissions
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        displayName: 'Administrator',
        description: 'Full system access with all permissions',
        isSystem: true,
      },
    });

    // Assign all permissions to ADMIN
    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId: adminRole.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });

    // Create MANAGER role
    const managerRole = await prisma.role.upsert({
      where: { name: 'MANAGER' },
      update: {},
      create: {
        name: 'MANAGER',
        displayName: 'Manager',
        description: 'Can manage team members and view reports',
        isSystem: true,
      },
    });

    // Assign permissions to MANAGER
    const managerPermissions = permissions.filter(
      (p) =>
        (p.action === 'READ' && p.resource !== 'roles' && p.resource !== 'settings') ||
        (p.resource === 'users' && ['READ', 'UPDATE'].includes(p.action)) ||
        (p.resource === 'reports' && p.action === 'MANAGE') ||
        ['earnings', 'sales', 'customers', 'invoices'].includes(p.resource)
    );

    await prisma.rolePermission.deleteMany({ where: { roleId: managerRole.id } });
    await prisma.rolePermission.createMany({
      data: managerPermissions.map((p) => ({
        roleId: managerRole.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });

    // Create AGENT role
    const agentRole = await prisma.role.upsert({
      where: { name: 'AGENT' },
      update: {},
      create: {
        name: 'AGENT',
        displayName: 'Support Agent',
        description: 'Can handle customer support and basic operations',
        isSystem: true,
      },
    });

    // Assign permissions to AGENT
    const agentPermissions = permissions.filter(
      (p) =>
        (p.action === 'READ' &&
          ['customers', 'invoices', 'products', 'sales'].includes(p.resource)) ||
        (p.resource === 'customers' && ['CREATE', 'UPDATE'].includes(p.action)) ||
        (p.resource === 'invoices' && p.action === 'CREATE')
    );

    await prisma.rolePermission.deleteMany({ where: { roleId: agentRole.id } });
    await prisma.rolePermission.createMany({
      data: agentPermissions.map((p) => ({
        roleId: agentRole.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });

    // Create CUSTOMER role
    const customerRole = await prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: {
        name: 'CUSTOMER',
        displayName: 'Customer',
        description: 'Limited access to own data only',
        isSystem: true,
      },
    });

    // Assign permissions to CUSTOMER
    const customerPermissions = permissions.filter(
      (p) =>
        p.action === 'READ' &&
        ['invoices', 'products'].includes(p.resource)
    );

    await prisma.rolePermission.deleteMany({ where: { roleId: customerRole.id } });
    await prisma.rolePermission.createMany({
      data: customerPermissions.map((p) => ({
        roleId: customerRole.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });

    return {
      roles: [adminRole, managerRole, agentRole, customerRole],
      permissions,
    };
  }

  /**
   * Check resource ownership
   */
  async checkResourceOwnership(userId: string, resourceType: string, resourceId: string): Promise<boolean> {
    switch (resourceType) {
      case 'earning':
        const earning = await prisma.earning.findFirst({
          where: { id: resourceId, userId },
        });
        return !!earning;

      case 'platform':
        const platform = await prisma.platform.findFirst({
          where: { id: resourceId, userId },
        });
        return !!platform;

      case 'goal':
        const goal = await prisma.goal.findFirst({
          where: { id: resourceId, userId },
        });
        return !!goal;

      case 'product':
        const product = await prisma.product.findFirst({
          where: { id: resourceId, userId },
        });
        return !!product;

      case 'sale':
        const sale = await prisma.sale.findFirst({
          where: { id: resourceId, userId },
        });
        return !!sale;

      case 'customer':
        const customer = await prisma.customer.findFirst({
          where: { id: resourceId, userId },
        });
        return !!customer;

      case 'expense':
        const expense = await prisma.expense.findFirst({
          where: { id: resourceId, userId },
        });
        return !!expense;

      case 'invoice':
        const invoice = await prisma.invoice.findFirst({
          where: { id: resourceId, userId },
        });
        return !!invoice;

      default:
        return false;
    }
  }
}

export const rbacService = new RBACService();
