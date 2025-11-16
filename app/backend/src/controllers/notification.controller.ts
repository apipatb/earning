import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { z } from 'zod';

// Validation schemas
const SendTestEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  userName: z.string().optional(),
});

const UpdateEmailPreferencesSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  weeklyReportEnabled: z.boolean().optional(),
  invoiceNotificationEnabled: z.boolean().optional(),
  expenseAlertEnabled: z.boolean().optional(),
});

const ResendInvoiceSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  recipientEmail: z.string().email('Invalid email address'),
  recipientName: z.string().optional(),
});

export class NotificationController {
  /**
   * Send a test email
   * POST /api/notifications/test-email
   */
  static async testEmail(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = SendTestEmailSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request',
          details: validationResult.error.errors,
        });
        return;
      }

      const { email, userName = 'User' } = validationResult.data;

      // Send test email
      await NotificationService.sendTestEmail(email, userName);

      res.status(200).json({
        success: true,
        message: `Test email sent to ${email}`,
      });
    } catch (error) {
      logger.error('Error sending test email:', error);
      res.status(500).json({
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get user's email notification preferences
   * GET /api/notifications/preferences
   */
  static async getEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const preferences = await NotificationService.getUserNotificationPreferences(userId);

      if (!preferences) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        preferences,
      });
    } catch (error) {
      logger.error('Error fetching notification preferences:', error);
      res.status(500).json({
        error: 'Failed to fetch notification preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update user's email notification preferences
   * PUT /api/notifications/preferences
   */
  static async updateEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate request body
      const validationResult = UpdateEmailPreferencesSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request',
          details: validationResult.error.errors,
        });
        return;
      }

      const preferences = validationResult.data;

      // Update preferences
      const updatedUser = await NotificationService.updateUserNotificationPreferences(
        userId,
        preferences
      );

      res.status(200).json({
        success: true,
        message: 'Notification preferences updated',
        preferences: {
          emailNotificationsEnabled: updatedUser.emailNotificationsEnabled,
          weeklyReportEnabled: updatedUser.weeklyReportEnabled,
          invoiceNotificationEnabled: updatedUser.invoiceNotificationEnabled,
          expenseAlertEnabled: updatedUser.expenseAlertEnabled,
        },
      });
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({
        error: 'Failed to update notification preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Resend an invoice email
   * POST /api/notifications/resend-invoice
   */
  static async resendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate request body
      const validationResult = ResendInvoiceSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request',
          details: validationResult.error.errors,
        });
        return;
      }

      const { invoiceId, recipientEmail, recipientName } = validationResult.data;

      // Check if invoice belongs to user
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      if (invoice.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Send invoice email
      await NotificationService.sendInvoiceEmail(invoiceId, recipientEmail, recipientName);

      res.status(200).json({
        success: true,
        message: `Invoice email sent to ${recipientEmail}`,
      });
    } catch (error) {
      logger.error('Error resending invoice:', error);
      res.status(500).json({
        error: 'Failed to resend invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send welcome email (admin endpoint for testing)
   * POST /api/notifications/send-welcome
   */
  static async sendWelcome(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Send welcome email
      await NotificationService.sendWelcomeEmail(user);

      res.status(200).json({
        success: true,
        message: `Welcome email sent to ${user.email}`,
      });
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      res.status(500).json({
        error: 'Failed to send welcome email',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send password reset email
   * POST /api/notifications/send-password-reset
   */
  static async sendPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email, resetToken } = req.body;

      if (!email || !resetToken) {
        res.status(400).json({
          error: 'Email and reset token are required',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists for security
        res.status(200).json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent',
        });
        return;
      }

      // Send password reset email
      await NotificationService.sendPasswordReset(user, resetToken);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      res.status(500).json({
        error: 'Failed to send password reset email',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send payment confirmation email
   * POST /api/notifications/send-payment-confirmation
   */
  static async sendPaymentConfirmation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { invoiceId, recipientEmail } = req.body;

      if (!invoiceId || !recipientEmail) {
        res.status(400).json({
          error: 'Invoice ID and recipient email are required',
        });
        return;
      }

      // Check if invoice belongs to user
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      if (invoice.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Send payment confirmation email
      await NotificationService.sendPaymentConfirmation(invoiceId, recipientEmail);

      res.status(200).json({
        success: true,
        message: 'Payment confirmation email sent',
      });
    } catch (error) {
      logger.error('Error sending payment confirmation:', error);
      res.status(500).json({
        error: 'Failed to send payment confirmation',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get mailer status
   * GET /api/notifications/status
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { mailer } = await import('../lib/mailer');
      const status = mailer.getStatus();

      res.status(200).json({
        success: true,
        status,
      });
    } catch (error) {
      logger.error('Error getting mailer status:', error);
      res.status(500).json({
        error: 'Failed to get mailer status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default NotificationController;
