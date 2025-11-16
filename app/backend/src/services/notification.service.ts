import { mailer } from '../lib/mailer';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

// Type definitions - these are used for function parameters
type User = any;
type Invoice = any;
type Expense = any;
type InvoiceLineItem = any;

interface WelcomeEmailData {
  name: string;
  email: string;
  verificationLink?: string;
}

interface InvoiceEmailData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  invoiceDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
  }>;
  notes?: string;
  senderName?: string;
  senderEmail?: string;
}

interface PaymentConfirmationData {
  invoiceNumber: string;
  customerName: string;
  totalAmount: string;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

interface ExpenseAlertData {
  category: string;
  amount: string;
  description: string;
  date: string;
  threshold?: string;
  userName?: string;
}

interface WeeklySummaryData {
  userName: string;
  weekStartDate: string;
  weekEndDate: string;
  totalEarnings: string;
  totalExpenses: string;
  netIncome: string;
  topPlatform?: string;
  topPlatformEarnings?: string;
  goalProgress?: string;
  summaryDetails?: Array<{
    platform: string;
    earnings: string;
  }>;
}

interface PasswordResetData {
  userName: string;
  resetLink: string;
  expiryTime?: string;
  supportEmail?: string;
}

export class NotificationService {
  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(user: User, verificationLink?: string): Promise<void> {
    try {
      const emailData: WelcomeEmailData = {
        name: user.name || user.email,
        email: user.email,
        verificationLink,
      };

      await mailer.sendEmail({
        to: user.email,
        subject: 'Welcome to EarnTrack!',
        template: 'welcome',
        context: emailData,
      });

      logger.info(`Welcome email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Send invoice email with PDF attachment
   */
  static async sendInvoiceEmail(
    invoiceId: string,
    recipientEmail: string,
    recipientName?: string
  ): Promise<void> {
    try {
      // Fetch invoice with related data
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          lineItems: true,
          user: true,
        },
      });

      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      // Prepare email data
      const emailData: InvoiceEmailData = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: recipientName || invoice.customer?.name || 'Customer',
        customerEmail: recipientEmail,
        subtotal: invoice.subtotal.toString(),
        taxAmount: invoice.taxAmount.toString(),
        discountAmount: invoice.discountAmount.toString(),
        totalAmount: invoice.totalAmount.toString(),
        invoiceDate: invoice.invoiceDate.toLocaleDateString(),
        dueDate: invoice.dueDate.toLocaleDateString(),
        items: invoice.lineItems.map((item: InvoiceLineItem) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
        })),
        notes: invoice.notes || undefined,
        senderName: invoice.user?.name,
        senderEmail: invoice.user?.email,
      };

      await mailer.sendEmail({
        to: recipientEmail,
        subject: `Invoice ${invoice.invoiceNumber} from ${invoice.user?.name || 'EarnTrack'}`,
        template: 'invoice',
        context: emailData,
      });

      // Update invoice status to 'sent'
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'sent' },
      });

      logger.info(`Invoice email sent for ${invoice.invoiceNumber} to ${recipientEmail}`);
    } catch (error) {
      logger.error(`Failed to send invoice email:`, error);
      throw error;
    }
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmation(
    invoiceId: string,
    recipientEmail: string
  ): Promise<void> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true, user: true },
      });

      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      const emailData: PaymentConfirmationData = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer?.name || 'Customer',
        totalAmount: invoice.totalAmount.toString(),
        paymentDate: invoice.paidDate ? invoice.paidDate.toLocaleDateString() : new Date().toLocaleDateString(),
        paymentMethod: invoice.paymentMethod || undefined,
        notes: invoice.notes || undefined,
      };

      await mailer.sendEmail({
        to: recipientEmail,
        subject: `Payment Confirmation - Invoice ${invoice.invoiceNumber}`,
        template: 'payment-confirmation',
        context: emailData,
      });

      logger.info(`Payment confirmation email sent for ${invoice.invoiceNumber} to ${recipientEmail}`);
    } catch (error) {
      logger.error(`Failed to send payment confirmation email:`, error);
      throw error;
    }
  }

  /**
   * Send high expense alert email
   */
  static async sendExpenseAlert(
    userId: string,
    expense: Expense,
    threshold?: number
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Check if user has enabled expense alerts
      const userPreferences = await this.getUserNotificationPreferences(userId);
      if (!userPreferences?.expenseAlertEnabled) {
        logger.info(`Expense alerts disabled for user ${userId}`);
        return;
      }

      const emailData: ExpenseAlertData = {
        category: expense.category,
        amount: expense.amount.toString(),
        description: expense.description,
        date: expense.expenseDate.toLocaleDateString(),
        threshold: threshold ? `$${threshold}` : undefined,
        userName: user.name || user.email,
      };

      await mailer.sendEmail({
        to: user.email,
        subject: `High Expense Alert: ${expense.category}`,
        template: 'expense-alert',
        context: emailData,
      });

      logger.info(`Expense alert sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send expense alert:`, error);
      throw error;
    }
  }

  /**
   * Send weekly summary report
   */
  static async sendWeeklySummary(userId: string, summaryData: WeeklySummaryData): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Check if user has enabled weekly reports
      const userPreferences = await this.getUserNotificationPreferences(userId);
      if (!userPreferences?.weeklyReportEnabled) {
        logger.info(`Weekly reports disabled for user ${userId}`);
        return;
      }

      const emailData: WeeklySummaryData = {
        ...summaryData,
        userName: user.name || user.email,
      };

      await mailer.sendEmail({
        to: user.email,
        subject: `Your Weekly EarnTrack Summary - ${summaryData.weekStartDate} to ${summaryData.weekEndDate}`,
        template: 'weekly-summary',
        context: emailData,
      });

      logger.info(`Weekly summary sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send weekly summary:`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(
    user: User,
    resetToken: string,
    resetTokenExpiry?: Date
  ): Promise<void> {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const expiryTime = resetTokenExpiry ? resetTokenExpiry.toLocaleTimeString() : '1 hour';

      const emailData: PasswordResetData = {
        userName: user.name || user.email,
        resetLink,
        expiryTime,
        supportEmail: process.env.SUPPORT_EMAIL,
      };

      await mailer.sendEmail({
        to: user.email,
        subject: 'Reset Your EarnTrack Password',
        template: 'password-reset',
        context: emailData,
      });

      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Send test email (for testing purposes)
   */
  static async sendTestEmail(toEmail: string, userName: string = 'User'): Promise<void> {
    try {
      const testData = {
        userName,
        message: 'This is a test email from your EarnTrack notification system.',
        timestamp: new Date().toLocaleString(),
      };

      await mailer.sendRawEmail(
        toEmail,
        'Test Email from EarnTrack',
        `
        <html>
          <body>
            <h1>Test Email</h1>
            <p>Hi ${userName},</p>
            <p>${testData.message}</p>
            <p><em>Sent at: ${testData.timestamp}</em></p>
            <p>If you received this email, your notification system is working correctly!</p>
          </body>
        </html>
        `
      );

      logger.info(`Test email sent to ${toEmail}`);
    } catch (error) {
      logger.error(`Failed to send test email to ${toEmail}:`, error);
      throw error;
    }
  }

  /**
   * Get or create user notification preferences
   */
  static async getUserNotificationPreferences(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          emailNotificationsEnabled: true,
          weeklyReportEnabled: true,
          invoiceNotificationEnabled: true,
          expenseAlertEnabled: true,
        },
      });
      return user;
    } catch (error) {
      logger.error(`Failed to get notification preferences for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserNotificationPreferences(
    userId: string,
    preferences: {
      emailNotificationsEnabled?: boolean;
      weeklyReportEnabled?: boolean;
      invoiceNotificationEnabled?: boolean;
      expenseAlertEnabled?: boolean;
    }
  ) {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          emailNotificationsEnabled: preferences.emailNotificationsEnabled,
          weeklyReportEnabled: preferences.weeklyReportEnabled,
          invoiceNotificationEnabled: preferences.invoiceNotificationEnabled,
          expenseAlertEnabled: preferences.expenseAlertEnabled,
        },
      });
      logger.info(`Notification preferences updated for user ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Failed to update notification preferences for user ${userId}:`, error);
      throw error;
    }
  }
}

export default NotificationService;
