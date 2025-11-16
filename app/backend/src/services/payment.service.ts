import { PrismaClient, PaymentMethodType } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Stripe (requires STRIPE_SECRET_KEY environment variable)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

interface ProcessPaymentInput {
  amount: number;
  paymentMethodId: string;
  description: string;
  metadata?: Record<string, any>;
}

interface CreatePaymentMethodInput {
  userId: string;
  type: PaymentMethodType;
  stripePaymentMethodId?: string;
  token?: string;
  isDefault?: boolean;
}

interface RefundInput {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

interface TaxCalculationInput {
  amount: number;
  country: string;
  state?: string;
  postalCode?: string;
}

class PaymentService {
  /**
   * Process a payment
   */
  async processPayment(input: ProcessPaymentInput) {
    const { amount, paymentMethodId, description, metadata } = input;

    // Get payment method from database
    const paymentMethod = await prisma.paymentMethodModel.findUnique({
      where: { id: paymentMethodId },
      include: { user: true },
    });

    if (!paymentMethod || !paymentMethod.isActive) {
      throw new Error('Invalid or inactive payment method');
    }

    try {
      // Create a payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: paymentMethod.user.currency.toLowerCase(),
        payment_method: paymentMethod.token,
        confirm: true,
        description,
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          amount: amount,
        };
      } else {
        throw new Error(`Payment failed with status: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error('[Payment] Error processing payment:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Payment processing failed'
      );
    }
  }

  /**
   * Create a payment method
   */
  async createPaymentMethod(input: CreatePaymentMethodInput) {
    const { userId, type, stripePaymentMethodId, token, isDefault } = input;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let paymentMethodData: any = {
      userId,
      type,
      token: token || '',
      isDefault: isDefault || false,
    };

    // If using Stripe payment method
    if (stripePaymentMethodId) {
      try {
        const stripePaymentMethod = await stripe.paymentMethods.retrieve(
          stripePaymentMethodId
        );

        // Attach to customer if not already
        if (!stripePaymentMethod.customer) {
          // Get or create Stripe customer
          const customer = await this.getOrCreateStripeCustomer(user);
          await stripe.paymentMethods.attach(stripePaymentMethodId, {
            customer: customer.id,
          });
        }

        paymentMethodData.token = stripePaymentMethodId;

        // Extract card details if it's a card
        if (stripePaymentMethod.type === 'card' && stripePaymentMethod.card) {
          paymentMethodData.last4 = stripePaymentMethod.card.last4;
          paymentMethodData.brand = stripePaymentMethod.card.brand;
          paymentMethodData.expiresAt = new Date(
            stripePaymentMethod.card.exp_year,
            stripePaymentMethod.card.exp_month - 1
          );
        }
      } catch (error) {
        console.error('[Payment] Error creating payment method:', error);
        throw new Error('Failed to create payment method with Stripe');
      }
    }

    // If setting as default, unset other default payment methods
    if (isDefault) {
      await prisma.paymentMethodModel.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.paymentMethodModel.create({
      data: paymentMethodData,
    });
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string) {
    const paymentMethod = await prisma.paymentMethodModel.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Detach from Stripe if it's a Stripe payment method
    if (paymentMethod.type === PaymentMethodType.CARD) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.token);
      } catch (error) {
        console.error('[Payment] Error detaching payment method from Stripe:', error);
      }
    }

    return prisma.paymentMethodModel.update({
      where: { id: paymentMethodId },
      data: { isActive: false },
    });
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await prisma.paymentMethodModel.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.userId !== userId) {
      throw new Error('Payment method not found or does not belong to user');
    }

    // Unset all other default payment methods
    await prisma.paymentMethodModel.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return prisma.paymentMethodModel.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });
  }

  /**
   * Process a refund
   */
  async processRefund(input: RefundInput) {
    const { paymentIntentId, amount, reason } = input;

    try {
      const refundData: any = {
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer',
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await stripe.refunds.create(refundData);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error) {
      console.error('[Payment] Error processing refund:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Refund processing failed'
      );
    }
  }

  /**
   * Generate an invoice
   */
  async generateInvoice(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: true,
        customer: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // In a real implementation, this would use a PDF generation library
    // For now, we'll return the invoice data
    return {
      invoice,
      pdfUrl: null, // Would be generated using PDFKit or similar
    };
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: true,
        customer: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (!invoice.customer?.email) {
      throw new Error('Customer email not found');
    }

    // In a real implementation, this would send an email with the invoice
    // You could use the email service here
    console.log(`[Payment] Sending invoice ${invoice.invoiceNumber} to ${invoice.customer.email}`);

    // Update invoice status to SENT
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT' },
    });
  }

  /**
   * Calculate tax for an amount
   */
  async calculateTax(input: TaxCalculationInput): Promise<number> {
    const { amount, country, state, postalCode } = input;

    // This is a simplified tax calculation
    // In production, you would use Stripe Tax API or a tax service
    const taxRates: Record<string, number> = {
      US: 0.08, // 8% average sales tax
      CA: 0.13, // 13% HST
      GB: 0.20, // 20% VAT
      EU: 0.21, // 21% average VAT
    };

    const taxRate = taxRates[country] || 0;
    return amount * taxRate;
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(billingId: string) {
    const billing = await prisma.billingHistory.findUnique({
      where: { id: billingId },
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

    if (!billing) {
      throw new Error('Billing record not found');
    }

    const paymentMethod = billing.subscription.user.paymentMethods[0];
    if (!paymentMethod) {
      throw new Error('No payment method available');
    }

    return this.processPayment({
      amount: parseFloat(billing.amount.toString()),
      paymentMethodId: paymentMethod.id,
      description: `Subscription payment retry`,
      metadata: {
        subscriptionId: billing.subscriptionId,
        billingId: billing.id,
      },
    });
  }

  /**
   * Get or create Stripe customer for a user
   */
  private async getOrCreateStripeCustomer(user: any) {
    // In a real implementation, you would store the Stripe customer ID
    // in the User model and retrieve it from there
    // For now, we'll search or create
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    return stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    });
  }

  /**
   * Create a setup intent for saving payment method
   */
  async createSetupIntent(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const customer = await this.getOrCreateStripeCustomer(user);

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
    });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    console.log(`[Payment] Received webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Payment] Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log(`[Payment] Payment succeeded: ${paymentIntent.id}`);
    // Update billing history or invoice status
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log(`[Payment] Payment failed: ${paymentIntent.id}`);
    // Update billing history and trigger retry logic
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log(`[Payment] Subscription updated: ${subscription.id}`);
    // Sync subscription status with local database
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log(`[Payment] Subscription deleted: ${subscription.id}`);
    // Mark subscription as cancelled
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log(`[Payment] Invoice payment succeeded: ${invoice.id}`);
    // Update invoice status to PAID
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    console.log(`[Payment] Invoice payment failed: ${invoice.id}`);
    // Update invoice status and trigger dunning
  }
}

export const paymentService = new PaymentService();
