import { PrismaClient, SubscriptionStatus, BillingStatus, BillingCycle } from '@prisma/client';
import cron from 'node-cron';
import { paymentService } from './payment.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Cache for usage data to avoid excessive queries
interface UsageCache {
  data: number;
  timestamp: number;
}

const usageCache = new Map<string, UsageCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  paymentMethodId?: string;
  trialDays?: number;
}

interface UpdateSubscriptionInput {
  planId?: string;
  cancelAtPeriodEnd?: boolean;
}

interface ProrationCalculation {
  creditAmount: number;
  newAmount: number;
  daysRemaining: number;
  daysInPeriod: number;
}

class SubscriptionService {
  /**
   * Initialize cron job for recurring billing
   */
  initializeBillingCron() {
    // Run every day at 1 AM
    cron.schedule('0 1 * * *', async () => {
      logger.info('[Subscription] Running daily billing check');
      await this.processRecurringBilling();
    });

    // Run dunning process every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      logger.info('[Subscription] Running dunning process');
      await this.processDunning();
    });
  }

  /**
   * Create a new subscription
   */
  async createSubscription(input: CreateSubscriptionInput) {
    const { userId, planId, paymentMethodId, trialDays } = input;

    // Get the pricing plan
    const plan = await prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error('Invalid or inactive pricing plan');
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
    });

    if (existingSubscription) {
      throw new Error('User already has an active subscription');
    }

    // Calculate dates
    const startDate = new Date();
    const effectiveTrialDays = trialDays !== undefined ? trialDays : plan.trialDays;
    const trialEndsAt = effectiveTrialDays > 0
      ? new Date(startDate.getTime() + effectiveTrialDays * 24 * 60 * 60 * 1000)
      : null;

    const periodStartDate = trialEndsAt || startDate;
    const currentPeriodEnd = this.calculatePeriodEnd(
      periodStartDate,
      plan.billingCycle
    );

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: effectiveTrialDays > 0 ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        startDate,
        currentPeriodStart: periodStartDate,
        currentPeriodEnd,
        trialEndsAt,
      },
      include: {
        plan: true,
        user: true,
      },
    });

    // If not in trial, create initial billing record
    if (effectiveTrialDays === 0 && paymentMethodId) {
      try {
        await this.createBillingRecord(subscription.id, plan.price, paymentMethodId);
      } catch (error) {
        // Update subscription to PAST_DUE if payment fails
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.PAST_DUE },
        });
        throw error;
      }
    }

    return subscription;
  }

  /**
   * Upgrade or downgrade subscription
   */
  async updateSubscription(subscriptionId: string, input: UpdateSubscriptionInput) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new Error('Cannot update cancelled subscription');
    }

    const updateData: any = {};

    // Handle plan change
    if (input.planId && input.planId !== subscription.planId) {
      const newPlan = await prisma.pricingPlan.findUnique({
        where: { id: input.planId },
      });

      if (!newPlan || !newPlan.isActive) {
        throw new Error('Invalid or inactive pricing plan');
      }

      // Calculate proration
      const proration = this.calculateProration(
        subscription.currentPeriodEnd,
        subscription.plan.price,
        newPlan.price
      );

      updateData.planId = input.planId;

      // Create billing record for proration if applicable
      if (proration.newAmount > 0) {
        await this.createBillingRecord(
          subscriptionId,
          proration.newAmount,
          undefined,
          'Plan change proration'
        );
      }
    }

    // Handle cancellation
    if (input.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
      if (input.cancelAtPeriodEnd) {
        updateData.cancelledAt = new Date();
      } else {
        updateData.cancelledAt = null;
      }
    }

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: { plan: true },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (immediately) {
      return prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    } else {
      return prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
        },
      });
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.CANCELLED && !subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription is not cancelled');
    }

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });
  }

  /**
   * Process recurring billing for all active subscriptions
   */
  async processRecurringBilling() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find subscriptions that need billing
    const subscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          {
            // Trial ending today
            status: SubscriptionStatus.TRIALING,
            trialEndsAt: {
              lte: today,
            },
          },
          {
            // Active subscription renewal
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: {
              lte: today,
            },
            cancelAtPeriodEnd: false,
          },
        ],
      },
      include: {
        plan: true,
        user: {
          include: {
            paymentMethods: {
              where: { isDefault: true, isActive: true },
            },
          },
        },
      },
    });

    logger.info(`[Subscription] Found ${subscriptions.length} subscriptions to bill`);

    for (const subscription of subscriptions) {
      try {
        await this.renewSubscription(subscription);
      } catch (error) {
        logger.error(`[Subscription] Failed to renew subscription ${subscription.id}`, error as Error);
      }
    }
  }

  /**
   * Renew a subscription
   */
  private async renewSubscription(subscription: any) {
    const paymentMethod = subscription.user.paymentMethods[0];

    if (!paymentMethod) {
      // No payment method, mark as PAST_DUE
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
      return;
    }

    try {
      // Create billing record and process payment
      await this.createBillingRecord(
        subscription.id,
        subscription.plan.price,
        paymentMethod.id
      );

      // Update subscription
      const newPeriodStart = subscription.currentPeriodEnd;
      const newPeriodEnd = this.calculatePeriodEnd(
        newPeriodStart,
        subscription.plan.billingCycle
      );

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          trialEndsAt: null,
        },
      });

      logger.info(`[Subscription] Successfully renewed subscription ${subscription.id}`);
    } catch (error) {
      // Payment failed, mark as PAST_DUE
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
      throw error;
    }
  }

  /**
   * Process dunning (retry failed payments)
   */
  async processDunning() {
    const now = new Date();

    // Find failed billing records that need retry
    const failedBillings = await prisma.billingHistory.findMany({
      where: {
        status: BillingStatus.FAILED,
        retryCount: { lt: 3 },
        nextRetryAt: { lte: now },
      },
      include: {
        subscription: {
          include: {
            user: {
              include: {
                paymentMethods: {
                  where: { isDefault: true, isActive: true },
                },
              },
            },
          },
        },
      },
    });

    logger.info(`[Dunning] Found ${failedBillings.length} failed payments to retry`);

    for (const billing of failedBillings) {
      try {
        await this.retryPayment(billing);
      } catch (error) {
        logger.error(`[Dunning] Failed to retry payment for billing ${billing.id}`, error as Error);
      }
    }
  }

  /**
   * Retry a failed payment
   */
  private async retryPayment(billing: any) {
    const paymentMethod = billing.subscription.user.paymentMethods[0];

    if (!paymentMethod) {
      throw new Error('No payment method available');
    }

    try {
      // Attempt payment
      await paymentService.processPayment({
        amount: billing.amount,
        paymentMethodId: paymentMethod.id,
        description: `Subscription renewal retry (Attempt ${billing.retryCount + 1})`,
        metadata: {
          subscriptionId: billing.subscriptionId,
          billingId: billing.id,
        },
      });

      // Update billing record
      await prisma.billingHistory.update({
        where: { id: billing.id },
        data: {
          status: BillingStatus.PAID,
          paidDate: new Date(),
        },
      });

      // Update subscription status
      await prisma.subscription.update({
        where: { id: billing.subscriptionId },
        data: { status: SubscriptionStatus.ACTIVE },
      });

      logger.info(`[Dunning] Successfully retried payment for billing ${billing.id}`);
    } catch (error) {
      // Calculate next retry time (exponential backoff)
      const nextRetryHours = Math.pow(2, billing.retryCount + 1);
      const nextRetryAt = new Date(Date.now() + nextRetryHours * 60 * 60 * 1000);

      await prisma.billingHistory.update({
        where: { id: billing.id },
        data: {
          retryCount: billing.retryCount + 1,
          nextRetryAt,
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // If max retries reached, suspend subscription
      if (billing.retryCount + 1 >= 3) {
        await prisma.subscription.update({
          where: { id: billing.subscriptionId },
          data: { status: SubscriptionStatus.SUSPENDED },
        });
      }

      throw error;
    }
  }

  /**
   * Create a billing record
   */
  private async createBillingRecord(
    subscriptionId: string,
    amount: number,
    paymentMethodId?: string,
    notes?: string
  ) {
    const billedDate = new Date();
    const dueDate = new Date(billedDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const billing = await prisma.billingHistory.create({
      data: {
        subscriptionId,
        amount,
        billedDate,
        dueDate,
        status: BillingStatus.PENDING,
      },
    });

    // Process payment if payment method provided
    if (paymentMethodId) {
      try {
        await paymentService.processPayment({
          amount,
          paymentMethodId,
          description: notes || 'Subscription billing',
          metadata: {
            subscriptionId,
            billingId: billing.id,
          },
        });

        await prisma.billingHistory.update({
          where: { id: billing.id },
          data: {
            status: BillingStatus.PAID,
            paidDate: new Date(),
          },
        });
      } catch (error) {
        await prisma.billingHistory.update({
          where: { id: billing.id },
          data: {
            status: BillingStatus.FAILED,
            failureReason: error instanceof Error ? error.message : 'Unknown error',
            retryCount: 0,
            nextRetryAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // Retry in 2 hours
          },
        });
        throw error;
      }
    }

    return billing;
  }

  /**
   * Calculate proration for plan changes
   */
  private calculateProration(
    currentPeriodEnd: Date,
    currentPrice: any,
    newPrice: any
  ): ProrationCalculation {
    const now = new Date();
    const daysRemaining = Math.ceil(
      (currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const daysInPeriod = 30; // Simplification

    const currentPriceNum = parseFloat(currentPrice.toString());
    const newPriceNum = parseFloat(newPrice.toString());

    const creditAmount = (currentPriceNum / daysInPeriod) * daysRemaining;
    const newAmount = Math.max(0, newPriceNum - creditAmount);

    return {
      creditAmount,
      newAmount,
      daysRemaining,
      daysInPeriod,
    };
  }

  /**
   * Calculate period end date based on billing cycle
   */
  private calculatePeriodEnd(startDate: Date, billingCycle: BillingCycle): Date {
    const periodEnd = new Date(startDate);

    if (billingCycle === BillingCycle.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (billingCycle === BillingCycle.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    return periodEnd;
  }

  /**
   * Get subscription usage for usage-based billing
   * Tracks real usage metrics from the database
   */
  async getSubscriptionUsage(subscriptionId: string, metricName: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Get the current billing period
    const currentPeriodEnd = subscription.currentPeriodEnd;
    // Use stored currentPeriodStart if available, otherwise calculate it
    const currentPeriodStart = subscription.currentPeriodStart || this.calculatePeriodStart(
      currentPeriodEnd,
      subscription.plan.billingCycle
    );

    // Calculate real usage based on metric type
    let usage = 0;
    let limit = 1000; // Default limit

    try {
      switch (metricName) {
        case 'api_calls':
          // Count API requests in current period (would need AuditLog or similar)
          usage = await this.getApiCallCount(subscription.userId, currentPeriodStart, currentPeriodEnd);
          limit = 10000; // 10k API calls per period
          break;

        case 'whatsapp_messages':
          // Count WhatsApp messages sent
          usage = await this.getWhatsAppMessageCount(subscription.userId, currentPeriodStart, currentPeriodEnd);
          limit = 1000; // 1k messages per period
          break;

        case 'storage_mb':
          // Calculate storage usage (files, media, etc.)
          usage = await this.getStorageUsage(subscription.userId);
          limit = 5000; // 5GB in MB
          break;

        case 'team_members':
          // Count active team members
          usage = await this.getTeamMemberCount(subscription.userId);
          limit = 10; // 10 team members
          break;

        case 'customers':
          // Count active customers
          usage = await this.getCustomerCount(subscription.userId);
          limit = 100; // 100 customers
          break;

        case 'invoices':
          // Count invoices created in period
          usage = await this.getInvoiceCount(subscription.userId, currentPeriodStart, currentPeriodEnd);
          limit = 50; // 50 invoices per period
          break;

        default:
          // Unknown metric, return default
          break;
      }
    } catch (error) {
      logger.error(`Failed to calculate usage for ${metricName}`, error as Error);
    }

    return {
      subscriptionId,
      metricName,
      usage,
      limit,
      percentage: limit > 0 ? (usage / limit) * 100 : 0,
      currentPeriodStart,
      currentPeriodEnd,
    };
  }

  /**
   * Helper methods to calculate real usage from database
   */
  private async getApiCallCount(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const cacheKey = `api_calls:${userId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      // Query AuditLog table for API calls in the given period
      const count = await prisma.auditLog.count({
        where: {
          userId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
          // Filter for API-related actions
          // You can customize this based on your action naming convention
          action: {
            in: [
              'API_REQUEST',
              'API_CALL',
              'GET_REQUEST',
              'POST_REQUEST',
              'PUT_REQUEST',
              'DELETE_REQUEST',
              'PATCH_REQUEST',
            ],
          },
        },
      });

      // Cache the result
      this.setCache(cacheKey, count);

      return count;
    } catch (error) {
      console.error(`[Subscription] Failed to get API call count for user ${userId}:`, error);
      // Return 0 on error to prevent breaking the subscription flow
      return 0;
    }
  }

  private async getWhatsAppMessageCount(userId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const count = await prisma.whatsAppMessage.count({
        where: {
          contact: {
            userId,
          },
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
          direction: 'OUTBOUND',
        },
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  private async getStorageUsage(userId: string): Promise<number> {
    const cacheKey = `storage:${userId}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      // Query FileUpload table and sum file sizes
      const result = await prisma.fileUpload.aggregate({
        where: {
          userId,
          // Only count files that are not expired
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        _sum: {
          fileSize: true,
        },
      });

      // Convert from bytes to MB (fileSize is stored in bytes as BigInt)
      const bytesUsed = result._sum.fileSize ? Number(result._sum.fileSize) : 0;
      const megabytesUsed = Math.ceil(bytesUsed / (1024 * 1024));

      // Cache the result
      this.setCache(cacheKey, megabytesUsed);

      return megabytesUsed;
    } catch (error) {
      console.error(`[Subscription] Failed to get storage usage for user ${userId}:`, error);
      // Return 0 on error to prevent breaking the subscription flow
      return 0;
    }
  }

  private async getTeamMemberCount(userId: string): Promise<number> {
    try {
      const count = await prisma.teamMember.count({
        where: {
          team: {
            createdBy: userId,
          },
          status: 'ACTIVE',
        },
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  private async getCustomerCount(userId: string): Promise<number> {
    try {
      const count = await prisma.customer.count({
        where: {
          userId,
        },
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  private async getInvoiceCount(userId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const count = await prisma.invoice.count({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Record usage for usage-based billing
   * Creates a usage record for tracking and billing purposes
   */
  async recordUsage(
    subscriptionId: string,
    metricName: string,
    quantity: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Validate subscription exists
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Log usage event
      logger.info(`[Usage] Recorded ${quantity} ${metricName} for subscription ${subscriptionId}`, {
        userId: subscription.userId,
        timestamp: new Date(),
        metadata,
      });

      // Store usage in UsageRecord table for tracking and billing purposes
      await prisma.usageRecord.create({
        data: {
          subscriptionId,
          userId: subscription.userId,
          metricName,
          quantity,
          timestamp: new Date(),
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      // Clear cache for this user to ensure fresh data on next query
      this.clearUserCache(subscription.userId);

      // Check if usage exceeds limits and trigger alerts
      const usage = await this.getSubscriptionUsage(subscriptionId, metricName);
      if (this.isOverLimit(usage.usage, usage.limit)) {
        console.warn(`[Usage] User ${subscription.userId} has exceeded limit for ${metricName}`);
        // In production, you would:
        // - Send email notification
        // - Create alert/notification in system
        // - Trigger webhook
        // - Block further usage (optional)
      } else if (this.isNearLimit(usage.usage, usage.limit)) {
        console.warn(`[Usage] User ${subscription.userId} is near limit for ${metricName} (${usage.percentage}%)`);
        // Send warning notification
      }
    } catch (error) {
      logger.error('Failed to record usage', error as Error);
      throw error;
    }
  }

  /**
   * Check if user has an active subscription
   * A subscription is considered active if:
   * - Status is ACTIVE or TRIALING
   * - Current period has not ended
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
          currentPeriodEnd: {
            gte: new Date(),
          },
        },
      });

      return activeSubscription !== null;
    } catch (error) {
      logger.error(`[Subscription] Error checking active subscription for user ${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get active subscription for a user
   * Returns the subscription details if active, null otherwise
   */
  async getActiveSubscription(userId: string) {
    try {
      return await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
          currentPeriodEnd: {
            gte: new Date(),
          },
        },
        include: {
          plan: true,
        },
      });
    } catch (error) {
      logger.error(`[Subscription] Error getting active subscription for user ${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * Calculate usage percentage
   * Returns the percentage of limit used (0-100)
   */
  getUsagePercentage(usage: number, limit: number): number {
    if (limit === 0) {
      return 0;
    }
    return Math.min(100, Math.round((usage / limit) * 100));
  }

  /**
   * Check if usage is near limit
   * Returns true if usage is at or above the threshold percentage
   * @param usage Current usage value
   * @param limit Maximum allowed usage
   * @param threshold Percentage threshold (default 80%)
   */
  isNearLimit(usage: number, limit: number, threshold: number = 80): boolean {
    const percentage = this.getUsagePercentage(usage, limit);
    return percentage >= threshold;
  }

  /**
   * Check if usage exceeds limit
   */
  isOverLimit(usage: number, limit: number): boolean {
    return usage >= limit;
  }

  /**
   * Get usage status with helpful metadata
   */
  getUsageStatus(usage: number, limit: number) {
    const percentage = this.getUsagePercentage(usage, limit);
    const remaining = Math.max(0, limit - usage);
    const isNearLimit = this.isNearLimit(usage, limit);
    const isOverLimit = this.isOverLimit(usage, limit);

    return {
      usage,
      limit,
      remaining,
      percentage,
      isNearLimit,
      isOverLimit,
      status: isOverLimit ? 'EXCEEDED' : isNearLimit ? 'WARNING' : 'OK',
    };
  }

  /**
   * Cache helper methods
   */
  private getFromCache(key: string): number | null {
    const cached = usageCache.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache is still valid (within TTL)
    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
      // Cache expired, remove it
      usageCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: number): void {
    usageCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear usage cache for a specific user
   * Useful when usage changes (e.g., after file upload, API call)
   */
  clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];

    for (const key of usageCache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      usageCache.delete(key);
    }
  }

  /**
   * Clear all usage cache
   */
  clearAllCache(): void {
    usageCache.clear();
  }

  /**
   * Calculate period start date based on period end and billing cycle
   * Helper method since the schema doesn't have currentPeriodStart
   */
  private calculatePeriodStart(periodEnd: Date, billingCycle: BillingCycle): Date {
    const periodStart = new Date(periodEnd);

    if (billingCycle === BillingCycle.MONTHLY) {
      periodStart.setMonth(periodStart.getMonth() - 1);
    } else if (billingCycle === BillingCycle.YEARLY) {
      periodStart.setFullYear(periodStart.getFullYear() - 1);
    }

    return periodStart;
  }
}

export const subscriptionService = new SubscriptionService();
