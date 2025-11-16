/**
 * User Integration Tests
 * Tests user CRUD operations with real database
 */

import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories, resetSequence } from '../factories';
import * as bcrypt from 'bcrypt';

describe('User Integration Tests', () => {
  const prisma = getTestPrismaClient();

  afterEach(async () => {
    await cleanupAfterTest();
    resetSequence();
  });

  describe('User Creation', () => {
    it('should create a new user with hashed password', async () => {
      const user = await factories.user.create(prisma, {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
      expect(user.name).toBe('New User');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('SecurePassword123!');

      // Verify password is correctly hashed
      const isMatch = await bcrypt.compare('SecurePassword123!', user.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should create user with default values', async () => {
      const user = await factories.user.create(prisma);

      expect(user.id).toBeDefined();
      expect(user.email).toContain('@example.com');
      expect(user.timezone).toBe('UTC');
      expect(user.currency).toBe('USD');
      expect(user.language).toBe('en');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      await factories.user.create(prisma, { email: 'duplicate@example.com' });

      await expect(
        factories.user.create(prisma, { email: 'duplicate@example.com' })
      ).rejects.toThrow();
    });

    it('should create multiple users', async () => {
      const users = await factories.user.createMany(prisma, 5);

      expect(users).toHaveLength(5);
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(5); // All unique
    });
  });

  describe('User Retrieval', () => {
    it('should find user by ID', async () => {
      const created = await factories.user.create(prisma, {
        email: 'findme@example.com',
        name: 'Find Me',
      });

      const found = await prisma.user.findUnique({
        where: { id: created.id },
      });

      expect(found).not.toBeNull();
      expect(found?.email).toBe('findme@example.com');
      expect(found?.name).toBe('Find Me');
    });

    it('should find user by email', async () => {
      const created = await factories.user.create(prisma, {
        email: 'search@example.com',
      });

      const found = await prisma.user.findUnique({
        where: { email: 'search@example.com' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent user', async () => {
      const found = await prisma.user.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(found).toBeNull();
    });

    it('should find multiple users', async () => {
      await factories.user.createMany(prisma, 3);

      const users = await prisma.user.findMany();

      expect(users.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter users by currency', async () => {
      await factories.user.create(prisma, { currency: 'USD' });
      await factories.user.create(prisma, { currency: 'EUR' });
      await factories.user.create(prisma, { currency: 'USD' });

      const usdUsers = await prisma.user.findMany({
        where: { currency: 'USD' },
      });

      expect(usdUsers.length).toBeGreaterThanOrEqual(2);
      usdUsers.forEach(user => {
        expect(user.currency).toBe('USD');
      });
    });
  });

  describe('User Update', () => {
    it('should update user name', async () => {
      const user = await factories.user.create(prisma, { name: 'Old Name' });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'New Name' },
      });

      expect(updated.name).toBe('New Name');
      expect(updated.id).toBe(user.id);
      expect(updated.email).toBe(user.email);
    });

    it('should update user preferences', async () => {
      const user = await factories.user.create(prisma);

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          timezone: 'America/New_York',
          currency: 'EUR',
          language: 'fr',
        },
      });

      expect(updated.timezone).toBe('America/New_York');
      expect(updated.currency).toBe('EUR');
      expect(updated.language).toBe('fr');
    });

    it('should update password hash', async () => {
      const user = await factories.user.create(prisma);
      const oldHash = user.passwordHash;

      const newPasswordHash = await bcrypt.hash('NewPassword456!', 10);

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      expect(updated.passwordHash).not.toBe(oldHash);
      const isMatch = await bcrypt.compare('NewPassword456!', updated.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should automatically update updatedAt timestamp', async () => {
      const user = await factories.user.create(prisma);
      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'Updated Name' },
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('User Deletion', () => {
    it('should delete user', async () => {
      const user = await factories.user.create(prisma);

      await prisma.user.delete({
        where: { id: user.id },
      });

      const found = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete user relations', async () => {
      // Create user with related data
      const user = await factories.user.create(prisma);
      const platform = await factories.platform.create(prisma, user.id);
      const earning = await factories.earning.create(prisma, user.id, {
        platformId: platform.id,
      });

      // Delete user
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Verify related data is also deleted (cascade)
      const foundPlatform = await prisma.platform.findUnique({
        where: { id: platform.id },
      });
      const foundEarning = await prisma.earning.findUnique({
        where: { id: earning.id },
      });

      expect(foundPlatform).toBeNull();
      expect(foundEarning).toBeNull();
    });

    it('should throw error when deleting non-existent user', async () => {
      await expect(
        prisma.user.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('User Count', () => {
    it('should count all users', async () => {
      await factories.user.createMany(prisma, 5);

      const count = await prisma.user.count();

      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should count users with filter', async () => {
      await factories.user.create(prisma, { currency: 'USD' });
      await factories.user.create(prisma, { currency: 'EUR' });
      await factories.user.create(prisma, { currency: 'USD' });

      const count = await prisma.user.count({
        where: { currency: 'USD' },
      });

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Relations', () => {
    it('should include user platforms', async () => {
      const user = await factories.user.create(prisma);
      await factories.platform.create(prisma, user.id, { name: 'Platform 1' });
      await factories.platform.create(prisma, user.id, { name: 'Platform 2' });

      const userWithPlatforms = await prisma.user.findUnique({
        where: { id: user.id },
        include: { platforms: true },
      });

      expect(userWithPlatforms?.platforms).toHaveLength(2);
      expect(userWithPlatforms?.platforms[0].name).toBeDefined();
    });

    it('should include user earnings', async () => {
      const user = await factories.user.create(prisma);
      await factories.earning.create(prisma, user.id, { amount: 100 });
      await factories.earning.create(prisma, user.id, { amount: 200 });

      const userWithEarnings = await prisma.user.findUnique({
        where: { id: user.id },
        include: { earnings: true },
      });

      expect(userWithEarnings?.earnings).toHaveLength(2);
      const totalAmount = userWithEarnings?.earnings.reduce(
        (sum, earning) => sum + Number(earning.amount),
        0
      );
      expect(totalAmount).toBe(300);
    });

    it('should include nested relations', async () => {
      const user = await factories.user.create(prisma);
      const platform = await factories.platform.create(prisma, user.id);
      await factories.earning.create(prisma, user.id, { platformId: platform.id });

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

      expect(userWithData?.platforms).toHaveLength(1);
      expect(userWithData?.earnings).toHaveLength(1);
      expect(userWithData?.earnings[0].platform?.id).toBe(platform.id);
    });
  });

  describe('User Transactions', () => {
    it('should create user and related data in transaction', async () => {
      await prisma.$transaction(async (tx) => {
        const user = await factories.user.create(tx, {
          email: 'transaction@example.com',
        });

        await factories.platform.create(tx, user.id, { name: 'Test Platform' });
        await factories.earning.create(tx, user.id, { amount: 500 });
      });

      const user = await prisma.user.findUnique({
        where: { email: 'transaction@example.com' },
        include: { platforms: true, earnings: true },
      });

      expect(user).not.toBeNull();
      expect(user?.platforms).toHaveLength(1);
      expect(user?.earnings).toHaveLength(1);
    });

    it('should rollback transaction on error', async () => {
      const initialCount = await prisma.user.count();

      try {
        await prisma.$transaction(async (tx) => {
          await factories.user.create(tx, { email: 'rollback@example.com' });
          // Force an error
          throw new Error('Forced rollback');
        });
      } catch (error) {
        // Expected error
      }

      const finalCount = await prisma.user.count();
      expect(finalCount).toBe(initialCount); // No new user created
    });
  });
});
