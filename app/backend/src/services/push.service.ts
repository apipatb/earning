import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

// Configure web-push with VAPID keys
// In production, these should be stored in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@earntrack.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface NotificationPreferences {
  newTickets?: boolean;
  newMessages?: boolean;
  slaBreaches?: boolean;
  assignedTasks?: boolean;
  ticketUpdates?: boolean;
  systemAlerts?: boolean;
}

class PushNotificationService {
  /**
   * Generate VAPID keys for Web Push
   * This should be run once during setup
   */
  static generateVAPIDKeys(): { publicKey: string; privateKey: string } {
    const vapidKeys = webpush.generateVAPIDKeys();
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    };
  }

  /**
   * Get VAPID public key
   */
  static getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Register a new push subscription
   */
  static async registerSubscription(
    userId: string,
    subscription: PushSubscriptionData,
    userAgent?: string
  ): Promise<any> {
    try {
      // Extract browser info from user agent
      const browser = this.extractBrowserFromUserAgent(userAgent || '');

      // Check if subscription already exists
      const existing = await prisma.pushSubscription.findFirst({
        where: {
          userId,
          endpoint: subscription.endpoint,
        },
      });

      if (existing) {
        // Update existing subscription
        return await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            auth: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
            userAgent,
            browser,
            isActive: true,
            updatedAt: new Date(),
          },
        });
      }

      // Create new subscription
      return await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          userAgent,
          browser,
          isActive: true,
        },
      });
    } catch (error) {
      console.error('Error registering push subscription:', error);
      throw new Error('Failed to register push subscription');
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribe(userId: string, endpoint: string): Promise<void> {
    try {
      await prisma.pushSubscription.updateMany({
        where: {
          userId,
          endpoint,
        },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      throw new Error('Failed to unsubscribe');
    }
  }

  /**
   * Send push notification to a user
   */
  static async sendNotification(
    userId: string,
    notification: NotificationPayload
  ): Promise<void> {
    try {
      // Check user's notification preferences
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      // If push notifications are disabled, skip
      if (preferences && !preferences.pushNotifs) {
        console.log(`Push notifications disabled for user ${userId}`);
        return;
      }

      // Get all active subscriptions for the user
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (subscriptions.length === 0) {
        console.log(`No active subscriptions for user ${userId}`);
        return;
      }

      // Store notification in database
      await prisma.pushNotification.create({
        data: {
          userId,
          title: notification.title,
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          data: notification.data ? JSON.stringify(notification.data) : null,
        },
      });

      // Send to all subscriptions
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notification)
          );
        } catch (error: any) {
          // If subscription is invalid, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { isActive: false },
            });
          }
          console.error(`Failed to send notification to subscription ${sub.id}:`, error);
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw new Error('Failed to send push notification');
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendBatchNotifications(
    userIds: string[],
    notification: NotificationPayload
  ): Promise<void> {
    const sendPromises = userIds.map((userId) =>
      this.sendNotification(userId, notification)
    );
    await Promise.allSettled(sendPromises);
  }

  /**
   * Send notification using a template
   */
  static async sendTemplateNotification(
    userId: string,
    template: string,
    variables: Record<string, any>
  ): Promise<void> {
    const notification = this.renderTemplate(template, variables);
    await this.sendNotification(userId, notification);
  }

  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<any> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    const where: any = { userId };
    if (unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total] = await Promise.all([
      prisma.pushNotification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.pushNotification.count({ where }),
    ]);

    return {
      notifications,
      total,
      limit,
      offset,
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.pushNotification.updateMany({
      where: {
        id: notificationId,
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.pushNotification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await prisma.pushNotification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  /**
   * Get user's notification preferences
   */
  static async getPreferences(userId: string): Promise<any> {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          emailNotifs: true,
          pushNotifs: true,
          smsNotifs: false,
          preferences: JSON.stringify({
            newTickets: true,
            newMessages: true,
            slaBreaches: true,
            assignedTasks: true,
            ticketUpdates: true,
            systemAlerts: true,
          }),
        },
      });
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: {
      emailNotifs?: boolean;
      pushNotifs?: boolean;
      smsNotifs?: boolean;
      preferences?: NotificationPreferences;
    }
  ): Promise<any> {
    const data: any = {};

    if (preferences.emailNotifs !== undefined) {
      data.emailNotifs = preferences.emailNotifs;
    }
    if (preferences.pushNotifs !== undefined) {
      data.pushNotifs = preferences.pushNotifs;
    }
    if (preferences.smsNotifs !== undefined) {
      data.smsNotifs = preferences.smsNotifs;
    }
    if (preferences.preferences) {
      data.preferences = JSON.stringify(preferences.preferences);
    }

    return await prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  /**
   * Trigger notification for new ticket
   */
  static async notifyNewTicket(
    userId: string,
    ticketId: string,
    ticketSubject: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: 'New Support Ticket',
      body: ticketSubject,
      icon: '/icons/ticket.png',
      badge: '/icons/badge.png',
      data: {
        type: 'new_ticket',
        ticketId,
        url: `/tickets/${ticketId}`,
      },
      tag: `ticket-${ticketId}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Ticket' },
        { action: 'close', title: 'Dismiss' },
      ],
    };

    await this.sendNotification(userId, notification);
  }

  /**
   * Trigger notification for new message
   */
  static async notifyNewMessage(
    userId: string,
    ticketId: string,
    message: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: 'New Message',
      body: message.substring(0, 100),
      icon: '/icons/message.png',
      badge: '/icons/badge.png',
      data: {
        type: 'new_message',
        ticketId,
        url: `/tickets/${ticketId}`,
      },
      tag: `message-${ticketId}`,
    };

    await this.sendNotification(userId, notification);
  }

  /**
   * Trigger notification for SLA breach
   */
  static async notifySLABreach(
    userId: string,
    ticketId: string,
    ticketSubject: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: 'SLA Breach Alert',
      body: `Ticket "${ticketSubject}" has breached SLA`,
      icon: '/icons/alert.png',
      badge: '/icons/badge.png',
      data: {
        type: 'sla_breach',
        ticketId,
        url: `/tickets/${ticketId}`,
      },
      tag: `sla-${ticketId}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Ticket' },
        { action: 'close', title: 'Dismiss' },
      ],
    };

    await this.sendNotification(userId, notification);
  }

  /**
   * Trigger notification for assigned task
   */
  static async notifyAssignedTask(
    userId: string,
    ticketId: string,
    ticketSubject: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: 'Task Assigned',
      body: `You have been assigned: ${ticketSubject}`,
      icon: '/icons/assignment.png',
      badge: '/icons/badge.png',
      data: {
        type: 'assigned_task',
        ticketId,
        url: `/tickets/${ticketId}`,
      },
      tag: `assigned-${ticketId}`,
      actions: [
        { action: 'view', title: 'View Ticket' },
        { action: 'close', title: 'Dismiss' },
      ],
    };

    await this.sendNotification(userId, notification);
  }

  /**
   * Render notification template with variables
   */
  private static renderTemplate(
    template: string,
    variables: Record<string, any>
  ): NotificationPayload {
    // Simple template rendering
    // In production, use a proper template engine
    let title = template;
    let body = '';

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, variables[key]);
      body = body.replace(regex, variables[key]);
    });

    return {
      title,
      body,
      data: variables,
    };
  }

  /**
   * Extract browser name from user agent
   */
  private static extractBrowserFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.pushNotification.deleteMany({
      where: {
        sentAt: {
          lt: cutoffDate,
        },
        readAt: {
          not: null,
        },
      },
    });

    return result.count;
  }

  /**
   * Get notification statistics
   */
  static async getStatistics(userId: string): Promise<any> {
    const [total, unread, todayCount, subscriptionCount] = await Promise.all([
      prisma.pushNotification.count({ where: { userId } }),
      prisma.pushNotification.count({ where: { userId, readAt: null } }),
      prisma.pushNotification.count({
        where: {
          userId,
          sentAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.pushSubscription.count({ where: { userId, isActive: true } }),
    ]);

    return {
      total,
      unread,
      todayCount,
      subscriptionCount,
    };
  }
}

export default PushNotificationService;
