/**
 * Quota Integration Tests
 * Tests API quota operations with real database
 */

import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories, resetSequence } from '../factories';
import { QuotaTier } from '@prisma/client';

describe('Quota Integration Tests', () => {
  const prisma = getTestPrismaClient();

  afterEach(async () => {
    await cleanupAfterTest();
    resetSequence();
  });

  describe('Quota Creation', () => {
    it('should create default FREE quota', async () => {
      const user = await factories.user.create(prisma);

      const quota = await factories.quota.create(prisma, user.id);

      expect(quota.id).toBeDefined();
      expect(quota.userId).toBe(user.id);
      expect(quota.tier).toBe('FREE');
      expect(quota.requestsPerHour).toBe(100);
      expect(quota.requestsPerDay).toBe(1000);
      expect(quota.requestsPerMonth).toBe(10000);
      expect(quota.concurrentRequests).toBe(5);
    });

    it('should create PRO tier quota', async () => {
      const user = await factories.user.create(prisma);

      const quota = await factories.quota.createPro(prisma, user.id);

      expect(quota.tier).toBe('PRO');
      expect(quota.requestsPerHour).toBe(1000);
      expect(quota.requestsPerDay).toBe(10000);
      expect(quota.requestsPerMonth).toBe(100000);
      expect(quota.concurrentRequests).toBe(20);
    });

    it('should create ENTERPRISE tier quota', async () => {
      const user = await factories.user.create(prisma);

      const quota = await factories.quota.createEnterprise(prisma, user.id);

      expect(quota.tier).toBe('ENTERPRISE');
      expect(quota.requestsPerHour).toBe(10000);
      expect(quota.requestsPerDay).toBe(100000);
      expect(quota.requestsPerMonth).toBe(1000000);
      expect(quota.concurrentRequests).toBe(100);
    });

    it('should create quota with custom limits', async () => {
      const user = await factories.user.create(prisma);

      const quota = await factories.quota.create(prisma, user.id, {
        tier: 'PRO',
        requestsPerHour: 5000,
        requestsPerDay: 50000,
        requestsPerMonth: 500000,
        storageGB: 50,
      });

      expect(quota.requestsPerHour).toBe(5000);
      expect(quota.requestsPerDay).toBe(50000);
      expect(quota.requestsPerMonth).toBe(500000);
      expect(Number(quota.storageGB)).toBe(50);
    });

    it('should enforce unique userId constraint', async () => {
      const user = await factories.user.create(prisma);

      await factories.quota.create(prisma, user.id);

      await expect(
        factories.quota.create(prisma, user.id)
      ).rejects.toThrow();
    });
  });

  describe('Quota Retrieval', () => {
    it('should find quota by userId', async () => {
      const user = await factories.user.create(prisma);
      const created = await factories.quota.create(prisma, user.id);

      const found = await prisma.apiQuota.findUnique({
        where: { userId: user.id },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should include user relation', async () => {
      const user = await factories.user.create(prisma, {
        email: 'quota-test@example.com',
      });
      await factories.quota.create(prisma, user.id);

      const quota = await prisma.apiQuota.findUnique({
        where: { userId: user.id },
        include: { user: true },
      });

      expect(quota?.user.email).toBe('quota-test@example.com');
    });

    it('should find quotas by tier', async () => {
      const user1 = await factories.user.create(prisma);
      const user2 = await factories.user.create(prisma);
      const user3 = await factories.user.create(prisma);

      await factories.quota.create(prisma, user1.id, { tier: 'FREE' });
      await factories.quota.createPro(prisma, user2.id);
      await factories.quota.create(prisma, user3.id, { tier: 'FREE' });

      const freeQuotas = await prisma.apiQuota.findMany({
        where: { tier: 'FREE' },
      });

      expect(freeQuotas.length).toBeGreaterThanOrEqual(2);
      freeQuotas.forEach(quota => {
        expect(quota.tier).toBe('FREE');
      });
    });
  });

  describe('Quota Update (Tier Upgrades)', () => {
    it('should upgrade from FREE to PRO', async () => {
      const user = await factories.user.create(prisma);
      const quota = await factories.quota.create(prisma, user.id);

      const updated = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: {
          tier: 'PRO',
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          requestsPerMonth: 100000,
          storageGB: 10,
          concurrentRequests: 20,
        },
      });

      expect(updated.tier).toBe('PRO');
      expect(updated.requestsPerHour).toBe(1000);
      expect(updated.requestsPerDay).toBe(10000);
    });

    it('should upgrade from PRO to ENTERPRISE', async () => {
      const user = await factories.user.create(prisma);
      await factories.quota.createPro(prisma, user.id);

      const updated = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: {
          tier: 'ENTERPRISE',
          requestsPerHour: 10000,
          requestsPerDay: 100000,
          requestsPerMonth: 1000000,
          storageGB: 100,
          concurrentRequests: 100,
        },
      });

      expect(updated.tier).toBe('ENTERPRISE');
      expect(updated.requestsPerHour).toBe(10000);
    });

    it('should downgrade from PRO to FREE', async () => {
      const user = await factories.user.create(prisma);
      await factories.quota.createPro(prisma, user.id);

      const updated = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: {
          tier: 'FREE',
          requestsPerHour: 100,
          requestsPerDay: 1000,
          requestsPerMonth: 10000,
          storageGB: 1,
          concurrentRequests: 5,
        },
      });

      expect(updated.tier).toBe('FREE');
      expect(updated.requestsPerHour).toBe(100);
    });

    it('should update individual limit fields', async () => {
      const user = await factories.user.create(prisma);
      await factories.quota.create(prisma, user.id);

      const updated = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: { requestsPerHour: 500 },
      });

      expect(updated.requestsPerHour).toBe(500);
      // Other fields should remain unchanged
      expect(updated.requestsPerDay).toBe(1000);
      expect(updated.tier).toBe('FREE');
    });

    it('should update storage quota', async () => {
      const user = await factories.user.create(prisma);
      await factories.quota.create(prisma, user.id);

      const updated = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: { storageGB: 5 },
      });

      expect(Number(updated.storageGB)).toBe(5);
    });

    it('should update custom limits JSON', async () => {
      const user = await factories.user.create(prisma);
      await factories.quota.create(prisma, user.id);

      const customLimits = JSON.stringify({
        '/api/tickets': { perHour: 200 },
        '/api/users': { perHour: 50 },
      });

      const updated = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: { customLimits },
      });

      expect(updated.customLimits).toBe(customLimits);
      const parsed = JSON.parse(updated.customLimits!);
      expect(parsed['/api/tickets'].perHour).toBe(200);
    });
  });

  describe('Quota Deletion', () => {
    it('should delete quota', async () => {
      const user = await factories.user.create(prisma);
      await factories.quota.create(prisma, user.id);

      await prisma.apiQuota.delete({
        where: { userId: user.id },
      });

      const found = await prisma.apiQuota.findUnique({
        where: { userId: user.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete when user is deleted', async () => {
      const user = await factories.user.create(prisma);
      const quota = await factories.quota.create(prisma, user.id);

      await prisma.user.delete({
        where: { id: user.id },
      });

      const foundQuota = await prisma.apiQuota.findUnique({
        where: { userId: user.id },
      });

      expect(foundQuota).toBeNull();
    });
  });

  describe('Quota Usage Tracking', () => {
    it('should update resetAt timestamp', async () => {
      const user = await factories.user.create(prisma);
      const quota = await factories.quota.create(prisma, user.id);

      const newResetAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const updated = await prisma.apiQuota.update({
        where: { userId: user.id },
        data: { resetAt: newResetAt },
      });

      expect(updated.resetAt.getTime()).toBeCloseTo(newResetAt.getTime(), -3);
    });

    it('should check if quota is exceeded', async () => {
      const user = await factories.user.create(prisma);
      const quota = await factories.quota.create(prisma, user.id, {
        requestsPerHour: 100,
      });

      // This is a simple check - in real usage, you'd track actual usage
      const currentUsage = 150; // Simulated usage
      const isExceeded = currentUsage > quota.requestsPerHour;

      expect(isExceeded).toBe(true);
    });

    it('should verify quota limits for different tiers', async () => {
      const freeUser = await factories.user.create(prisma);
      const proUser = await factories.user.create(prisma);
      const enterpriseUser = await factories.user.create(prisma);

      const freeQuota = await factories.quota.create(prisma, freeUser.id);
      const proQuota = await factories.quota.createPro(prisma, proUser.id);
      const enterpriseQuota = await factories.quota.createEnterprise(prisma, enterpriseUser.id);

      expect(proQuota.requestsPerHour).toBeGreaterThan(freeQuota.requestsPerHour);
      expect(enterpriseQuota.requestsPerHour).toBeGreaterThan(proQuota.requestsPerHour);

      expect(proQuota.storageGB).toBeGreaterThan(freeQuota.storageGB);
      expect(enterpriseQuota.storageGB).toBeGreaterThan(proQuota.storageGB);
    });
  });

  describe('Quota Statistics', () => {
    it('should count quotas by tier', async () => {
      const users = await factories.user.createMany(prisma, 5);

      await factories.quota.create(prisma, users[0].id, { tier: 'FREE' });
      await factories.quota.createPro(prisma, users[1].id);
      await factories.quota.create(prisma, users[2].id, { tier: 'FREE' });
      await factories.quota.createPro(prisma, users[3].id);
      await factories.quota.createEnterprise(prisma, users[4].id);

      const freeCount = await prisma.apiQuota.count({
        where: { tier: 'FREE' },
      });
      const proCount = await prisma.apiQuota.count({
        where: { tier: 'PRO' },
      });
      const enterpriseCount = await prisma.apiQuota.count({
        where: { tier: 'ENTERPRISE' },
      });

      expect(freeCount).toBe(2);
      expect(proCount).toBe(2);
      expect(enterpriseCount).toBe(1);
    });

    it('should aggregate total storage across all users', async () => {
      const users = await factories.user.createMany(prisma, 3);

      await factories.quota.create(prisma, users[0].id, { storageGB: 1 });
      await factories.quota.create(prisma, users[1].id, { storageGB: 10 });
      await factories.quota.create(prisma, users[2].id, { storageGB: 100 });

      const aggregate = await prisma.apiQuota.aggregate({
        _sum: {
          storageGB: true,
        },
      });

      expect(Number(aggregate._sum.storageGB)).toBe(111);
    });

    it('should find users with highest quota limits', async () => {
      const users = await factories.user.createMany(prisma, 3);

      await factories.quota.create(prisma, users[0].id, { requestsPerHour: 100 });
      await factories.quota.create(prisma, users[1].id, { requestsPerHour: 5000 });
      await factories.quota.create(prisma, users[2].id, { requestsPerHour: 1000 });

      const quotas = await prisma.apiQuota.findMany({
        orderBy: { requestsPerHour: 'desc' },
        take: 1,
      });

      expect(quotas[0].requestsPerHour).toBe(5000);
    });
  });

  describe('Quota Validation', () => {
    it('should ensure requests per day >= requests per hour', async () => {
      const user = await factories.user.create(prisma);

      const quota = await factories.quota.create(prisma, user.id, {
        requestsPerHour: 100,
        requestsPerDay: 1000,
      });

      expect(quota.requestsPerDay).toBeGreaterThanOrEqual(quota.requestsPerHour);
    });

    it('should ensure requests per month >= requests per day', async () => {
      const user = await factories.user.create(prisma);

      const quota = await factories.quota.create(prisma, user.id, {
        requestsPerDay: 1000,
        requestsPerMonth: 10000,
      });

      expect(quota.requestsPerMonth).toBeGreaterThanOrEqual(quota.requestsPerDay);
    });

    it('should handle concurrent request limits', async () => {
      const user = await factories.user.create(prisma);

      const quota = await factories.quota.create(prisma, user.id, {
        concurrentRequests: 10,
      });

      expect(quota.concurrentRequests).toBeGreaterThan(0);
    });
  });

  describe('Quota Transactions', () => {
    it('should create user and quota atomically', async () => {
      await prisma.$transaction(async (tx) => {
        const user = await factories.user.create(tx);
        await factories.quota.createPro(tx, user.id);
      });

      const quotas = await prisma.apiQuota.findMany({
        where: { tier: 'PRO' },
      });

      expect(quotas.length).toBeGreaterThanOrEqual(1);
    });

    it('should rollback quota creation on error', async () => {
      const initialCount = await prisma.apiQuota.count();

      try {
        await prisma.$transaction(async (tx) => {
          const user = await factories.user.create(tx);
          await factories.quota.create(tx, user.id);
          throw new Error('Forced rollback');
        });
      } catch (error) {
        // Expected error
      }

      const finalCount = await prisma.apiQuota.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
