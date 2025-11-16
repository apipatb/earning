import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { subscriptionService } from '../services/subscription.service';
import { paymentService } from '../services/payment.service';
import Stripe from 'stripe';

// Validation schemas
const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  paymentMethodId: z.string().uuid().optional(),
  trialDays: z.number().int().min(0).optional(),
});

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

const createPaymentMethodSchema = z.object({
  type: z.enum(['CARD', 'BANK', 'PAYPAL']),
  stripePaymentMethodId: z.string().optional(),
  token: z.string().optional(),
  isDefault: z.boolean().default(false),
});

const processRefundSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

const sendInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
});

/**
 * POST /api/v1/billing/subscriptions
 * Create a new subscription
 */
export async function createSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = createSubscriptionSchema.parse(req.body);

    const subscription = await subscriptionService.createSubscription({
      userId,
      ...validatedData,
    });

    logger.info(`[Billing] Subscription created: ${subscription.id} for user ${userId}`);

    res.status(201).json(subscription);
  } catch (error) {
    logger.error('[Billing] Error creating subscription:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    });
  }
}

/**
 * GET /api/v1/billing/subscriptions
 * Get user's subscriptions
 */
export async function getSubscriptions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
        billingHistory: {
          orderBy: { billedDate: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(subscriptions);
  } catch (error) {
    logger.error('[Billing] Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
}

/**
 * GET /api/v1/billing/subscriptions/:id
 * Get a specific subscription
 */
export async function getSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const subscription = await prisma.subscription.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        plan: true,
        billingHistory: {
          orderBy: { billedDate: 'desc' },
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    logger.error('[Billing] Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
}

/**
 * PUT /api/v1/billing/subscriptions/:id
 * Update a subscription
 */
export async function updateSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const validatedData = updateSubscriptionSchema.parse(req.body);

    // Verify ownership
    const existingSubscription = await prisma.subscription.findFirst({
      where: { id, userId },
    });

    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = await subscriptionService.updateSubscription(id, validatedData);

    logger.info(`[Billing] Subscription updated: ${id} for user ${userId}`);

    res.json(subscription);
  } catch (error) {
    logger.error('[Billing] Error updating subscription:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update subscription',
    });
  }
}

/**
 * POST /api/v1/billing/subscriptions/:id/cancel
 * Cancel a subscription
 */
export async function cancelSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { immediately } = req.query;

    // Verify ownership
    const existingSubscription = await prisma.subscription.findFirst({
      where: { id, userId },
    });

    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = await subscriptionService.cancelSubscription(
      id,
      immediately === 'true'
    );

    logger.info(`[Billing] Subscription cancelled: ${id} for user ${userId}`);

    res.json(subscription);
  } catch (error) {
    logger.error('[Billing] Error cancelling subscription:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to cancel subscription',
    });
  }
}

/**
 * POST /api/v1/billing/subscriptions/:id/reactivate
 * Reactivate a cancelled subscription
 */
export async function reactivateSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify ownership
    const existingSubscription = await prisma.subscription.findFirst({
      where: { id, userId },
    });

    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = await subscriptionService.reactivateSubscription(id);

    logger.info(`[Billing] Subscription reactivated: ${id} for user ${userId}`);

    res.json(subscription);
  } catch (error) {
    logger.error('[Billing] Error reactivating subscription:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
    });
  }
}

/**
 * GET /api/v1/billing/plans
 * Get available pricing plans
 */
export async function getPricingPlans(req: AuthRequest, res: Response) {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    res.json(plans);
  } catch (error) {
    logger.error('[Billing] Error fetching pricing plans:', error);
    res.status(500).json({ error: 'Failed to fetch pricing plans' });
  }
}

/**
 * GET /api/v1/billing/invoices
 * List user's invoices
 */
export async function getInvoices(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          lineItems: true,
          subscription: true,
        },
        orderBy: { invoiceDate: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      invoices,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error('[Billing] Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}

/**
 * GET /api/v1/billing/invoices/:id
 * Get a specific invoice
 */
export async function getInvoice(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        customer: true,
        lineItems: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    logger.error('[Billing] Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
}

/**
 * POST /api/v1/billing/invoices/:id/send
 * Send an invoice to customer
 */
export async function sendInvoice(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify ownership
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updatedInvoice = await paymentService.sendInvoice(id);

    logger.info(`[Billing] Invoice sent: ${id} for user ${userId}`);

    res.json(updatedInvoice);
  } catch (error) {
    logger.error('[Billing] Error sending invoice:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send invoice',
    });
  }
}

/**
 * GET /api/v1/billing/payment-methods
 * List user's payment methods
 */
export async function getPaymentMethods(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const paymentMethods = await prisma.paymentMethodModel.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(paymentMethods);
  } catch (error) {
    logger.error('[Billing] Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
}

/**
 * POST /api/v1/billing/payment-methods
 * Add a new payment method
 */
export async function createPaymentMethod(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = createPaymentMethodSchema.parse(req.body);

    const paymentMethod = await paymentService.createPaymentMethod({
      userId,
      ...validatedData,
    });

    logger.info(`[Billing] Payment method created: ${paymentMethod.id} for user ${userId}`);

    res.status(201).json(paymentMethod);
  } catch (error) {
    logger.error('[Billing] Error creating payment method:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create payment method',
    });
  }
}

/**
 * DELETE /api/v1/billing/payment-methods/:id
 * Delete a payment method
 */
export async function deletePaymentMethod(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify ownership
    const paymentMethod = await prisma.paymentMethodModel.findFirst({
      where: { id, userId },
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await paymentService.deletePaymentMethod(id);

    logger.info(`[Billing] Payment method deleted: ${id} for user ${userId}`);

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    logger.error('[Billing] Error deleting payment method:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete payment method',
    });
  }
}

/**
 * PUT /api/v1/billing/payment-methods/:id/default
 * Set a payment method as default
 */
export async function setDefaultPaymentMethod(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const paymentMethod = await paymentService.setDefaultPaymentMethod(userId, id);

    logger.info(`[Billing] Default payment method set: ${id} for user ${userId}`);

    res.json(paymentMethod);
  } catch (error) {
    logger.error('[Billing] Error setting default payment method:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to set default payment method',
    });
  }
}

/**
 * POST /api/v1/billing/setup-intent
 * Create a setup intent for adding a payment method
 */
export async function createSetupIntent(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const setupIntent = await paymentService.createSetupIntent(userId);

    res.json(setupIntent);
  } catch (error) {
    logger.error('[Billing] Error creating setup intent:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create setup intent',
    });
  }
}

/**
 * POST /api/v1/billing/refunds
 * Process a refund
 */
export async function processRefund(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = processRefundSchema.parse(req.body);

    const refund = await paymentService.processRefund(validatedData);

    logger.info(`[Billing] Refund processed for user ${userId}`);

    res.json(refund);
  } catch (error) {
    logger.error('[Billing] Error processing refund:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process refund',
    });
  }
}

/**
 * GET /api/v1/billing/billing-history
 * Get user's billing history
 */
export async function getBillingHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0 } = req.query;

    const [history, total] = await Promise.all([
      prisma.billingHistory.findMany({
        where: {
          subscription: {
            userId,
          },
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          invoice: true,
        },
        orderBy: { billedDate: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.billingHistory.count({
        where: {
          subscription: {
            userId,
          },
        },
      }),
    ]);

    res.json({
      history,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error('[Billing] Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
}

/**
 * POST /api/v1/billing/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: AuthRequest, res: Response) {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!signature || !webhookSecret) {
      return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia',
    });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error) {
      logger.error('[Billing] Webhook signature verification failed:', error);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process the event
    await paymentService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    logger.error('[Billing] Error handling webhook:', error);
    res.status(500).json({ error: 'Failed to handle webhook' });
  }
}
