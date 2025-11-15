import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create notification alert rule
export const createAlertRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const {
      name,
      description,
      condition,
      threshold,
      conditionType, // daily_earnings, milestone, threshold, inactivity
      channels, // email, push, sms, in_app
      isActive,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rule = await prisma.notificationRule.create({
      data: {
        userId,
        name,
        description,
        condition,
        threshold: threshold || 0,
        conditionType,
        channels: channels || ['in_app'],
        isActive: isActive !== false,
      },
    });

    res.status(201).json({
      message: 'Alert rule created',
      rule,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's alert rules
export const getAlertRules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rules = await prisma.notificationRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rules);
  } catch (error) {
    next(error);
  }
};

// Update alert rule
export const updateAlertRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { ruleId } = req.params;
    const { name, description, condition, threshold, channels, isActive } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rule = await prisma.notificationRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updated = await prisma.notificationRule.update({
      where: { id: ruleId },
      data: {
        name: name || rule.name,
        description: description || rule.description,
        condition: condition || rule.condition,
        threshold: threshold !== undefined ? threshold : rule.threshold,
        channels: channels || rule.channels,
        isActive: isActive !== undefined ? isActive : rule.isActive,
      },
    });

    res.json({
      message: 'Rule updated',
      rule: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Delete alert rule
export const deleteAlertRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { ruleId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rule = await prisma.notificationRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    await prisma.notificationRule.delete({ where: { id: ruleId } });

    res.json({ message: 'Rule deleted' });
  } catch (error) {
    next(error);
  }
};

// Send notification
export const sendNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { title, message, type, channels, data } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info', // info, warning, success, error
        channels: channels || ['in_app'],
        data: data || {},
        isRead: false,
      },
    });

    // Queue for sending (would integrate with actual notification services)
    // For now, just store in database

    res.status(201).json({
      message: 'Notification sent',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

// Get user notifications
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const where: any = { userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 50,
      skip: Number(offset) || 0,
    });

    const total = await prisma.notification.count({ where });
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({
      notifications,
      pagination: { total, limit: Number(limit) || 50, offset: Number(offset) || 0 },
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      message: 'Notification marked as read',
      notification: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all as read
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      message: `${result.count} notifications marked as read`,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id: notificationId } });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

// Notification preferences
export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    res.json(prefs);
  } catch (error) {
    next(error);
  }
};

// Update notification preferences
export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const {
      emailNotifications,
      pushNotifications,
      smsNotifications,
      quietHoursStart,
      quietHoursEnd,
      notifyOnEarnings,
      notifyOnGoals,
      notifyOnMilestones,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        emailNotifications,
        pushNotifications,
        smsNotifications,
        quietHoursStart,
        quietHoursEnd,
        notifyOnEarnings,
        notifyOnGoals,
        notifyOnMilestones,
      },
      create: {
        userId,
        emailNotifications: emailNotifications !== false,
        pushNotifications: pushNotifications !== false,
        smsNotifications: smsNotifications !== false,
        quietHoursStart: quietHoursStart || '22:00',
        quietHoursEnd: quietHoursEnd || '08:00',
        notifyOnEarnings: notifyOnEarnings !== false,
        notifyOnGoals: notifyOnGoals !== false,
        notifyOnMilestones: notifyOnMilestones !== false,
      },
    });

    res.json({
      message: 'Preferences updated',
      preferences: prefs,
    });
  } catch (error) {
    next(error);
  }
};

// Get notification stats
export const getNotificationStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const total = await prisma.notification.count({ where: { userId } });
    const unread = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    const byType = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: true,
    });

    const last7Days = await prisma.notification.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    res.json({
      total,
      unread,
      last7Days,
      byType: byType.map((b: any) => ({
        type: b.type,
        count: b._count,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Check alert conditions and send notifications
export const checkAndSendAlerts = async (userId: string, context: any) => {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: { userId, isActive: true },
    });

    for (const rule of rules) {
      let shouldNotify = false;

      // Check conditions
      switch (rule.conditionType) {
        case 'daily_earnings':
          if (context.dailyEarnings && context.dailyEarnings >= rule.threshold) {
            shouldNotify = true;
          }
          break;

        case 'milestone':
          if (context.totalEarnings && context.totalEarnings >= rule.threshold) {
            shouldNotify = true;
          }
          break;

        case 'inactivity':
          if (context.daysSinceEarning && context.daysSinceEarning >= rule.threshold) {
            shouldNotify = true;
          }
          break;
      }

      if (shouldNotify) {
        // Send notification
        await prisma.notification.create({
          data: {
            userId,
            title: rule.name,
            message: rule.description || '',
            type: 'info',
            channels: rule.channels,
            data: context,
            isRead: false,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error checking alerts:', error);
  }
};
