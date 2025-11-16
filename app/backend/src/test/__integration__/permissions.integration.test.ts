/**
 * Permissions Integration Tests
 * Tests role-based access control with real database
 */

import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories, resetSequence } from '../factories';
import {
  assignRoleToUser,
  assignPermissionToRole,
  userHasPermission,
  getUserWithPermissions,
} from '../db-helpers';
import { PermissionAction } from '@prisma/client';

describe('Permissions Integration Tests', () => {
  const prisma = getTestPrismaClient();

  afterEach(async () => {
    await cleanupAfterTest();
    resetSequence();
  });

  describe('Permission Creation', () => {
    it('should create permission with all actions', async () => {
      const actions: PermissionAction[] = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'];

      for (const action of actions) {
        const permission = await factories.permission.create(prisma, {
          resource: 'tickets',
          action,
        });

        expect(permission.id).toBeDefined();
        expect(permission.resource).toBe('tickets');
        expect(permission.action).toBe(action);
        expect(permission.name).toBe(`tickets.${action.toLowerCase()}`);
      }
    });

    it('should create CRUD permission set', async () => {
      const permissions = await factories.permission.createCRUD(prisma, 'invoices');

      expect(permissions).toHaveLength(4);
      const actions = permissions.map(p => p.action);
      expect(actions).toContain('CREATE');
      expect(actions).toContain('READ');
      expect(actions).toContain('UPDATE');
      expect(actions).toContain('DELETE');
    });

    it('should enforce unique resource-action combination', async () => {
      await factories.permission.create(prisma, {
        resource: 'users',
        action: 'READ',
      });

      await expect(
        factories.permission.create(prisma, {
          resource: 'users',
          action: 'READ',
        })
      ).rejects.toThrow();
    });

    it('should create permissions for different resources', async () => {
      const ticketPerm = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });

      const userPerm = await factories.permission.create(prisma, {
        resource: 'users',
        action: 'READ',
      });

      expect(ticketPerm.resource).toBe('tickets');
      expect(userPerm.resource).toBe('users');
      expect(ticketPerm.id).not.toBe(userPerm.id);
    });
  });

  describe('Role Creation', () => {
    it('should create admin role', async () => {
      const role = await factories.role.createAdmin(prisma);

      expect(role.name).toBe('ADMIN');
      expect(role.displayName).toBe('Administrator');
      expect(role.isSystem).toBe(true);
    });

    it('should create agent role', async () => {
      const role = await factories.role.createAgent(prisma);

      expect(role.name).toBe('AGENT');
      expect(role.displayName).toBe('Support Agent');
      expect(role.isSystem).toBe(true);
    });

    it('should create manager role', async () => {
      const role = await factories.role.createManager(prisma);

      expect(role.name).toBe('MANAGER');
      expect(role.displayName).toBe('Manager');
    });

    it('should enforce unique role names', async () => {
      await factories.role.createAdmin(prisma);

      await expect(
        factories.role.createAdmin(prisma)
      ).rejects.toThrow();
    });

    it('should create custom role', async () => {
      const role = await factories.role.create(prisma, {
        name: 'CUSTOMER',
        displayName: 'Customer',
        description: 'External customer',
        isSystem: false,
      });

      expect(role.name).toBe('CUSTOMER');
      expect(role.isSystem).toBe(false);
    });
  });

  describe('Role-Permission Assignment', () => {
    it('should assign permission to role', async () => {
      const role = await factories.role.createAgent(prisma);
      const permission = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });

      const assignment = await assignPermissionToRole(prisma, role.id, permission.id);

      expect(assignment.roleId).toBe(role.id);
      expect(assignment.permissionId).toBe(permission.id);
    });

    it('should assign multiple permissions to role', async () => {
      const role = await factories.role.createAgent(prisma);
      const permissions = await factories.permission.createCRUD(prisma, 'tickets');

      for (const permission of permissions) {
        await assignPermissionToRole(prisma, role.id, permission.id);
      }

      const roleWithPerms = await prisma.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      expect(roleWithPerms?.rolePermissions).toHaveLength(4);
    });

    it('should prevent duplicate permission assignments', async () => {
      const role = await factories.role.createAgent(prisma);
      const permission = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });

      await assignPermissionToRole(prisma, role.id, permission.id);

      await expect(
        assignPermissionToRole(prisma, role.id, permission.id)
      ).rejects.toThrow();
    });

    it('should cascade delete permission assignments when role is deleted', async () => {
      const role = await factories.role.createAgent(prisma);
      const permission = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });

      const assignment = await assignPermissionToRole(prisma, role.id, permission.id);

      await prisma.role.delete({ where: { id: role.id } });

      const foundAssignment = await prisma.rolePermission.findUnique({
        where: { id: assignment.id },
      });

      expect(foundAssignment).toBeNull();
    });
  });

  describe('User-Role Assignment', () => {
    it('should assign role to user', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);

      const assignment = await assignRoleToUser(prisma, user.id, role.id);

      expect(assignment.userId).toBe(user.id);
      expect(assignment.roleId).toBe(role.id);
      expect(assignment.assignedAt).toBeInstanceOf(Date);
    });

    it('should assign multiple roles to user', async () => {
      const user = await factories.user.create(prisma);
      const agentRole = await factories.role.createAgent(prisma);
      const managerRole = await factories.role.createManager(prisma);

      await assignRoleToUser(prisma, user.id, agentRole.id);
      await assignRoleToUser(prisma, user.id, managerRole.id);

      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });

      expect(userWithRoles?.userRoles).toHaveLength(2);
    });

    it('should track who assigned the role', async () => {
      const admin = await factories.user.create(prisma);
      const agent = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);

      const assignment = await assignRoleToUser(prisma, agent.id, role.id, admin.id);

      expect(assignment.assignedBy).toBe(admin.id);
    });

    it('should prevent duplicate role assignments', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);

      await assignRoleToUser(prisma, user.id, role.id);

      await expect(
        assignRoleToUser(prisma, user.id, role.id)
      ).rejects.toThrow();
    });

    it('should cascade delete user roles when user is deleted', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);

      await assignRoleToUser(prisma, user.id, role.id);

      await prisma.user.delete({ where: { id: user.id } });

      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
      });

      expect(userRoles).toHaveLength(0);
    });
  });

  describe('Permission Checking', () => {
    it('should verify user has permission through role', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);
      const permission = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });

      await assignPermissionToRole(prisma, role.id, permission.id);
      await assignRoleToUser(prisma, user.id, role.id);

      const hasPermission = await userHasPermission(prisma, user.id, 'tickets', 'READ');

      expect(hasPermission).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);

      await assignRoleToUser(prisma, user.id, role.id);

      const hasPermission = await userHasPermission(prisma, user.id, 'tickets', 'DELETE');

      expect(hasPermission).toBe(false);
    });

    it('should verify MANAGE permission grants all actions', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAdmin(prisma);
      const permission = await factories.permission.create(prisma, {
        resource: 'users',
        action: 'MANAGE',
      });

      await assignPermissionToRole(prisma, role.id, permission.id);
      await assignRoleToUser(prisma, user.id, role.id);

      // MANAGE should grant all specific actions
      const canCreate = await userHasPermission(prisma, user.id, 'users', 'CREATE');
      const canRead = await userHasPermission(prisma, user.id, 'users', 'READ');
      const canUpdate = await userHasPermission(prisma, user.id, 'users', 'UPDATE');
      const canDelete = await userHasPermission(prisma, user.id, 'users', 'DELETE');
      const canManage = await userHasPermission(prisma, user.id, 'users', 'MANAGE');

      expect(canCreate).toBe(true);
      expect(canRead).toBe(true);
      expect(canUpdate).toBe(true);
      expect(canDelete).toBe(true);
      expect(canManage).toBe(true);
    });

    it('should aggregate permissions from multiple roles', async () => {
      const user = await factories.user.create(prisma);
      const agentRole = await factories.role.createAgent(prisma);
      const managerRole = await factories.role.createManager(prisma);

      const readPerm = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });

      const createPerm = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'CREATE',
      });

      await assignPermissionToRole(prisma, agentRole.id, readPerm.id);
      await assignPermissionToRole(prisma, managerRole.id, createPerm.id);

      await assignRoleToUser(prisma, user.id, agentRole.id);
      await assignRoleToUser(prisma, user.id, managerRole.id);

      const canRead = await userHasPermission(prisma, user.id, 'tickets', 'READ');
      const canCreate = await userHasPermission(prisma, user.id, 'tickets', 'CREATE');

      expect(canRead).toBe(true);
      expect(canCreate).toBe(true);
    });
  });

  describe('Complex Permission Scenarios', () => {
    it('should create complete RBAC setup', async () => {
      // Create users
      const admin = await factories.user.create(prisma, { email: 'admin@example.com' });
      const agent = await factories.user.create(prisma, { email: 'agent@example.com' });
      const customer = await factories.user.create(prisma, { email: 'customer@example.com' });

      // Create roles
      const adminRole = await factories.role.createAdmin(prisma);
      const agentRole = await factories.role.createAgent(prisma);
      const customerRole = await factories.role.create(prisma, {
        name: 'CUSTOMER',
        displayName: 'Customer',
      });

      // Create permissions
      const ticketPerms = await factories.permission.createCRUD(prisma, 'tickets');
      const userManagePerm = await factories.permission.create(prisma, {
        resource: 'users',
        action: 'MANAGE',
      });

      // Assign permissions to roles
      // Admin gets all permissions
      for (const perm of ticketPerms) {
        await assignPermissionToRole(prisma, adminRole.id, perm.id);
      }
      await assignPermissionToRole(prisma, adminRole.id, userManagePerm.id);

      // Agent gets read and create tickets
      const readTicket = ticketPerms.find(p => p.action === 'READ')!;
      const createTicket = ticketPerms.find(p => p.action === 'CREATE')!;
      await assignPermissionToRole(prisma, agentRole.id, readTicket.id);
      await assignPermissionToRole(prisma, agentRole.id, createTicket.id);

      // Customer gets only create tickets
      await assignPermissionToRole(prisma, customerRole.id, createTicket.id);

      // Assign roles to users
      await assignRoleToUser(prisma, admin.id, adminRole.id);
      await assignRoleToUser(prisma, agent.id, agentRole.id);
      await assignRoleToUser(prisma, customer.id, customerRole.id);

      // Verify permissions
      expect(await userHasPermission(prisma, admin.id, 'tickets', 'DELETE')).toBe(true);
      expect(await userHasPermission(prisma, admin.id, 'users', 'MANAGE')).toBe(true);

      expect(await userHasPermission(prisma, agent.id, 'tickets', 'READ')).toBe(true);
      expect(await userHasPermission(prisma, agent.id, 'tickets', 'CREATE')).toBe(true);
      expect(await userHasPermission(prisma, agent.id, 'tickets', 'DELETE')).toBe(false);

      expect(await userHasPermission(prisma, customer.id, 'tickets', 'CREATE')).toBe(true);
      expect(await userHasPermission(prisma, customer.id, 'tickets', 'READ')).toBe(false);
    });

    it('should handle permission inheritance', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAdmin(prisma);

      // Create a hierarchy of permissions
      const resources = ['tickets', 'invoices', 'users', 'customers'];
      for (const resource of resources) {
        const perm = await factories.permission.create(prisma, {
          resource,
          action: 'MANAGE',
        });
        await assignPermissionToRole(prisma, role.id, perm.id);
      }

      await assignRoleToUser(prisma, user.id, role.id);

      // User should have MANAGE on all resources
      for (const resource of resources) {
        const canManage = await userHasPermission(prisma, user.id, resource, 'MANAGE');
        expect(canManage).toBe(true);
      }
    });

    it('should retrieve user with all permissions', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);
      const permissions = await factories.permission.createCRUD(prisma, 'tickets');

      for (const perm of permissions) {
        await assignPermissionToRole(prisma, role.id, perm.id);
      }

      await assignRoleToUser(prisma, user.id, role.id);

      const userWithPerms = await getUserWithPermissions(prisma, user.id);

      expect(userWithPerms?.userRoles).toHaveLength(1);
      expect(userWithPerms?.userRoles[0].role.rolePermissions).toHaveLength(4);
    });
  });

  describe('Permission Edge Cases', () => {
    it('should handle user with no roles', async () => {
      const user = await factories.user.create(prisma);

      const hasPermission = await userHasPermission(prisma, user.id, 'tickets', 'READ');

      expect(hasPermission).toBe(false);
    });

    it('should handle role with no permissions', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);

      await assignRoleToUser(prisma, user.id, role.id);

      const hasPermission = await userHasPermission(prisma, user.id, 'tickets', 'READ');

      expect(hasPermission).toBe(false);
    });

    it('should handle non-existent user', async () => {
      const hasPermission = await userHasPermission(
        prisma,
        'non-existent-user-id',
        'tickets',
        'READ'
      );

      expect(hasPermission).toBe(false);
    });
  });
});
