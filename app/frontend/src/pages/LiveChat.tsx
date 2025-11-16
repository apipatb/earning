import React, { useState, useEffect } from 'react';
import { useChat, ChatRoom as ChatRoomType } from '../hooks/useChat';
import ChatRoom from '../components/ChatRoom';
import ChatWindow from '../components/ChatWindow';
import { MessageSquarePlus, Loader2, WifiOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const LiveChat: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoomType[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'SUPPORT' | 'SALES' | 'GENERAL'>('GENERAL');

  const {
    isConnected,
    currentRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendTypingIndicator,
    getRoomMessages,
    getTypingUsers,
    getOnlineUsers,
  } = useChat({
    autoConnect: true,
    onConnect: () => {
      console.log('Chat connected');
    },
    onDisconnect: () => {
      console.log('Chat disconnected');
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setError(error.message);
    },
  });

  // Get current user ID from local storage or context
  const currentUserId = localStorage.getItem('userId') || '';

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  // Auto-join first room if available
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId && isConnected) {
      handleRoomSelect(rooms[0].id);
    }
  }, [rooms, selectedRoomId, isConnected]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/v1/chat/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    // Leave current room if any
    if (currentRoom && currentRoom !== roomId) {
      leaveRoom(currentRoom);
    }

    // Join new room
    joinRoom(roomId);
    setSelectedRoomId(roomId);
  };

  const handleSendMessage = (content: string, attachments?: string[]) => {
    if (selectedRoomId) {
      sendMessage(selectedRoomId, content, attachments);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedRoomId) {
      sendTypingIndicator(selectedRoomId, isTyping);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoomName.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/v1/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoomName,
          type: newRoomType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      setRooms([data.data, ...rooms]);
      setNewRoomName('');
      setShowCreateRoom(false);
      setError(null);

      // Auto-select the new room
      handleRoomSelect(data.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      console.error('Error creating room:', err);
    }
  };

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const messages = selectedRoomId ? getRoomMessages(selectedRoomId) : [];
  const typingUsers = selectedRoomId ? getTypingUsers(selectedRoomId) : [];
  const participants = selectedRoomId ? getOnlineUsers(selectedRoomId) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Room List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">Live Chat</h1>
            <button
              onClick={() => setShowCreateRoom(!showCreateRoom)}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Create new room"
            >
              <MessageSquarePlus size={20} />
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Create Room Form */}
        {showCreateRoom && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newRoomType}
                onChange={(e) => setNewRoomType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GENERAL">General</option>
                <option value="SUPPORT">Support</option>
                <option value="SALES">Sales</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Room List */}
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <MessageSquarePlus size={48} className="mb-4 text-gray-400" />
              <p className="text-center">No chat rooms yet. Create one to get started!</p>
            </div>
          ) : (
            rooms.map((room) => (
              <ChatRoom
                key={room.id}
                room={room}
                isSelected={room.id === selectedRoomId}
                onClick={() => handleRoomSelect(room.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom && isConnected ? (
          <ChatWindow
            roomId={selectedRoom.id}
            roomName={selectedRoom.name}
            messages={messages}
            participants={selectedRoom.participants}
            typingUsers={typingUsers}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
          />
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <WifiOff size={64} className="mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">Connection Lost</h3>
            <p className="text-center">
              Unable to connect to chat server. Please check your connection and try again.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a room to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChat;
