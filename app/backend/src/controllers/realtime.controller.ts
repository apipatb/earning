import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real-time Connection Management
export const initializeRealtimeConnection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { deviceId, deviceType } = req.body;

    const connection = await prisma.realtimeConnection.create({
      data: {
        userId,
        deviceId: deviceId || `device-${Date.now()}`,
        deviceType: deviceType || 'web',
        lastHeartbeat: new Date(),
        isActive: true,
      },
    });

    res.status(201).json(connection);
  } catch (error) {
    res.status(400).json({ error: 'Failed to initialize connection' });
  }
};

export const heartbeat = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).userId;

    const connection = await prisma.realtimeConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.userId !== userId) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const updated = await prisma.realtimeConnection.update({
      where: { id: connectionId },
      data: { lastHeartbeat: new Date() },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to send heartbeat' });
  }
};

export const closeConnection = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).userId;

    const connection = await prisma.realtimeConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.userId !== userId) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await prisma.realtimeConnection.update({
      where: { id: connectionId },
      data: { isActive: false, closedAt: new Date() },
    });

    res.json({ message: 'Connection closed' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to close connection' });
  }
};

// User Presence
export const setUserPresence = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, activity, lastSeen } = req.body;

    const presence = await prisma.userPresence.upsert({
      where: { userId },
      create: {
        userId,
        status: status || 'online',
        activity: activity || 'idle',
        lastSeen: new Date(),
        isOnline: status === 'online',
      },
      update: {
        status: status || undefined,
        activity: activity || undefined,
        lastSeen: new Date(),
        isOnline: status === 'online',
      },
    });

    res.json(presence);
  } catch (error) {
    res.status(400).json({ error: 'Failed to set presence' });
  }
};

export const getUserPresence = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const presence = await prisma.userPresence.findUnique({
      where: { userId },
    });

    if (!presence) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(presence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch presence' });
  }
};

export const getMultiplePresences = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    const presences = await prisma.userPresence.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    res.json(presences);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch presences' });
  }
};

// Real-time Alerts
export const createRealtimeAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type, title, message, metadata, priority } = req.body;

    const alert = await prisma.realtimeAlert.create({
      data: {
        userId,
        type, // earning, goal, platform, threshold, warning
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
        priority: priority || 'normal', // low, normal, high, critical
        isRead: false,
        isAcknowledged: false,
      },
    });

    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create alert' });
  }
};

export const getRealtimeAlerts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { unreadOnly, type, priority, limit = 50 } = req.query;

    const alerts = await prisma.realtimeAlert.findMany({
      where: {
        userId,
        ...(unreadOnly === 'true' && { isRead: false }),
        ...(type && { type: type as string }),
        ...(priority && { priority: priority as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const markAlertAsRead = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).userId;

    const alert = await prisma.realtimeAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.userId !== userId) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const updated = await prisma.realtimeAlert.update({
      where: { id: alertId },
      data: { isRead: true, readAt: new Date() },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to mark alert as read' });
  }
};

export const acknowledgeAlert = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).userId;

    const alert = await prisma.realtimeAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.userId !== userId) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const updated = await prisma.realtimeAlert.update({
      where: { id: alertId },
      data: { isAcknowledged: true, acknowledgedAt: new Date() },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to acknowledge alert' });
  }
};

// Live Data Synchronization
export const subscribeToDataUpdates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { dataType, resourceId } = req.body;

    const subscription = await prisma.dataSubscription.create({
      data: {
        userId,
        dataType, // earnings, goals, platforms, analytics
        resourceId: resourceId || null,
        isActive: true,
        lastUpdate: new Date(),
      },
    });

    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({ error: 'Failed to subscribe' });
  }
};

export const getDataSubscriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const subscriptions = await prisma.dataSubscription.findMany({
      where: { userId, isActive: true },
    });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

export const unsubscribeFromDataUpdates = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const userId = (req as any).userId;

    const subscription = await prisma.dataSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || subscription.userId !== userId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await prisma.dataSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: false },
    });

    res.json({ message: 'Unsubscribed from data updates' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to unsubscribe' });
  }
};

// Live Event Tracking
export const createLiveEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { eventType, data, broadcastToAll } = req.body;

    const event = await prisma.liveEvent.create({
      data: {
        userId,
        eventType,
        data: JSON.stringify(data),
        broadcastToAll: broadcastToAll || false,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create event' });
  }
};

export const getLiveEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { eventType, limit = 100, since } = req.query;

    const events = await prisma.liveEvent.findMany({
      where: {
        OR: [
          { userId },
          { broadcastToAll: true },
        ],
        ...(eventType && { eventType: eventType as string }),
        ...(since && { createdAt: { gte: new Date(since as string) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Notification Delivery Tracking
export const trackNotificationDelivery = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { notificationId, platform, status, metadata } = req.body;

    const tracking = await prisma.notificationDelivery.create({
      data: {
        userId,
        notificationId,
        platform, // push, email, sms, in-app
        status, // pending, sent, delivered, failed
        metadata: metadata ? JSON.stringify(metadata) : null,
        sentAt: new Date(),
      },
    });

    res.status(201).json(tracking);
  } catch (error) {
    res.status(400).json({ error: 'Failed to track delivery' });
  }
};

export const getNotificationDeliveryStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const stats = {
      totalSent: await prisma.notificationDelivery.count({
        where: { userId, sentAt: { gte: startDate } },
      }),
      delivered: await prisma.notificationDelivery.count({
        where: { userId, status: 'delivered', sentAt: { gte: startDate } },
      }),
      failed: await prisma.notificationDelivery.count({
        where: { userId, status: 'failed', sentAt: { gte: startDate } },
      }),
      byPlatform: await prisma.notificationDelivery.groupBy({
        by: ['platform'],
        where: { userId, sentAt: { gte: startDate } },
        _count: true,
      }),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery stats' });
  }
};

// Real-time Session Management
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const sessions = await prisma.realtimeConnection.findMany({
      where: {
        userId,
        isActive: true,
        lastHeartbeat: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const getRealtimeStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const stats = {
      activeConnections: await prisma.realtimeConnection.count({
        where: {
          userId,
          isActive: true,
          lastHeartbeat: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
      }),
      unreadAlerts: await prisma.realtimeAlert.count({
        where: { userId, isRead: false },
      }),
      criticalAlerts: await prisma.realtimeAlert.count({
        where: { userId, priority: 'critical', isAcknowledged: false },
      }),
      activeSubscriptions: await prisma.dataSubscription.count({
        where: { userId, isActive: true },
      }),
      totalEventsThisHour: await prisma.liveEvent.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      }),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch realtime stats' });
  }
};

export const clearOldConnections = async (req: Request, res: Response) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await prisma.realtimeConnection.updateMany({
      where: {
        isActive: true,
        lastHeartbeat: { lt: fiveMinutesAgo },
      },
      data: { isActive: false, closedAt: new Date() },
    });

    res.json({ updatedCount: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear old connections' });
  }
};
