import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  attachments?: string[];
  timestamp: Date;
  isRead: boolean;
  sender: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'SUPPORT' | 'SALES' | 'GENERAL';
  isActive: boolean;
  createdAt: Date;
  participants: ChatParticipant[];
  messages?: ChatMessage[];
}

export interface ChatParticipant {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: Date;
  lastSeen: Date;
  status: 'ONLINE' | 'AWAY' | 'OFFLINE';
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

interface UseChatOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useChat = (options: UseChatOptions = {}) => {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingIndicator[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, ChatParticipant[]>>({});

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get API URL and token
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('token');

  /**
   * Connect to Socket.io server
   */
  const connect = useCallback(() => {
    if (!token) {
      onError?.(new Error('No authentication token found'));
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const newSocket = io(`${API_URL}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      onConnect?.();
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
      onDisconnect?.();
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      onError?.(error);
    });

    // Chat events
    newSocket.on('connected', (data) => {
      console.log('Chat connection confirmed:', data);
    });

    newSocket.on('message', (data: { message: ChatMessage }) => {
      const { message } = data;
      setMessages((prev) => ({
        ...prev,
        [message.roomId]: [...(prev[message.roomId] || []), message],
      }));
    });

    newSocket.on('typing', (data: TypingIndicator) => {
      setTypingUsers((prev) => {
        const roomTyping = prev[data.roomId] || [];
        if (data.isTyping) {
          // Add user to typing list
          if (!roomTyping.find((u) => u.userId === data.userId)) {
            return {
              ...prev,
              [data.roomId]: [...roomTyping, data],
            };
          }
        } else {
          // Remove user from typing list
          return {
            ...prev,
            [data.roomId]: roomTyping.filter((u) => u.userId !== data.userId),
          };
        }
        return prev;
      });
    });

    newSocket.on('user_joined', (data: { roomId: string; participant: ChatParticipant }) => {
      console.log('User joined room:', data);
      setOnlineUsers((prev) => ({
        ...prev,
        [data.roomId]: [...(prev[data.roomId] || []), data.participant],
      }));
    });

    newSocket.on('user_left', (data: { roomId: string; userId: string }) => {
      console.log('User left room:', data);
      setOnlineUsers((prev) => ({
        ...prev,
        [data.roomId]: (prev[data.roomId] || []).filter((u) => u.userId !== data.userId),
      }));
    });

    newSocket.on('user_offline', (data: { roomId: string; userId: string }) => {
      console.log('User went offline:', data);
      setOnlineUsers((prev) => ({
        ...prev,
        [data.roomId]: (prev[data.roomId] || []).map((u) =>
          u.userId === data.userId ? { ...u, status: 'OFFLINE' as const } : u
        ),
      }));
    });

    newSocket.on('online_status', (data: { roomId: string; userId: string; status: 'ONLINE' | 'AWAY' | 'OFFLINE' }) => {
      console.log('User status changed:', data);
      setOnlineUsers((prev) => ({
        ...prev,
        [data.roomId]: (prev[data.roomId] || []).map((u) =>
          u.userId === data.userId ? { ...u, status: data.status } : u
        ),
      }));
    });

    newSocket.on('read', (data: { messageId: string; readBy: string }) => {
      console.log('Message read:', data);
      // Update message read status
      setMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((roomId) => {
          updated[roomId] = updated[roomId].map((msg) =>
            msg.id === data.messageId ? { ...msg, isRead: true } : msg
          );
        });
        return updated;
      });
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      onError?.(new Error(error.message || 'Socket error'));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [API_URL, token, onConnect, onDisconnect, onError]);

  /**
   * Disconnect from Socket.io server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  /**
   * Join a chat room
   */
  const joinRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('join', { roomId });
    setCurrentRoom(roomId);
  }, []);

  /**
   * Leave a chat room
   */
  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('leave', { roomId });
    if (currentRoom === roomId) {
      setCurrentRoom(null);
    }
  }, [currentRoom]);

  /**
   * Send a message
   */
  const sendMessage = useCallback((roomId: string, content: string, attachments?: string[]) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    if (!content.trim()) {
      return;
    }

    socketRef.current.emit('message', {
      roomId,
      content: content.trim(),
      attachments,
    });
  }, []);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback((roomId: string, isTyping: boolean) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('typing', { roomId, isTyping });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', { roomId, isTyping: false });
      }, 3000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, []);

  /**
   * Mark message as read
   */
  const markAsRead = useCallback((messageId: string, roomId: string) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('read', { messageId, roomId });
  }, []);

  /**
   * Update online status
   */
  const updateStatus = useCallback((roomId: string, status: 'ONLINE' | 'AWAY' | 'OFFLINE') => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('online_status', { roomId, status });
  }, []);

  /**
   * Get messages for a room
   */
  const getRoomMessages = useCallback((roomId: string): ChatMessage[] => {
    return messages[roomId] || [];
  }, [messages]);

  /**
   * Get typing users for a room
   */
  const getTypingUsers = useCallback((roomId: string): TypingIndicator[] => {
    return typingUsers[roomId] || [];
  }, [typingUsers]);

  /**
   * Get online users for a room
   */
  const getOnlineUsers = useCallback((roomId: string): ChatParticipant[] => {
    return onlineUsers[roomId] || [];
  }, [onlineUsers]);

  /**
   * Clear messages for a room
   */
  const clearMessages = useCallback((roomId: string) => {
    setMessages((prev) => {
      const updated = { ...prev };
      delete updated[roomId];
      return updated;
    });
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token, connect, disconnect]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    currentRoom,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    updateStatus,
    getRoomMessages,
    getTypingUsers,
    getOnlineUsers,
    clearMessages,
  };
};
