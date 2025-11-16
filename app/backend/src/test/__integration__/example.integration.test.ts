/**
 * Example Integration Test
 * Demonstrates all integration testing features and best practices
 */

import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories, resetSequence } from '../factories';
import {
  createTestUser,
  createTestTicket,
  createTestQuota,
  createTestEnvironment,
  assignRoleToUser,
  assignPermissionToRole,
  userHasPermission,
  getUserWithPermissions,
} from '../db-helpers';

describe('Example Integration Test Suite', () => {
  const prisma = getTestPrismaClient();

  // Clean up after each test to ensure isolation
  afterEach(async () => {
    await cleanupAfterTest();
    resetSequence();
  });

  describe('Basic CRUD Operations', () => {
    it('should demonstrate user creation with factory', async () => {
      // Using factory with defaults
      const user1 = await factories.user.create(prisma);
      expect(user1.email).toContain('@example.com');
      expect(user1.currency).toBe('USD');

      // Using factory with overrides
      const user2 = await factories.user.create(prisma, {
        email: 'custom@example.com',
        name: 'Custom User',
        currency: 'EUR',
      });
      expect(user2.email).toBe('custom@example.com');
      expect(user2.currency).toBe('EUR');

      // Creating multiple users
      const users = await factories.user.createMany(prisma, 3);
      expect(users).toHaveLength(3);
    });

    it('should demonstrate user retrieval patterns', async () => {
      const user = await factories.user.create(prisma, {
        email: 'find@example.com',
        name: 'Findable User',
      });

      // Find by ID
      const foundById = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(foundById?.name).toBe('Findable User');

      // Find by email
      const foundByEmail = await prisma.user.findUnique({
        where: { email: 'find@example.com' },
      });
      expect(foundByEmail?.id).toBe(user.id);

      // Find many with filters
      await factories.user.create(prisma, { currency: 'USD' });
      await factories.user.create(prisma, { currency: 'EUR' });

      const usdUsers = await prisma.user.findMany({
        where: { currency: 'USD' },
      });
      expect(usdUsers.length).toBeGreaterThanOrEqual(1);
    });

    it('should demonstrate user update operations', async () => {
      const user = await factories.user.create(prisma);

      // Update single field
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'Updated Name' },
      });
      expect(updated.name).toBe('Updated Name');

      // Update multiple fields
      const multiUpdated = await prisma.user.update({
        where: { id: user.id },
        data: {
          timezone: 'America/New_York',
          currency: 'EUR',
        },
      });
      expect(multiUpdated.timezone).toBe('America/New_York');
      expect(multiUpdated.currency).toBe('EUR');
    });

    it('should demonstrate user deletion with cascade', async () => {
      const user = await factories.user.create(prisma);
      const platform = await factories.platform.create(prisma, user.id);
      const earning = await factories.earning.create(prisma, user.id);

      // Delete user (should cascade)
      await prisma.user.delete({ where: { id: user.id } });

      // Verify cascade deletion
      const foundPlatform = await prisma.platform.findUnique({
        where: { id: platform.id },
      });
      const foundEarning = await prisma.earning.findUnique({
        where: { id: earning.id },
      });

      expect(foundPlatform).toBeNull();
      expect(foundEarning).toBeNull();
    });
  });

  describe('Relations and Joins', () => {
    it('should demonstrate one-to-many relations', async () => {
      const user = await factories.user.create(prisma);

      // Create related entities
      await factories.platform.create(prisma, user.id, { name: 'Platform 1' });
      await factories.platform.create(prisma, user.id, { name: 'Platform 2' });
      await factories.platform.create(prisma, user.id, { name: 'Platform 3' });

      // Fetch with relations
      const userWithPlatforms = await prisma.user.findUnique({
        where: { id: user.id },
        include: { platforms: true },
      });

      expect(userWithPlatforms?.platforms).toHaveLength(3);
      expect(userWithPlatforms?.platforms[0].name).toBeDefined();
    });

    it('should demonstrate nested relations', async () => {
      const user = await factories.user.create(prisma);
      const platform = await factories.platform.create(prisma, user.id);
      const earning = await factories.earning.create(prisma, user.id, {
        platformId: platform.id,
        amount: 500,
      });

      // Fetch with nested includes
      const userWithData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          platforms: true,
          earnings: {
            include: {
              platform: true,
            },
          },
        },
      });

      expect(userWithData?.earnings[0].platform?.id).toBe(platform.id);
      expect(userWithData?.earnings[0].amount).toBe(500);
    });

    it('should demonstrate many-to-many relations (RBAC)', async () => {
      const user = await factories.user.create(prisma);
      const role1 = await factories.role.createAgent(prisma);
      const role2 = await factories.role.createManager(prisma);

      // Assign multiple roles
      await assignRoleToUser(prisma, user.id, role1.id);
      await assignRoleToUser(prisma, user.id, role2.id);

      // Fetch with many-to-many
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      expect(userWithRoles?.userRoles).toHaveLength(2);
      const roleNames = userWithRoles?.userRoles.map(ur => ur.role.name);
      expect(roleNames).toContain('AGENT');
      expect(roleNames).toContain('MANAGER');
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique constraints', async () => {
      await factories.user.create(prisma, {
        email: 'unique@example.com',
      });

      await expect(
        factories.user.create(prisma, {
          email: 'unique@example.com',
        })
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraints', async () => {
      await expect(
        prisma.ticket.create({
          data: {
            userId: 'non-existent-user-id',
            subject: 'Test',
            description: 'Test',
            status: 'OPEN',
            priority: 'MEDIUM',
          },
        })
      ).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const user = await factories.user.create(prisma);

      // This would fail at TypeScript level, but demonstrates validation
      // The test itself shows proper enum usage
      const ticket = await factories.ticket.create(prisma, user.id, {
        status: 'OPEN', // Valid enum value
        priority: 'HIGH', // Valid enum value
      });

      expect(ticket.status).toBe('OPEN');
      expect(ticket.priority).toBe('HIGH');
    });
  });

  describe('Transactions', () => {
    it('should commit successful transactions', async () => {
      await prisma.$transaction(async (tx) => {
        const user = await factories.user.create(tx);
        await factories.platform.create(tx, user.id);
        await factories.earning.create(tx, user.id, { amount: 100 });
      });

      const users = await prisma.user.findMany({
        include: { platforms: true, earnings: true },
      });

      const userWithData = users.find(u => u.platforms.length > 0);
      expect(userWithData).toBeDefined();
      expect(userWithData?.platforms).toHaveLength(1);
      expect(userWithData?.earnings).toHaveLength(1);
    });

    it('should rollback failed transactions', async () => {
      const initialUserCount = await prisma.user.count();
      const initialPlatformCount = await prisma.platform.count();

      try {
        await prisma.$transaction(async (tx) => {
          const user = await factories.user.create(tx);
          await factories.platform.create(tx, user.id);
          throw new Error('Forced rollback');
        });
      } catch (error) {
        // Expected error
      }

      const finalUserCount = await prisma.user.count();
      const finalPlatformCount = await prisma.platform.count();

      expect(finalUserCount).toBe(initialUserCount);
      expect(finalPlatformCount).toBe(initialPlatformCount);
    });
  });

  describe('Complex Business Logic', () => {
    it('should demonstrate ticket lifecycle', async () => {
      const user = await factories.user.create(prisma);
      const agent = await factories.user.create(prisma);

      // Step 1: Create ticket
      let ticket = await factories.ticket.create(prisma, user.id, {
        subject: 'Complex Issue',
        priority: 'MEDIUM',
      });
      expect(ticket.status).toBe('OPEN');
      expect(ticket.assignedTo).toBeNull();

      // Step 2: Assign to agent
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          assignedTo: agent.id,
          status: 'IN_PROGRESS',
        },
      });
      expect(ticket.assignedTo).toBe(agent.id);

      // Step 3: Escalate priority
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { priority: 'HIGH' },
      });
      expect(ticket.priority).toBe('HIGH');

      // Step 4: Resolve
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      expect(ticket.status).toBe('RESOLVED');
      expect(ticket.resolvedAt).toBeDefined();

      // Step 5: Close
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'CLOSED' },
      });
      expect(ticket.status).toBe('CLOSED');
    });

    it('should demonstrate quota tier upgrades', async () => {
      const user = await factories.user.create(prisma);

      // Start with FREE tier
      let quota = await factories.quota.create(prisma, user.id);
      expect(quota.tier).toBe('FREE');
      expect(quota.requestsPerHour).toBe(100);

      // Upgrade to PRO
      quota = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: {
          tier: 'PRO',
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          requestsPerMonth: 100000,
        },
      });
      expect(quota.tier).toBe('PRO');

      // Upgrade to ENTERPRISE
      quota = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: {
          tier: 'ENTERPRISE',
          requestsPerHour: 10000,
          requestsPerDay: 100000,
          requestsPerMonth: 1000000,
        },
      });
      expect(quota.tier).toBe('ENTERPRISE');
    });

    it('should demonstrate RBAC permission checking', async () => {
      // Create users
      const adminUser = await factories.user.create(prisma);
      const agentUser = await factories.user.create(prisma);
      const regularUser = await factories.user.create(prisma);

      // Create roles
      const adminRole = await factories.role.createAdmin(prisma);
      const agentRole = await factories.role.createAgent(prisma);

      // Create permissions
      const manageUsers = await factories.permission.create(prisma, {
        resource: 'users',
        action: 'MANAGE',
      });
      const readTickets = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });
      const createTickets = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'CREATE',
      });

      // Assign permissions to roles
      await assignPermissionToRole(prisma, adminRole.id, manageUsers.id);
      await assignPermissionToRole(prisma, adminRole.id, readTickets.id);
      await assignPermissionToRole(prisma, agentRole.id, readTickets.id);
      await assignPermissionToRole(prisma, agentRole.id, createTickets.id);

      // Assign roles to users
      await assignRoleToUser(prisma, adminUser.id, adminRole.id);
      await assignRoleToUser(prisma, agentUser.id, agentRole.id);

      // Check permissions
      expect(await userHasPermission(prisma, adminUser.id, 'users', 'MANAGE')).toBe(true);
      expect(await userHasPermission(prisma, adminUser.id, 'tickets', 'READ')).toBe(true);
      expect(await userHasPermission(prisma, agentUser.id, 'tickets', 'READ')).toBe(true);
      expect(await userHasPermission(prisma, agentUser.id, 'tickets', 'CREATE')).toBe(true);
      expect(await userHasPermission(prisma, agentUser.id, 'users', 'MANAGE')).toBe(false);
      expect(await userHasPermission(prisma, regularUser.id, 'tickets', 'READ')).toBe(false);
    });
  });

  describe('Aggregations and Statistics', () => {
    it('should calculate user statistics', async () => {
      const user = await factories.user.create(prisma);

      await factories.earning.create(prisma, user.id, { amount: 100 });
      await factories.earning.create(prisma, user.id, { amount: 200 });
      await factories.earning.create(prisma, user.id, { amount: 300 });

      const earnings = await prisma.earning.findMany({
        where: { userId: user.id },
      });

      const totalEarnings = earnings.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      );

      expect(totalEarnings).toBe(600);
      expect(earnings).toHaveLength(3);
    });

    it('should count and group data', async () => {
      const user = await factories.user.create(prisma);

      await factories.ticket.create(prisma, user.id, { status: 'OPEN' });
      await factories.ticket.create(prisma, user.id, { status: 'OPEN' });
      await factories.ticket.create(prisma, user.id, { status: 'IN_PROGRESS' });
      await factories.ticket.create(prisma, user.id, { status: 'CLOSED' });

      const openCount = await prisma.ticket.count({
        where: { userId: user.id, status: 'OPEN' },
      });

      const totalCount = await prisma.ticket.count({
        where: { userId: user.id },
      });

      expect(openCount).toBe(2);
      expect(totalCount).toBe(4);
    });

    it('should use aggregate functions', async () => {
      const users = await factories.user.createMany(prisma, 3);

      await factories.quota.create(prisma, users[0].id, { storageGB: 1 });
      await factories.quota.create(prisma, users[1].id, { storageGB: 10 });
      await factories.quota.create(prisma, users[2].id, { storageGB: 100 });

      const aggregate = await prisma.apiQuota.aggregate({
        _sum: { storageGB: true },
        _avg: { requestsPerHour: true },
        _count: true,
      });

      expect(Number(aggregate._sum.storageGB)).toBe(111);
      expect(aggregate._count).toBe(3);
    });
  });

  describe('Helper Functions', () => {
    it('should use createTestEnvironment helper', async () => {
      const env = await createTestEnvironment(prisma);

      expect(env.user).toBeDefined();
      expect(env.adminRole).toBeDefined();
      expect(env.agentRole).toBeDefined();
      expect(env.permissions.readTickets).toBeDefined();
      expect(env.permissions.createTickets).toBeDefined();
      expect(env.permissions.manageUsers).toBeDefined();
      expect(env.customer).toBeDefined();
    });

    it('should use individual helper functions', async () => {
      const user = await createTestUser(prisma, {
        email: 'helper@example.com',
      });

      const ticket = await createTestTicket(prisma, {
        userId: user.id,
        subject: 'Helper Ticket',
      });

      const quota = await createTestQuota(prisma, {
        userId: user.id,
        tier: 'PRO',
      });

      expect(user.email).toBe('helper@example.com');
      expect(ticket.subject).toBe('Helper Ticket');
      expect(quota.tier).toBe('PRO');
    });

    it('should use getUserWithPermissions helper', async () => {
      const user = await factories.user.create(prisma);
      const role = await factories.role.createAgent(prisma);
      const permission = await factories.permission.create(prisma, {
        resource: 'tickets',
        action: 'READ',
      });

      await assignPermissionToRole(prisma, role.id, permission.id);
      await assignRoleToUser(prisma, user.id, role.id);

      const userWithPerms = await getUserWithPermissions(prisma, user.id);

      expect(userWithPerms?.userRoles).toHaveLength(1);
      expect(userWithPerms?.userRoles[0].role.rolePermissions).toHaveLength(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent records', async () => {
      const user = await prisma.user.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(user).toBeNull();
    });

    it('should handle deletion of non-existent records', async () => {
      await expect(
        prisma.user.delete({ where: { id: 'non-existent-id' } })
      ).rejects.toThrow();
    });

    it('should handle concurrent updates', async () => {
      const user = await factories.user.create(prisma);

      // Simulate concurrent updates
      const update1 = prisma.user.update({
        where: { id: user.id },
        data: { name: 'Update 1' },
      });

      const update2 = prisma.user.update({
        where: { id: user.id },
        data: { name: 'Update 2' },
      });

      await Promise.all([update1, update2]);

      const finalUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // One of the updates should have succeeded
      expect(['Update 1', 'Update 2']).toContain(finalUser?.name);
    });
  });
});
