import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const prisma = new PrismaClient();

// Pricing configuration
export const PRICING = {
  free: {
    tier: 'free',
    name: 'Free',
    price: 0,
    maxPlatforms: 3,
    features: ['Basic earning tracking', 'Dashboard', 'Up to 3 platforms'],
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price: 9.99,
    stripePrice: process.env.STRIPE_PRICE_PRO || '',
    maxPlatforms: -1, // unlimited
    features: [
      'Unlimited platforms',
      'Advanced analytics',
      'Goals & forecasting',
      'CSV exports',
    ],
  },
  business: {
    tier: 'business',
    name: 'Business',
    price: 29.99,
    stripePrice: process.env.STRIPE_PRICE_BUSINESS || '',
    maxPlatforms: -1, // unlimited
    features: [
      'Everything in Pro',
      'Team collaboration',
      'API access',
      'Priority support',
      'Custom integrations',
    ],
  },
};

// Get pricing info
export const getPricing = async (req: Request, res: Response) => {
  res.json({
    plans: Object.values(PRICING),
  });
};

// Create checkout session
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { tier } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!tier || !['pro', 'business'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pricingPlan = PRICING[tier as keyof typeof PRICING];

    // Get or create Stripe customer
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || 'EarnTrack User',
      });
      customerId = customer.id;

      // Create subscription record if it doesn't exist
      if (!user.subscription) {
        await prisma.subscription.create({
          data: {
            userId,
            tier: 'free',
            stripeCustomerId: customerId,
          },
        });
      } else {
        await prisma.subscription.update({
          where: { userId },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: pricingPlan.stripePrice,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
    });

    res.json({ sessionId: session.id, clientSecret: session.client_secret });
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhook
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sig = req.headers['stripe-signature'];
    const body = req.body;

    if (!sig) {
      return res.status(400).json({ error: 'No signature' });
    }

    const event = stripe.webhooks.constructEvent(
      body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const userSub = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (userSub) {
          const priceId = (subscription.items.data[0].price.id as string) || '';
          let tier = 'free';

          if (priceId === process.env.STRIPE_PRICE_PRO) {
            tier = 'pro';
          } else if (priceId === process.env.STRIPE_PRICE_BUSINESS) {
            tier = 'business';
          }

          await prisma.subscription.update({
            where: { id: userSub.id },
            data: {
              tier,
              stripeSubId: subscription.id,
              status: subscription.status as string,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userSub = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (userSub) {
          await prisma.subscription.update({
            where: { id: userSub.id },
            data: {
              tier: 'free',
              status: 'cancelled',
              stripeSubId: null,
            },
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const userSub = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (userSub && invoice.payment_intent) {
          await prisma.payment.create({
            data: {
              userId: userSub.userId,
              subscriptionId: userSub.id,
              stripePaymentId: invoice.payment_intent as string,
              amount: (invoice.total / 100).toString(),
              currency: invoice.currency.toUpperCase(),
              status: 'succeeded',
              invoiceUrl: invoice.hosted_invoice_url || undefined,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const userSub = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (userSub) {
          await prisma.subscription.update({
            where: { id: userSub.id },
            data: { status: 'past_due' },
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
};

// Get user subscription
export const getSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Create default subscription if doesn't exist
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          tier: 'free',
        },
        include: {
          payments: true,
        },
      });
    }

    res.json(subscription);
  } catch (error) {
    next(error);
  }
};

// Upgrade/Downgrade subscription
export const updateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { tier } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.stripeSubId && ['pro', 'business'].includes(tier)) {
      const pricingPlan = PRICING[tier as keyof typeof PRICING];

      // Update Stripe subscription
      await stripe.subscriptions.update(subscription.stripeSubId, {
        items: [
          {
            id: subscription.stripeSubId,
            price: pricingPlan.stripePrice,
          },
        ],
      });
    }

    res.json({ message: 'Subscription updated' });
  } catch (error) {
    next(error);
  }
};

// Cancel subscription
export const cancelSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.stripeSubId) {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubId, {
        cancel_at_period_end: true,
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    }

    res.json({ message: 'Subscription cancelled at end of period' });
  } catch (error) {
    next(error);
  }
};

// Get customer portal
export const getCustomerPortal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
};
