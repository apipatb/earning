import { PrismaClient, SubscriptionStatus, BillingStatus, BillingCycle } from '@prisma/client';
import cron from 'node-cron';
import { paymentService } from './payment.service';

const prisma = new PrismaClient();

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
      console.log('[Subscription] Running daily billing check...');
      await this.processRecurringBilling();
    });

    // Run dunning process every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('[Subscription] Running dunning process...');
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

    const currentPeriodEnd = this.calculatePeriodEnd(
      trialEndsAt || startDate,
      plan.billingCycle
    );

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: effectiveTrialDays > 0 ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        startDate,
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

    console.log(`[Subscription] Found ${subscriptions.length} subscriptions to bill`);

    for (const subscription of subscriptions) {
      try {
        await this.renewSubscription(subscription);
      } catch (error) {
        console.error(`[Subscription] Failed to renew subscription ${subscription.id}:`, error);
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
      const newPeriodEnd = this.calculatePeriodEnd(
        subscription.currentPeriodEnd,
        subscription.plan.billingCycle
      );

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: newPeriodEnd,
          trialEndsAt: null,
        },
      });

      console.log(`[Subscription] Successfully renewed subscription ${subscription.id}`);
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

    console.log(`[Dunning] Found ${failedBillings.length} failed payments to retry`);

    for (const billing of failedBillings) {
      try {
        await this.retryPayment(billing);
      } catch (error) {
        console.error(`[Dunning] Failed to retry payment for billing ${billing.id}:`, error);
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

      console.log(`[Dunning] Successfully retried payment for billing ${billing.id}`);
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
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Get the current billing period
    const currentPeriodStart = subscription.currentPeriodStart;
    const currentPeriodEnd = subscription.currentPeriodEnd;

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
      console.error(`Failed to calculate usage for ${metricName}:`, error);
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
    // This would require an AuditLog or RequestLog table
    // For now, return 0 as it requires schema changes
    return 0;
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
    // Calculate total file storage in MB
    // This would require querying File table and summing file sizes
    return 0;
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
      console.log(`[Usage] Recorded ${quantity} ${metricName} for subscription ${subscriptionId}`, {
        userId: subscription.userId,
        timestamp: new Date(),
        metadata,
      });

      // In a production system, you would:
      // 1. Store usage in a UsageRecord table
      // 2. Aggregate usage for billing
      // 3. Trigger alerts if usage exceeds limits
      // 4. Update usage metrics in real-time

      // Example: Create usage record (requires UsageRecord model)
      // await prisma.usageRecord.create({
      //   data: {
      //     subscriptionId,
      //     metricName,
      //     quantity,
      //     timestamp: new Date(),
      //     metadata: metadata ? JSON.stringify(metadata) : null,
      //   },
      // });
    } catch (error) {
      console.error('Failed to record usage:', error);
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
      console.error(`[Subscription] Error checking active subscription for user ${userId}:`, error);
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
      console.error(`[Subscription] Error getting active subscription for user ${userId}:`, error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
