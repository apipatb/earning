import { Router, Request, Response } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Notification Routes
 * Handles email sending and notification preferences
 */

// Public routes (no authentication required)
/**
 * POST /api/notifications/test-email
 * Send a test email
 */
router.post('/test-email', async (req: Request, res: Response) => {
  await NotificationController.testEmail(req, res);
});

/**
 * POST /api/notifications/send-password-reset
 * Send password reset email
 */
router.post('/send-password-reset', async (req: Request, res: Response) => {
  await NotificationController.sendPasswordReset(req, res);
});

// Protected routes (authentication required)
/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authMiddleware, async (req: Request, res: Response) => {
  await NotificationController.getEmailPreferences(req, res);
});

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', authMiddleware, async (req: Request, res: Response) => {
  await NotificationController.updateEmailPreferences(req, res);
});

/**
 * POST /api/notifications/resend-invoice
 * Resend an invoice email
 */
router.post('/resend-invoice', authMiddleware, async (req: Request, res: Response) => {
  await NotificationController.resendInvoice(req, res);
});

/**
 * POST /api/notifications/send-welcome
 * Send welcome email (for testing)
 */
router.post('/send-welcome', authMiddleware, async (req: Request, res: Response) => {
  await NotificationController.sendWelcome(req, res);
});

/**
 * POST /api/notifications/send-payment-confirmation
 * Send payment confirmation email
 */
router.post('/send-payment-confirmation', authMiddleware, async (req: Request, res: Response) => {
  await NotificationController.sendPaymentConfirmation(req, res);
});

/**
 * GET /api/notifications/status
 * Get mailer status (for debugging)
 */
router.get('/status', async (req: Request, res: Response) => {
  await NotificationController.getStatus(req, res);
});

export default router;
