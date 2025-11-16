import { Request, Response, NextFunction } from 'express';
import PushNotificationService, { PushSubscriptionData } from '../services/push.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Push Notification Controller
 * Handles all push notification-related endpoints
 */
class PushNotificationController {
  /**
   * GET /api/v1/notifications/vapid-key
   * Get VAPID public key for push notifications
   */
  static async getVapidPublicKey(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const publicKey = PushNotificationService.getPublicKey();

      if (!publicKey) {
        res.status(500).json({
          success: false,
          message: 'VAPID keys not configured',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          publicKey,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/subscribe
   * Register a push subscription
   */
  static async subscribe(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { subscription } = req.body as { subscription: PushSubscriptionData };

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        res.status(400).json({
          success: false,
          message: 'Invalid subscription data',
        });
        return;
      }

      const userAgent = req.headers['user-agent'];
      const result = await PushNotificationService.registerSubscription(
        userId,
        subscription,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Push subscription registered successfully',
        data: {
          id: result.id,
          createdAt: result.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/notifications/unsubscribe
   * Unsubscribe from push notifications
   */
  static async unsubscribe(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { endpoint } = req.body as { endpoint: string };

      if (!endpoint) {
        res.status(400).json({
          success: false,
          message: 'Endpoint is required',
        });
        return;
      }

      await PushNotificationService.unsubscribe(userId, endpoint);

      res.json({
        success: true,
        message: 'Unsubscribed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications
   * Get user's notifications
   */
  static async getNotifications(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await PushNotificationService.getUserNotifications(userId, {
        limit,
        offset,
        unreadOnly,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count
   */
  static async getUnreadCount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const count = await PushNotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          count,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/notifications/:id/read
   * Mark a notification as read
   */
  static async markAsRead(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Notification ID is required',
        });
        return;
      }

      await PushNotificationService.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  static async markAllAsRead(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      await PushNotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/preferences
   * Get user's notification preferences
   */
  static async getPreferences(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const preferences = await PushNotificationService.getPreferences(userId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/notifications/preferences
   * Update notification preferences
   */
  static async updatePreferences(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { emailNotifs, pushNotifs, smsNotifs, preferences } = req.body;

      const result = await PushNotificationService.updatePreferences(userId, {
        emailNotifs,
        pushNotifs,
        smsNotifs,
        preferences,
      });

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/send
   * Send a test notification (admin/development only)
   */
  static async sendTestNotification(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { title, body, icon, badge, data } = req.body;

      if (!title || !body) {
        res.status(400).json({
          success: false,
          message: 'Title and body are required',
        });
        return;
      }

      await PushNotificationService.sendNotification(userId, {
        title,
        body,
        icon,
        badge,
        data,
      });

      res.json({
        success: true,
        message: 'Test notification sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/statistics
   * Get notification statistics
   */
  static async getStatistics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const stats = await PushNotificationService.getStatistics(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/notifications/cleanup
   * Clean up old notifications (admin only)
   */
  static async cleanupOldNotifications(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const daysToKeep = parseInt(req.query.days as string) || 30;
      const deletedCount = await PushNotificationService.cleanupOldNotifications(
        daysToKeep
      );

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old notifications`,
        data: {
          deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PushNotificationController;
