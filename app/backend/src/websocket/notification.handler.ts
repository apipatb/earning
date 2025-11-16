import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import PushNotificationService from '../services/push.service';
import { verifyToken } from '../utils/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

/**
 * Initialize notification WebSocket handlers
 * Namespace: /notifications
 */
export function initializeNotificationHandlers(io: SocketIOServer): void {
  const notificationNamespace = io.of('/notifications');

  // Middleware for authentication
  notificationNamespace.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Get authentication token from handshake
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('WebSocket connection attempt without token', {
          socketId: socket.id,
        });
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token and extract user information
      const decoded = verifyToken(token);

      if (!decoded) {
        logger.warn('WebSocket connection with invalid token', {
          socketId: socket.id,
        });
        return next(new Error('Invalid or expired authentication token'));
      }

      // Extract user information from verified token
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;

      logger.info('User authenticated on notification WebSocket', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      logger.error('WebSocket authentication error', {
        error: error instanceof Error ? error.message : String(error),
        socketId: socket.id,
      });
      next(new Error('Authentication failed'));
    }
  });

  // Handle connection
  notificationNamespace.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info('User connected to notifications', {
      userId,
      socketId: socket.id,
    });

    // Join user's personal notification room
    socket.join(`user:${userId}`);

    // Send current unread count on connection
    try {
      const unreadCount = await PushNotificationService.getUnreadCount(userId);
      socket.emit('unread_count', { count: unreadCount });
    } catch (error) {
      logger.error('Error fetching unread count', { error, userId });
    }

    // Handle request for notifications
    socket.on('get_notifications', async (data: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
      try {
        const result = await PushNotificationService.getUserNotifications(userId, {
          limit: data.limit || 50,
          offset: data.offset || 0,
          unreadOnly: data.unreadOnly || false,
        });

        socket.emit('notifications', result);
      } catch (error) {
        logger.error('Error fetching notifications', { error, userId });
        socket.emit('error', { message: 'Failed to fetch notifications' });
      }
    });

    // Handle mark as read
    socket.on('mark_as_read', async (data: { notificationId: string }) => {
      try {
        await PushNotificationService.markAsRead(data.notificationId, userId);

        // Send updated unread count
        const unreadCount = await PushNotificationService.getUnreadCount(userId);
        socket.emit('unread_count', { count: unreadCount });
        socket.emit('notification_read', { notificationId: data.notificationId });
      } catch (error) {
        logger.error('Error marking notification as read', { error, userId, notificationId: data.notificationId });
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Handle mark all as read
    socket.on('mark_all_as_read', async () => {
      try {
        await PushNotificationService.markAllAsRead(userId);

        // Send updated unread count
        const unreadCount = await PushNotificationService.getUnreadCount(userId);
        socket.emit('unread_count', { count: unreadCount });
        socket.emit('all_notifications_read');
      } catch (error) {
        logger.error('Error marking all notifications as read', { error, userId });
        socket.emit('error', { message: 'Failed to mark all notifications as read' });
      }
    });

    // Handle get statistics
    socket.on('get_statistics', async () => {
      try {
        const stats = await PushNotificationService.getStatistics(userId);
        socket.emit('statistics', stats);
      } catch (error) {
        logger.error('Error fetching notification statistics', { error, userId });
        socket.emit('error', { message: 'Failed to fetch statistics' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('User disconnected from notifications', {
        userId,
        socketId: socket.id,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('WebSocket error', { error, userId, socketId: socket.id });
    });
  });

  logger.info('Notification WebSocket handlers initialized', {
    namespace: '/notifications',
  });
}

/**
 * Send notification to user via WebSocket
 */
export async function sendNotificationViaWebSocket(
  io: SocketIOServer,
  userId: string,
  notification: {
    id: string;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    sentAt: Date;
  }
): Promise<void> {
  try {
    const notificationNamespace = io.of('/notifications');

    // Send notification to user's room
    notificationNamespace.to(`user:${userId}`).emit('notification_received', notification);

    // Send updated unread count
    const unreadCount = await PushNotificationService.getUnreadCount(userId);
    notificationNamespace.to(`user:${userId}`).emit('unread_count', { count: unreadCount });

    logger.info('Notification sent via WebSocket', {
      userId,
      notificationId: notification.id,
      title: notification.title,
    });
  } catch (error) {
    logger.error('Error sending notification via WebSocket', { error, userId });
  }
}

/**
 * Broadcast notification to multiple users
 */
export async function broadcastNotification(
  io: SocketIOServer,
  userIds: string[],
  notification: {
    id: string;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    sentAt: Date;
  }
): Promise<void> {
  const sendPromises = userIds.map((userId) =>
    sendNotificationViaWebSocket(io, userId, notification)
  );
  await Promise.allSettled(sendPromises);
}

/**
 * Send notification to all connected users
 */
export async function broadcastToAll(
  io: SocketIOServer,
  notification: {
    id: string;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    sentAt: Date;
  }
): Promise<void> {
  try {
    const notificationNamespace = io.of('/notifications');
    notificationNamespace.emit('notification_received', notification);

    logger.info('Notification broadcasted to all users', {
      notificationId: notification.id,
      title: notification.title,
    });
  } catch (error) {
    logger.error('Error broadcasting notification to all users', { error });
  }
}

/**
 * Send unread count update to user
 */
export async function sendUnreadCountUpdate(
  io: SocketIOServer,
  userId: string
): Promise<void> {
  try {
    const notificationNamespace = io.of('/notifications');
    const unreadCount = await PushNotificationService.getUnreadCount(userId);

    notificationNamespace.to(`user:${userId}`).emit('unread_count', { count: unreadCount });
  } catch (error) {
    logger.error('Error sending unread count update', { error, userId });
  }
}
