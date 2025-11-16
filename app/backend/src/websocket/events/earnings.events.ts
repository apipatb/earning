import { Socket } from 'socket.io';
import { logInfo, logDebug, logError } from '../../lib/logger';
import { getIO } from '../ws';

export interface EarningData {
  id: string;
  userId: string;
  platformId: string;
  platform: {
    id: string;
    name: string;
    color: string | null;
  };
  date: string;
  hours: number | null;
  amount: number;
  hourly_rate: number | null;
  notes?: string;
}

export interface EarningUpdate {
  id: string;
  userId: string;
  changes: {
    amount?: number;
    hours?: number;
    date?: string;
    notes?: string;
  };
  updatedAt: string;
}

/**
 * Setup earnings namespace and event handlers
 */
export const setupEarningsEvents = (socket: Socket) => {
  const userId = socket.handshake.auth?.userId;

  if (!userId) {
    logDebug('User ID not found in socket auth, skipping earnings setup');
    return;
  }

  // Join user-specific room
  const userRoom = `earnings:${userId}`;
  socket.join(userRoom);

  logInfo('Socket joined earnings namespace', {
    socketId: socket.id,
    userId,
    room: userRoom,
  });

  // Handle new earning creation
  socket.on('earnings:subscribe', () => {
    logDebug('Client subscribed to earnings updates', {
      socketId: socket.id,
      userId,
    });
  });

  // Handle unsubscribe
  socket.on('earnings:unsubscribe', () => {
    socket.leave(userRoom);
    logDebug('Client unsubscribed from earnings updates', {
      socketId: socket.id,
      userId,
    });
  });
};

/**
 * Emit new earning event
 * Call this from the controller when a new earning is created
 */
export const emitEarningCreated = (userId: string, earning: EarningData) => {
  try {
    const io = getIO();
    const room = `earnings:${userId}`;

    logInfo('Emitting earnings:new event', {
      userId,
      earningId: earning.id,
      room,
    });

    io.to(room).emit('earnings:new', {
      event: 'earnings:new',
      timestamp: new Date().toISOString(),
      data: earning,
    });
  } catch (error) {
    logError('Failed to emit earnings:new event', error, {
      userId,
      earningId: earning.id,
    });
  }
};

/**
 * Emit earning update event
 * Call this from the controller when an earning is updated
 */
export const emitEarningUpdated = (userId: string, update: EarningUpdate) => {
  try {
    const io = getIO();
    const room = `earnings:${userId}`;

    logInfo('Emitting earnings:updated event', {
      userId,
      earningId: update.id,
      room,
    });

    io.to(room).emit('earnings:updated', {
      event: 'earnings:updated',
      timestamp: new Date().toISOString(),
      data: update,
    });
  } catch (error) {
    logError('Failed to emit earnings:updated event', error, {
      userId,
      earningId: update.id,
    });
  }
};

/**
 * Emit earning deletion event
 * Call this from the controller when an earning is deleted
 */
export const emitEarningDeleted = (userId: string, earningId: string) => {
  try {
    const io = getIO();
    const room = `earnings:${userId}`;

    logInfo('Emitting earnings:deleted event', {
      userId,
      earningId,
      room,
    });

    io.to(room).emit('earnings:deleted', {
      event: 'earnings:deleted',
      timestamp: new Date().toISOString(),
      data: { id: earningId },
    });
  } catch (error) {
    logError('Failed to emit earnings:deleted event', error, {
      userId,
      earningId,
    });
  }
};
