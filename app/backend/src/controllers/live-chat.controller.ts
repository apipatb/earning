import { Request, Response } from 'express';
import { liveChatService } from '../services/live-chat.service';
import { LiveChatRoomType } from '@prisma/client';

/**
 * Create a new chat room
 * POST /api/v1/chat/rooms
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required',
      });
    }

    if (!Object.values(LiveChatRoomType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room type',
      });
    }

    const room = await liveChatService.createRoom({ name, type });

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room',
      error: error.message,
    });
  }
};

/**
 * Get all chat rooms
 * GET /api/v1/chat/rooms
 */
export const getRooms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const type = req.query.type as LiveChatRoomType | undefined;

    const rooms = await liveChatService.getRooms(userId, type);

    res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: error.message,
    });
  }
};

/**
 * Get a specific room
 * GET /api/v1/chat/rooms/:id
 */
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await liveChatService.getRoomById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room',
      error: error.message,
    });
  }
};

/**
 * Get messages for a room
 * GET /api/v1/chat/rooms/:id/messages
 */
export const getRoomMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before ? new Date(req.query.before as string) : undefined;

    const messages = await liveChatService.getRoomMessages(id, limit, before);

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Return in chronological order
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message,
    });
  }
};

/**
 * Send a message
 * POST /api/v1/chat/messages
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { roomId, content, attachments } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!roomId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and content are required',
      });
    }

    const message = await liveChatService.sendMessage({
      roomId,
      senderId: userId,
      content,
      attachments,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

/**
 * Mark a message as read
 * POST /api/v1/chat/messages/:id/read
 */
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const message = await liveChatService.markMessageAsRead(id, userId);

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message,
    });
  }
};

/**
 * Mark all messages in a room as read
 * POST /api/v1/chat/rooms/:id/read
 */
export const markRoomAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await liveChatService.markRoomMessagesAsRead(id, userId);

    res.status(200).json({
      success: true,
      message: 'All messages marked as read',
    });
  } catch (error: any) {
    console.error('Error marking room as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark room as read',
      error: error.message,
    });
  }
};

/**
 * Get unread message count
 * GET /api/v1/chat/unread
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const roomId = req.query.roomId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const count = await liveChatService.getUnreadMessageCount(userId, roomId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};

/**
 * Join a chat room
 * POST /api/v1/chat/rooms/:id/join
 */
export const joinRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const participant = await liveChatService.joinRoom(id, userId);

    res.status(200).json({
      success: true,
      data: participant,
    });
  } catch (error: any) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room',
      error: error.message,
    });
  }
};

/**
 * Leave a chat room
 * POST /api/v1/chat/rooms/:id/leave
 */
export const leaveRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await liveChatService.leaveRoom(id, userId);

    res.status(200).json({
      success: true,
      message: 'Left room successfully',
    });
  } catch (error: any) {
    console.error('Error leaving room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room',
      error: error.message,
    });
  }
};

/**
 * Get room participants
 * GET /api/v1/chat/rooms/:id/participants
 */
export const getRoomParticipants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const participants = await liveChatService.getRoomParticipants(id);

    res.status(200).json({
      success: true,
      data: participants,
    });
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch participants',
      error: error.message,
    });
  }
};

/**
 * Search messages in a room
 * GET /api/v1/chat/rooms/:id/search
 */
export const searchMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const messages = await liveChatService.searchMessages(id, query, limit);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message,
    });
  }
};

/**
 * Delete a chat room
 * DELETE /api/v1/chat/rooms/:id
 */
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await liveChatService.deleteRoom(id);

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete room',
      error: error.message,
    });
  }
};
