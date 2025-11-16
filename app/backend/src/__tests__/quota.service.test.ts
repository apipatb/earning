/**
 * Tests for Quota Service
 * Tests quota checking, usage tracking, tier-based quotas, and quota reset
 */

import { QuotaService } from '../services/quota.service';
import prisma from '../lib/prisma';
import { getQuotaForTier, getFeatureLimit } from '../config/quotas.config';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    usage: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    subscription: {
      upsert: jest.fn(),
    },
  },
}));

// Mock CacheService
jest.mock('../services/cache.service', () => ({
  CacheService: {
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
  },
}));

// Mock logger
jest.mock('../lib/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

describe('QuotaService', () => {
  const mockUserId = 'test-user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    tier: 'pro',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackUsage', () => {
    it('should track usage for a feature', async () => {
      const mockUsage = {
        id: 'usage-123',
        userId: mockUserId,
        feature: 'earnings',
        count: 0,
        limit: 1000,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.usage.findUnique as jest.Mock).mockResolvedValue(mockUsage);
      (prisma.usage.update as jest.Mock).mockResolvedValue({
        ...mockUsage,
        count: 1,
      });

      const count = await QuotaService.trackUsage(mockUserId, 'earnings');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.usage.update).toHaveBeenCalled();
      expect(count).toBe(1);
    });

    it('should not track usage for unlimited features', async () => {
      // Enterprise tier has unlimited earnings
      const mockEnterpriseUser = { ...mockUser, tier: 'enterprise' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockEnterpriseUser);

      const count = await QuotaService.trackUsage(mockUserId, 'earnings');

      expect(count).toBe(0);
    });

    it('should create new usage record if it does not exist', async () => {
      const mockNewUsage = {
        id: 'usage-123',
        userId: mockUserId,
        feature: 'invoices',
        count: 1,
        limit: 100,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.usage.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.usage.create as jest.Mock).mockResolvedValue({
        id: 'usage-123',
        userId: mockUserId,
        feature: 'invoices',
        count: 0,
        limit: 100,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      (prisma.usage.update as jest.Mock).mockResolvedValue(mockNewUsage);

      const count = await QuotaService.trackUsage(mockUserId, 'invoices');

      expect(prisma.usage.create).toHaveBeenCalled();
      expect(prisma.usage.update).toHaveBeenCalled();
      expect(count).toBe(1);
    });

    it('should increment usage by specified amount', async () => {
      const mockUsage = {
        id: 'usage-123',
        userId: mockUserId,
        feature: 'sales',
        count: 10,
        limit: 500,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.usage.findUnique as jest.Mock).mockResolvedValue(mockUsage);
      (prisma.usage.update as jest.Mock).mockResolvedValue({
        ...mockUsage,
        count: 15,
      });

      const count = await QuotaService.trackUsage(mockUserId, 'sales', 5);

      expect(prisma.usage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { count: 15 },
        })
      );
      expect(count).toBe(15);
    });
  });

  describe('checkQuota', () => {
    it('should return false if quota is not exceeded', async () => {
      const mockUsage = {
        id: 'usage-123',
        userId: mockUserId,
        feature: 'earnings',
        count: 50,
        limit: 100,
        percentUsed: 50,
        isExceeded: false,
        resetDate: new Date(),
      };

      jest.spyOn(QuotaService, 'getUsageStats').mockResolvedValue(mockUsage);

      const isExceeded = await QuotaService.checkQuota(mockUserId, 'earnings');

      expect(isExceeded).toBe(false);
    });

    it('should return true if quota is exceeded', async () => {
      const mockUsage = {
        id: 'usage-123',
        userId: mockUserId,
        feature: 'invoices',
        count: 100,
        limit: 100,
        percentUsed: 100,
        isExceeded: true,
        resetDate: new Date(),
      };

      jest.spyOn(QuotaService, 'getUsageStats').mockResolvedValue(mockUsage);

      const isExceeded = await QuotaService.checkQuota(mockUserId, 'invoices');

      expect(isExceeded).toBe(true);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage stats for a feature', async () => {
      const mockUsage = {
        id: 'usage-123',
        userId: mockUserId,
        feature: 'products',
        count: 5,
        limit: 50,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.usage.findUnique as jest.Mock).mockResolvedValue(mockUsage);

      const stats = await QuotaService.getUsageStats(mockUserId, 'products');

      expect(stats).toBeDefined();
      expect(stats?.count).toBe(5);
      expect(stats?.limit).toBe(50);
      expect(stats?.percentUsed).toBe(10);
      expect(stats?.isExceeded).toBe(false);
    });

    it('should return stats for unlimited features', async () => {
      // Enterprise tier has unlimited products
      const mockEnterpriseUser = { ...mockUser, tier: 'enterprise' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockEnterpriseUser);

      const stats = await QuotaService.getUsageStats(mockUserId, 'products');

      expect(stats?.limit).toBeNull();
      expect(stats?.isExceeded).toBe(false);
      expect(stats?.percentUsed).toBe(0);
    });

    it('should calculate correct percentage usage', async () => {
      const mockUsage = {
        id: 'usage-123',
        userId: mockUserId,
        feature: 'earnings',
        count: 75,
        limit: 100,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.usage.findUnique as jest.Mock).mockResolvedValue(mockUsage);

      const stats = await QuotaService.getUsageStats(mockUserId, 'earnings');

      expect(stats?.percentUsed).toBe(75);
    });
  });

  describe('getAllUsageStats', () => {
    it('should return all usage stats for a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      jest.spyOn(QuotaService, 'getUsageStats').mockResolvedValue({
        userId: mockUserId,
        feature: 'earnings',
        count: 50,
        limit: 1000,
        percentUsed: 5,
        isExceeded: false,
        resetDate: new Date(),
      });

      const allStats = await QuotaService.getAllUsageStats(mockUserId);

      expect(allStats).toBeDefined();
      expect(allStats?.tier).toBe('pro');
      expect(allStats?.features).toBeDefined();
    });
  });

  describe('upgradeTier', () => {
    it('should upgrade user tier', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        tier: 'enterprise',
      });

      (prisma.subscription.upsert as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        tier: 'enterprise',
        status: 'active',
      });

      const result = await QuotaService.upgradeTier(mockUserId, 'enterprise');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { tier: 'enterprise' },
      });

      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });
  });

  describe('resetQuotaCounters', () => {
    it('should reset quota counters for user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.usage.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'old-usage-1',
          userId: mockUserId,
          feature: 'earnings',
          count: 50,
          limit: 100,
          resetDate: new Date('2024-10-01'),
        },
      ]);

      (prisma.usage.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const resetCount = await QuotaService.resetQuotaCounters(mockUserId);

      expect(prisma.usage.findMany).toHaveBeenCalled();
      expect(prisma.usage.deleteMany).toHaveBeenCalled();
    });
  });

  describe('Tier-based quotas', () => {
    it('should enforce free tier limits', () => {
      const freeQuota = getQuotaForTier('free');

      expect(getFeatureLimit('free', 'earnings')).toBe(100);
      expect(getFeatureLimit('free', 'invoices')).toBe(10);
      expect(getFeatureLimit('free', 'products')).toBe(5);
    });

    it('should enforce pro tier limits', () => {
      expect(getFeatureLimit('pro', 'earnings')).toBe(1000);
      expect(getFeatureLimit('pro', 'invoices')).toBe(100);
      expect(getFeatureLimit('pro', 'products')).toBe(50);
    });

    it('should have unlimited enterprise tier', () => {
      expect(getFeatureLimit('enterprise', 'earnings')).toBeNull();
      expect(getFeatureLimit('enterprise', 'invoices')).toBeNull();
      expect(getFeatureLimit('enterprise', 'products')).toBeNull();
    });
  });
});
