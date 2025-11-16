import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logInfo, logDebug, logError, logWarn } from '../lib/logger';

let io: SocketIOServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer, corsOptions: any) => {
  io = new SocketIOServer(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Middleware for logging connections
  io.use((socket, next) => {
    logDebug('Socket.io connection attempt', {
      socketId: socket.id,
      userId: socket.handshake.auth?.userId,
    });
    next();
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    logInfo('Socket connected', {
      socketId: socket.id,
      userId: socket.handshake.auth?.userId,
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logInfo('Socket disconnected', {
        socketId: socket.id,
        userId: socket.handshake.auth?.userId,
        reason,
      });
    });

    // Error handler
    socket.on('error', (error) => {
      logError('Socket error', error, {
        socketId: socket.id,
        userId: socket.handshake.auth?.userId,
      });
    });
  });

  logInfo('WebSocket server initialized successfully');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
};

export default io;
