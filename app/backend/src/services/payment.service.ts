import { PrismaClient, PaymentMethodType } from '@prisma/client';
import Stripe from 'stripe';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';

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

    try {
      logger.info('[Payment] Generating invoice PDF', { invoiceId, invoiceNumber: invoice.invoiceNumber });

      // Generate PDF and get file path
      const pdfPath = await this.generateInvoicePDF(invoice);

      // In production, you would upload this to S3 or similar storage
      // For now, we'll return the local file path
      const pdfUrl = `${process.env.APP_URL || 'http://localhost:3000'}/invoices/${path.basename(pdfPath)}`;

      logger.info('[Payment] Invoice PDF generated successfully', {
        invoiceId,
        pdfPath,
        pdfUrl,
      });

      return {
        invoice,
        pdfUrl,
        pdfPath, // Include path for email attachment
      };
    } catch (error) {
      logger.error('[Payment] Error generating invoice PDF', error instanceof Error ? error : new Error(String(error)), {
        invoiceId,
      });
      throw new Error('Failed to generate invoice PDF');
    }
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

    try {
      logger.info('[Payment] Sending invoice email', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerEmail: invoice.customer.email,
      });

      // Generate PDF
      const { pdfPath } = await this.generateInvoice(invoiceId);

      // Generate email content
      const emailHtml = this.generateInvoiceEmailHTML(invoice);
      const emailSubject = `Invoice ${invoice.invoiceNumber} from ${invoice.user.name || 'Your Service Provider'}`;

      // Send email with PDF attachment
      const transporter = EmailService['getTransporter']();

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: invoice.customer.email,
        subject: emailSubject,
        html: emailHtml,
        attachments: [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            path: pdfPath,
          },
        ],
      });

      logger.info('[Payment] Invoice email sent successfully', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerEmail: invoice.customer.email,
      });

      // Update invoice status to SENT
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'SENT' },
      });

      // Clean up PDF file after sending
      try {
        fs.unlinkSync(pdfPath);
        logger.debug('[Payment] Cleaned up temporary PDF file', { pdfPath });
      } catch (cleanupError) {
        logger.warn('[Payment] Failed to clean up PDF file', { pdfPath });
      }

      return updatedInvoice;
    } catch (error) {
      logger.error('[Payment] Error sending invoice email', error instanceof Error ? error : new Error(String(error)), {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerEmail: invoice.customer?.email,
      });
      throw new Error(
        error instanceof Error ? error.message : 'Failed to send invoice email'
      );
    }
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
   * Generate invoice PDF document
   */
  private async generateInvoicePDF(invoice: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create temp directory if it doesn't exist
        const tempDir = path.join(process.cwd(), 'temp', 'invoices');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Generate unique filename
        const filename = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
        const filePath = path.join(tempDir, filename);

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header with company info
        doc
          .fontSize(20)
          .fillColor('#667eea')
          .text('INVOICE', 50, 50, { align: 'left' });

        // Invoice number and dates (right aligned)
        doc
          .fontSize(10)
          .fillColor('#111827')
          .text(`Invoice #: ${invoice.invoiceNumber}`, 350, 50, { align: 'right' })
          .text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 350, 65, { align: 'right' })
          .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 350, 80, { align: 'right' });

        // Draw line separator
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(50, 110)
          .lineTo(550, 110)
          .stroke();

        // From section (Service Provider)
        doc
          .fontSize(12)
          .fillColor('#6b7280')
          .text('FROM:', 50, 130)
          .fontSize(11)
          .fillColor('#111827')
          .text(invoice.user.name || 'Service Provider', 50, 150)
          .fontSize(9)
          .fillColor('#6b7280')
          .text(invoice.user.email || '', 50, 165);

        // To section (Customer)
        doc
          .fontSize(12)
          .fillColor('#6b7280')
          .text('BILL TO:', 350, 130)
          .fontSize(11)
          .fillColor('#111827')
          .text(invoice.customer?.name || 'Customer', 350, 150)
          .fontSize(9)
          .fillColor('#6b7280')
          .text(invoice.customer?.email || '', 350, 165);

        // Line items table
        let yPosition = 220;

        // Table header
        doc
          .fontSize(10)
          .fillColor('#ffffff')
          .rect(50, yPosition, 500, 25)
          .fillAndStroke('#667eea', '#667eea');

        doc
          .fillColor('#ffffff')
          .text('Description', 60, yPosition + 8, { width: 230 })
          .text('Qty', 300, yPosition + 8, { width: 50 })
          .text('Unit Price', 360, yPosition + 8, { width: 80 })
          .text('Total', 450, yPosition + 8, { width: 90, align: 'right' });

        yPosition += 25;

        // Table rows
        doc.fillColor('#111827');
        invoice.lineItems.forEach((item: any, index: number) => {
          const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';

          doc
            .rect(50, yPosition, 500, 30)
            .fillAndStroke(bgColor, bgColor);

          doc
            .fontSize(9)
            .fillColor('#111827')
            .text(item.description, 60, yPosition + 10, { width: 230 })
            .text(Number(item.quantity).toFixed(2), 300, yPosition + 10, { width: 50 })
            .text(`${invoice.user.currency} ${Number(item.unitPrice).toFixed(2)}`, 360, yPosition + 10, { width: 80 })
            .text(`${invoice.user.currency} ${Number(item.totalPrice).toFixed(2)}`, 450, yPosition + 10, { width: 90, align: 'right' });

          yPosition += 30;
        });

        // Totals section
        yPosition += 20;

        const totals = [
          { label: 'Subtotal', amount: invoice.subtotal },
          { label: 'Tax', amount: invoice.taxAmount },
          { label: 'Discount', amount: invoice.discountAmount },
        ];

        totals.forEach(({ label, amount }) => {
          doc
            .fontSize(10)
            .fillColor('#6b7280')
            .text(label, 350, yPosition, { width: 100, align: 'right' })
            .fillColor('#111827')
            .text(`${invoice.user.currency} ${Number(amount).toFixed(2)}`, 450, yPosition, { width: 90, align: 'right' });
          yPosition += 20;
        });

        // Total amount (highlighted)
        doc
          .fontSize(12)
          .fillColor('#111827')
          .rect(350, yPosition, 200, 35)
          .fillAndStroke('#f0f9ff', '#3b82f6')
          .fillColor('#1e40af')
          .font('Helvetica-Bold')
          .text('TOTAL', 360, yPosition + 10, { width: 100, align: 'right' })
          .text(`${invoice.user.currency} ${Number(invoice.totalAmount).toFixed(2)}`, 450, yPosition + 10, { width: 90, align: 'right' });

        // Footer
        yPosition += 80;
        doc
          .fontSize(9)
          .fillColor('#6b7280')
          .font('Helvetica')
          .text(
            'Thank you for your business!',
            50,
            yPosition,
            { align: 'center', width: 500 }
          )
          .text(
            `Invoice generated on ${new Date().toLocaleDateString()}`,
            50,
            yPosition + 20,
            { align: 'center', width: 500 }
          );

        // Payment status badge
        if (invoice.status === 'PAID' || invoice.paidDate) {
          doc
            .fontSize(30)
            .fillColor('#10b981')
            .opacity(0.3)
            .text('PAID', 200, 400, { align: 'center', width: 200 })
            .opacity(1);
        }

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate invoice email HTML template
   */
  private generateInvoiceEmailHTML(invoice: any): string {
    const currency = invoice.user.currency || 'USD';
    const totalAmount = Number(invoice.totalAmount).toFixed(2);
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Invoice</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">#${invoice.invoiceNumber}</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Dear ${invoice.customer?.name || 'Customer'},
      </p>

      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        Thank you for your business. Please find attached your invoice for the services provided.
      </p>

      <!-- Invoice Summary -->
      <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Invoice Number:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 600; text-align: right;">
              ${invoice.invoiceNumber}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Invoice Date:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">
              ${new Date(invoice.invoiceDate).toLocaleDateString()}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Due Date:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">
              ${dueDate}
            </td>
          </tr>
          <tr style="border-top: 2px solid #e5e7eb;">
            <td style="padding: 15px 0 0 0; color: #6b7280; font-size: 16px; font-weight: 600;">Total Amount:</td>
            <td style="padding: 15px 0 0 0; color: #3b82f6; font-weight: 700; font-size: 24px; text-align: right;">
              ${currency} ${totalAmount}
            </td>
          </tr>
        </table>
      </div>

      <!-- Line Items Summary -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111827; font-size: 16px; margin-bottom: 15px;">Items:</h3>
        ${invoice.lineItems.map((item: any) => `
          <div style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #374151; font-size: 14px;">${item.description}</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${currency} ${Number(item.totalPrice).toFixed(2)}</span>
            </div>
            <div style="color: #9ca3af; font-size: 12px; margin-top: 5px;">
              Qty: ${Number(item.quantity).toFixed(2)} × ${currency} ${Number(item.unitPrice).toFixed(2)}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Payment Instructions -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">Payment Instructions</p>
        <p style="color: #78350f; font-size: 13px; margin: 10px 0 0 0;">
          Please make payment by ${dueDate}. The invoice is attached to this email as a PDF.
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        If you have any questions about this invoice, please don't hesitate to contact us.
      </p>

      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
        Best regards,<br>
        <strong style="color: #111827;">${invoice.user.name || 'Your Service Provider'}</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>© ${new Date().getFullYear()} ${invoice.user.name || 'Your Service Provider'}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get or create Stripe customer for a user
   */
  private async getOrCreateStripeCustomer(user: any) {
    // Check if user already has a Stripe customer ID stored
    if (user.stripeCustomerId) {
      try {
        // Retrieve existing customer from Stripe
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);

        // Verify customer hasn't been deleted
        if (!customer.deleted) {
          logger.debug('[Payment] Retrieved existing Stripe customer', {
            userId: user.id,
            stripeCustomerId: user.stripeCustomerId,
          });
          return customer;
        }

        // If customer was deleted in Stripe, clear the stored ID
        logger.warn('[Payment] Stripe customer was deleted, clearing stored ID', {
          userId: user.id,
          stripeCustomerId: user.stripeCustomerId,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: null },
        });
      } catch (error) {
        logger.error('[Payment] Error retrieving Stripe customer', error instanceof Error ? error : new Error(String(error)), {
          userId: user.id,
          stripeCustomerId: user.stripeCustomerId,
        });

        // If customer not found in Stripe, clear the stored ID
        if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: null },
          });
        } else {
          throw new Error('Failed to retrieve Stripe customer');
        }
      }
    }

    // Search for existing customer by email
    try {
      logger.debug('[Payment] Searching for existing Stripe customer by email', {
        userId: user.id,
        email: user.email,
      });

      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        const customer = customers.data[0];

        logger.info('[Payment] Found existing Stripe customer, storing ID', {
          userId: user.id,
          stripeCustomerId: customer.id,
        });

        // Store the customer ID in the database
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customer.id },
        });

        return customer;
      }
    } catch (error) {
      logger.error('[Payment] Error searching for Stripe customer', error instanceof Error ? error : new Error(String(error)), {
        userId: user.id,
      });
      throw new Error('Failed to search for existing Stripe customer');
    }

    // Create new customer
    try {
      logger.info('[Payment] Creating new Stripe customer', {
        userId: user.id,
        email: user.email,
      });

      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });

      logger.info('[Payment] Stripe customer created successfully, storing ID', {
        userId: user.id,
        stripeCustomerId: customer.id,
      });

      // Store the customer ID in the database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });

      return customer;
    } catch (error) {
      logger.error('[Payment] Error creating Stripe customer', error instanceof Error ? error : new Error(String(error)), {
        userId: user.id,
      });
      throw new Error('Failed to create Stripe customer');
    }
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
