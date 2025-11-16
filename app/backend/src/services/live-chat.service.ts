import { PrismaClient, LiveChatRoomType, ParticipantStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRoomDTO {
  name: string;
  type: LiveChatRoomType;
}

export interface SendMessageDTO {
  roomId: string;
  senderId: string;
  content: string;
  attachments?: string[];
}

export interface UpdateParticipantStatusDTO {
  roomId: string;
  userId: string;
  status: ParticipantStatus;
}

export interface MarkMessageReadDTO {
  messageId: string;
  userId: string;
}

/**
 * LiveChatService - Handles all live chat operations
 */
export class LiveChatService {
  /**
   * Create a new chat room
   */
  async createRoom(data: CreateRoomDTO) {
    return await prisma.liveChatRoom.create({
      data: {
        name: data.name,
        type: data.type,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all active chat rooms
   */
  async getRooms(userId?: string, type?: LiveChatRoomType) {
    const where: any = {
      isActive: true,
    };

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.participants = {
        some: {
          userId,
        },
      };
    }

    return await prisma.liveChatRoom.findMany({
      where,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            lastSeen: 'desc',
          },
        },
        messages: {
          take: 1,
          orderBy: {
            timestamp: 'desc',
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a specific room by ID
   */
  async getRoomById(roomId: string) {
    return await prisma.liveChatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get messages for a specific room
   */
  async getRoomMessages(
    roomId: string,
    limit: number = 50,
    before?: Date
  ) {
    const where: any = {
      roomId,
    };

    if (before) {
      where.timestamp = {
        lt: before,
      };
    }

    return await prisma.liveChatMessage.findMany({
      where,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Send a message in a room
   */
  async sendMessage(data: SendMessageDTO) {
    // Ensure user is a participant
    await this.ensureParticipant(data.roomId, data.senderId);

    const message = await prisma.liveChatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: data.senderId,
        content: data.content,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: true,
      },
    });

    // Update participant last seen
    await this.updateParticipantLastSeen(data.roomId, data.senderId);

    return message;
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId: string, userId: string) {
    const message = await prisma.liveChatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Only mark as read if the user is not the sender
    if (message.senderId !== userId) {
      return await prisma.liveChatMessage.update({
        where: { id: messageId },
        data: { isRead: true },
      });
    }

    return message;
  }

  /**
   * Mark all messages in a room as read
   */
  async markRoomMessagesAsRead(roomId: string, userId: string) {
    return await prisma.liveChatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(userId: string, roomId?: string) {
    const where: any = {
      isRead: false,
      senderId: { not: userId },
    };

    if (roomId) {
      where.roomId = roomId;
      where.room = {
        participants: {
          some: {
            userId,
          },
        },
      };
    } else {
      where.room = {
        participants: {
          some: {
            userId,
          },
        },
      };
    }

    return await prisma.liveChatMessage.count({
      where,
    });
  }

  /**
   * Join a chat room (add participant)
   */
  async joinRoom(roomId: string, userId: string) {
    const existingParticipant = await prisma.liveChatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (existingParticipant) {
      return await prisma.liveChatParticipant.update({
        where: {
          id: existingParticipant.id,
        },
        data: {
          status: ParticipantStatus.ONLINE,
          lastSeen: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    return await prisma.liveChatParticipant.create({
      data: {
        roomId,
        userId,
        status: ParticipantStatus.ONLINE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Leave a chat room
   */
  async leaveRoom(roomId: string, userId: string) {
    return await prisma.liveChatParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      data: {
        status: ParticipantStatus.OFFLINE,
        lastSeen: new Date(),
      },
    });
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(data: UpdateParticipantStatusDTO) {
    return await prisma.liveChatParticipant.update({
      where: {
        roomId_userId: {
          roomId: data.roomId,
          userId: data.userId,
        },
      },
      data: {
        status: data.status,
        lastSeen: new Date(),
      },
    });
  }

  /**
   * Update participant last seen
   */
  async updateParticipantLastSeen(roomId: string, userId: string) {
    try {
      await prisma.liveChatParticipant.update({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
        data: {
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      // If participant doesn't exist, create them
      await this.ensureParticipant(roomId, userId);
    }
  }

  /**
   * Get online participants for a room
   */
  async getOnlineParticipants(roomId: string) {
    return await prisma.liveChatParticipant.findMany({
      where: {
        roomId,
        status: ParticipantStatus.ONLINE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all participants for a room
   */
  async getRoomParticipants(roomId: string) {
    return await prisma.liveChatParticipant.findMany({
      where: {
        roomId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        lastSeen: 'desc',
      },
    });
  }

  /**
   * Ensure user is a participant (create if not exists)
   */
  private async ensureParticipant(roomId: string, userId: string) {
    const participant = await prisma.liveChatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      await prisma.liveChatParticipant.create({
        data: {
          roomId,
          userId,
          status: ParticipantStatus.ONLINE,
        },
      });
    }
  }

  /**
   * Delete a chat room
   */
  async deleteRoom(roomId: string) {
    return await prisma.liveChatRoom.update({
      where: { id: roomId },
      data: { isActive: false },
    });
  }

  /**
   * Search messages in a room
   */
  async searchMessages(roomId: string, query: string, limit: number = 20) {
    return await prisma.liveChatMessage.findMany({
      where: {
        roomId,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

export const liveChatService = new LiveChatService();
