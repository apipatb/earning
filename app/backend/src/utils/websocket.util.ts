import { logDebug, logError } from '../lib/logger';
import { getIO } from '../websocket/ws';

/**
 * Utility functions for emitting WebSocket events from controllers and services
 */

/**
 * Emit an event to a specific user
 */
export const emitToUser = (userId: string, event: string, data: any) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(event, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });

    logDebug('Event emitted to user', {
      userId,
      event,
    });
  } catch (error) {
    logError('Failed to emit event to user', error, {
      userId,
      event,
    });
  }
};

/**
 * Emit an event to a specific room
 */
export const emitToRoom = (room: string, event: string, data: any) => {
  try {
    const io = getIO();
    io.to(room).emit(event, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });

    logDebug('Event emitted to room', {
      room,
      event,
    });
  } catch (error) {
    logError('Failed to emit event to room', error, {
      room,
      event,
    });
  }
};

/**
 * Broadcast an event to all connected clients
 */
export const broadcastEvent = (event: string, data: any) => {
  try {
    const io = getIO();
    io.emit(event, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });

    logDebug('Event broadcasted to all clients', {
      event,
    });
  } catch (error) {
    logError('Failed to broadcast event', error, {
      event,
    });
  }
};

/**
 * Get list of connected users
 */
export const getConnectedUsers = (): string[] => {
  try {
    const io = getIO();
    const sockets = io.sockets.sockets;
    const users = new Set<string>();

    sockets.forEach((socket) => {
      const userId = socket.handshake.auth?.userId;
      if (userId) {
        users.add(userId);
      }
    });

    return Array.from(users);
  } catch (error) {
    logError('Failed to get connected users', error);
    return [];
  }
};

/**
 * Get number of connected sockets for a user
 */
export const getUserSocketCount = (userId: string): number => {
  try {
    const io = getIO();
    const sockets = io.sockets.sockets;
    let count = 0;

    sockets.forEach((socket) => {
      if (socket.handshake.auth?.userId === userId) {
        count++;
      }
    });

    return count;
  } catch (error) {
    logError('Failed to get user socket count', error, { userId });
    return 0;
  }
};

/**
 * Disconnect a user's socket connections
 */
export const disconnectUser = (userId: string) => {
  try {
    const io = getIO();
    const sockets = io.sockets.sockets;

    sockets.forEach((socket) => {
      if (socket.handshake.auth?.userId === userId) {
        socket.disconnect(true);
      }
    });

    logDebug('User sockets disconnected', { userId });
  } catch (error) {
    logError('Failed to disconnect user', error, { userId });
  }
};
