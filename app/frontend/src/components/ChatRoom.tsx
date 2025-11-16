import React from 'react';
import { ChatRoom as ChatRoomType } from '../hooks/useChat';
import { Users, Circle } from 'lucide-react';

interface ChatRoomProps {
  room: ChatRoomType;
  isSelected?: boolean;
  unreadCount?: number;
  onClick: () => void;
  className?: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  room,
  isSelected = false,
  unreadCount = 0,
  onClick,
  className = '',
}) => {
  const getRoomTypeColor = () => {
    switch (room.type) {
      case 'SUPPORT':
        return 'bg-blue-100 text-blue-800';
      case 'SALES':
        return 'bg-green-100 text-green-800';
      case 'GENERAL':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOnlineCount = () => {
    return room.participants.filter((p) => p.status === 'ONLINE').length;
  };

  const getLastMessage = () => {
    if (room.messages && room.messages.length > 0) {
      const lastMsg = room.messages[0];
      return {
        content: lastMsg.content,
        time: new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }
    return null;
  };

  const lastMessage = getLastMessage();
  const onlineCount = getOnlineCount();

  return (
    <div
      onClick={onClick}
      className={`
        p-4 cursor-pointer border-b border-gray-200 transition-colors
        hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{room.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoomTypeColor()}`}>
              {room.type}
            </span>
          </div>

          {lastMessage && (
            <p className="text-sm text-gray-600 truncate mb-1">{lastMessage.content}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{room.participants.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle size={8} className="fill-green-500 text-green-500" />
              <span>{onlineCount} online</span>
            </div>
            {lastMessage && <span>{lastMessage.time}</span>}
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="ml-2 flex-shrink-0">
            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
