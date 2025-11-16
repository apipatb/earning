import { Socket } from 'socket.io';
import { logInfo, logDebug, logError } from '../../lib/logger';
import { getIO } from '../ws';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  data?: Record<string, any>;
  dismissible?: boolean;
  duration?: number; // milliseconds
}

/**
 * Setup notifications namespace and event handlers
 */
export const setupNotificationEvents = (socket: Socket) => {
  const userId = socket.handshake.auth?.userId;

  if (!userId) {
    logDebug('User ID not found in socket auth, skipping notifications setup');
    return;
  }

  // Join user-specific notification room
  const userRoom = `notifications:${userId}`;
  socket.join(userRoom);

  logInfo('Socket joined notifications namespace', {
    socketId: socket.id,
    userId,
    room: userRoom,
  });

  // Handle notification subscribe
  socket.on('notifications:subscribe', () => {
    logDebug('Client subscribed to notifications', {
      socketId: socket.id,
      userId,
    });
  });

  // Handle notification unsubscribe
  socket.on('notifications:unsubscribe', () => {
    socket.leave(userRoom);
    logDebug('Client unsubscribed from notifications', {
      socketId: socket.id,
      userId,
    });
  });
};

/**
 * Send notification to a specific user
 */
export const sendUserNotification = (
  userId: string,
  notification: NotificationPayload
) => {
  try {
    const io = getIO();
    const room = `notifications:${userId}`;

    logInfo('Sending notification to user', {
      userId,
      notificationId: notification.id,
      type: notification.type,
      room,
    });

    io.to(room).emit('notification', {
      event: 'notification',
      timestamp: new Date().toISOString(),
      data: notification,
    });
  } catch (error) {
    logError('Failed to send notification', error, {
      userId,
      notificationId: notification.id,
    });
  }
};

/**
 * Send notification to multiple users
 */
export const sendMultipleUsersNotification = (
  userIds: string[],
  notification: NotificationPayload
) => {
  userIds.forEach((userId) => {
    sendUserNotification(userId, notification);
  });
};

/**
 * Broadcast notification to all connected users
 */
export const broadcastNotification = (notification: NotificationPayload) => {
  try {
    const io = getIO();

    logInfo('Broadcasting notification to all users', {
      notificationId: notification.id,
      type: notification.type,
    });

    io.emit('notification:broadcast', {
      event: 'notification:broadcast',
      timestamp: new Date().toISOString(),
      data: notification,
    });
  } catch (error) {
    logError('Failed to broadcast notification', error, {
      notificationId: notification.id,
    });
  }
};

/**
 * Create and send a success notification
 */
export const sendSuccessNotification = (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  const notification: NotificationPayload = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    type: 'success',
    timestamp: new Date().toISOString(),
    data,
    dismissible: true,
    duration: 5000,
  };

  sendUserNotification(userId, notification);
};

/**
 * Create and send an error notification
 */
export const sendErrorNotification = (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  const notification: NotificationPayload = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    type: 'error',
    timestamp: new Date().toISOString(),
    data,
    dismissible: true,
  };

  sendUserNotification(userId, notification);
};

/**
 * Create and send an info notification
 */
export const sendInfoNotification = (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  const notification: NotificationPayload = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    type: 'info',
    timestamp: new Date().toISOString(),
    data,
    dismissible: true,
    duration: 7000,
  };

  sendUserNotification(userId, notification);
};

/**
 * Create and send a warning notification
 */
export const sendWarningNotification = (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  const notification: NotificationPayload = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    type: 'warning',
    timestamp: new Date().toISOString(),
    data,
    dismissible: true,
  };

  sendUserNotification(userId, notification);
};
