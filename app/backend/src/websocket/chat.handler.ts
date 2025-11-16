import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { liveChatService } from '../services/live-chat.service';
import { ParticipantStatus } from '@prisma/client';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

interface JwtPayload {
  id: string;
  email: string;
  name?: string;
}

/**
 * Typing indicator cache
 * Structure: { roomId: { userId: timestamp } }
 */
const typingCache = new Map<string, Map<string, NodeJS.Timeout>>();

/**
 * Authenticate Socket.io connection using JWT
 */
const authenticateSocket = (socket: AuthenticatedSocket): boolean => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Socket connection attempted without token', {
        socketId: socket.id,
      });
      return false;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
    socket.userId = decoded.id;
    socket.userName = decoded.name || decoded.email;

    logger.info('Socket authenticated', {
      socketId: socket.id,
      userId: socket.userId,
    });

    return true;
  } catch (error) {
    logger.error('Socket authentication failed', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};

/**
 * Initialize chat WebSocket handlers
 */
export const initializeChatHandlers = (io: Server) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.use((socket: AuthenticatedSocket, next) => {
    if (authenticateSocket(socket)) {
      next();
    } else {
      next(new Error('Authentication error'));
    }
  });

  chatNamespace.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    logger.info('User connected to chat', {
      socketId: socket.id,
      userId,
    });

    // Emit connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date(),
    });

    /**
     * Join a chat room
     */
    socket.on('join', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        // Join the Socket.io room
        socket.join(roomId);

        // Update participant status in database
        const participant = await liveChatService.joinRoom(roomId, userId);

        // Notify other participants
        socket.to(roomId).emit('user_joined', {
          roomId,
          participant,
          timestamp: new Date(),
        });

        // Get online participants
        const onlineParticipants = await liveChatService.getOnlineParticipants(roomId);

        // Send confirmation to user
        socket.emit('joined', {
          roomId,
          participant,
          onlineParticipants,
          timestamp: new Date(),
        });

        logger.info('User joined room', {
          socketId: socket.id,
          userId,
          roomId,
        });
      } catch (error) {
        logger.error('Error joining room', {
          socketId: socket.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        socket.emit('error', {
          event: 'join',
          message: 'Failed to join room',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Leave a chat room
     */
    socket.on('leave', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        // Leave the Socket.io room
        socket.leave(roomId);

        // Update participant status in database
        await liveChatService.leaveRoom(roomId, userId);

        // Notify other participants
        socket.to(roomId).emit('user_left', {
          roomId,
          userId,
          timestamp: new Date(),
        });

        // Send confirmation to user
        socket.emit('left', {
          roomId,
          timestamp: new Date(),
        });

        logger.info('User left room', {
          socketId: socket.id,
          userId,
          roomId,
        });
      } catch (error) {
        logger.error('Error leaving room', {
          socketId: socket.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        socket.emit('error', {
          event: 'leave',
          message: 'Failed to leave room',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Send a message
     */
    socket.on('message', async (data: { roomId: string; content: string; attachments?: string[] }) => {
      try {
        const { roomId, content, attachments } = data;

        // Validate input
        if (!roomId || !content) {
          socket.emit('error', {
            event: 'message',
            message: 'Room ID and content are required',
          });
          return;
        }

        // Send message via service
        const message = await liveChatService.sendMessage({
          roomId,
          senderId: userId,
          content,
          attachments,
        });

        // Broadcast message to all participants in the room
        chatNamespace.to(roomId).emit('message', {
          message,
          timestamp: new Date(),
        });

        logger.info('Message sent', {
          socketId: socket.id,
          userId,
          roomId,
          messageId: message.id,
        });
      } catch (error) {
        logger.error('Error sending message', {
          socketId: socket.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        socket.emit('error', {
          event: 'message',
          message: 'Failed to send message',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', async (data: { roomId: string; isTyping: boolean }) => {
      try {
        const { roomId, isTyping } = data;

        if (!typingCache.has(roomId)) {
          typingCache.set(roomId, new Map());
        }

        const roomTypingCache = typingCache.get(roomId)!;

        if (isTyping) {
          // Clear existing timeout if any
          const existingTimeout = roomTypingCache.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Set new timeout to auto-clear typing status after 3 seconds
          const timeout = setTimeout(() => {
            roomTypingCache.delete(userId);
            socket.to(roomId).emit('typing', {
              roomId,
              userId,
              userName: socket.userName,
              isTyping: false,
            });
          }, 3000);

          roomTypingCache.set(userId, timeout);

          // Broadcast typing status to other participants
          socket.to(roomId).emit('typing', {
            roomId,
            userId,
            userName: socket.userName,
            isTyping: true,
          });
        } else {
          // Clear typing status
          const existingTimeout = roomTypingCache.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            roomTypingCache.delete(userId);
          }

          socket.to(roomId).emit('typing', {
            roomId,
            userId,
            userName: socket.userName,
            isTyping: false,
          });
        }
      } catch (error) {
        logger.error('Error handling typing indicator', {
          socketId: socket.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Mark message as read
     */
    socket.on('read', async (data: { messageId: string; roomId: string }) => {
      try {
        const { messageId, roomId } = data;

        // Mark message as read
        await liveChatService.markMessageAsRead(messageId, userId);

        // Notify sender that message was read
        socket.to(roomId).emit('read', {
          messageId,
          readBy: userId,
          timestamp: new Date(),
        });

        logger.info('Message marked as read', {
          socketId: socket.id,
          userId,
          messageId,
        });
      } catch (error) {
        logger.error('Error marking message as read', {
          socketId: socket.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Update online status
     */
    socket.on('online_status', async (data: { roomId: string; status: ParticipantStatus }) => {
      try {
        const { roomId, status } = data;

        // Update participant status
        await liveChatService.updateParticipantStatus({
          roomId,
          userId,
          status,
        });

        // Notify other participants
        socket.to(roomId).emit('online_status', {
          roomId,
          userId,
          status,
          timestamp: new Date(),
        });

        logger.info('Online status updated', {
          socketId: socket.id,
          userId,
          roomId,
          status,
        });
      } catch (error) {
        logger.error('Error updating online status', {
          socketId: socket.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', async () => {
      try {
        logger.info('User disconnected from chat', {
          socketId: socket.id,
          userId,
        });

        // Get all rooms the user was in
        const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);

        // Update status to offline for all rooms
        for (const roomId of rooms) {
          try {
            await liveChatService.updateParticipantStatus({
              roomId,
              userId,
              status: ParticipantStatus.OFFLINE,
            });

            // Notify other participants
            socket.to(roomId).emit('user_offline', {
              roomId,
              userId,
              timestamp: new Date(),
            });

            // Clear any typing indicators
            const roomTypingCache = typingCache.get(roomId);
            if (roomTypingCache) {
              const timeout = roomTypingCache.get(userId);
              if (timeout) {
                clearTimeout(timeout);
                roomTypingCache.delete(userId);
              }
            }
          } catch (error) {
            logger.error('Error updating status on disconnect', {
              userId,
              roomId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      } catch (error) {
        logger.error('Error handling disconnect', {
          socketId: socket.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  });

  logger.info('Chat WebSocket handlers initialized', {
    namespace: '/chat',
  });

  return chatNamespace;
};
