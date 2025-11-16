import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { logWarn, logDebug } from '../lib/logger';

/**
 * Authenticate WebSocket connections using JWT tokens
 * Expects the token to be passed in socket handshake auth
 */
export const wsAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      logWarn('WebSocket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication token required'));
    }

    // Verify the JWT token
    const decoded = verifyToken(token);

    if (!decoded) {
      logWarn('Invalid or expired WebSocket token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Invalid or expired token'));
    }

    // Attach user info to socket for later use
    socket.handshake.auth.userId = decoded.id;
    socket.handshake.auth.email = decoded.email;

    logDebug('WebSocket authentication successful', {
      socketId: socket.id,
      userId: decoded.id,
      email: decoded.email,
    });

    next();
  } catch (error) {
    logWarn('WebSocket authentication error', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : String(error),
    });
    next(new Error('Authentication failed'));
  }
};

/**
 * Verify user is authenticated (to be used in socket event handlers)
 */
export const verifySocketUser = (socket: Socket): { id: string; email: string } | null => {
  const userId = socket.handshake.auth?.userId;
  const email = socket.handshake.auth?.email;

  if (!userId || !email) {
    return null;
  }

  return { id: userId, email };
};
