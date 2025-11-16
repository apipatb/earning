import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatParticipant, TypingIndicator as TypingIndicatorType } from '../hooks/useChat';
import { Send, Paperclip, Users, Circle, Image as ImageIcon } from 'lucide-react';
import TypingIndicator from './TypingIndicator';

interface ChatWindowProps {
  roomId: string;
  roomName: string;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  typingUsers: TypingIndicatorType[];
  currentUserId: string;
  onSendMessage: (content: string, attachments?: string[]) => void;
  onTyping: (isTyping: boolean) => void;
  className?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  roomId,
  roomName,
  messages,
  participants,
  typingUsers,
  currentUserId,
  onSendMessage,
  onTyping,
  className = '',
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [roomId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    // Send typing indicator
    if (value.trim()) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else {
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim()) {
      return;
    }

    onSendMessage(messageInput);
    setMessageInput('');
    onTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getOnlineCount = () => {
    return participants.filter((p) => p.status === 'ONLINE').length;
  };

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-500';
      case 'AWAY':
        return 'bg-yellow-500';
      case 'OFFLINE':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{roomName}</h2>
          <p className="text-sm text-gray-600">
            {getOnlineCount()} of {participants.length} online
          </p>
        </div>
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Users size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {!isOwnMessage && (
                    <p className="text-xs font-medium text-gray-700 mb-1 px-1">
                      {message.sender.name || message.sender.email}
                    </p>
                  )}
                  <div
                    className={`
                      px-4 py-2 rounded-2xl
                      ${
                        isOwnMessage
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-900 rounded-bl-none'
                      }
                    `}
                  >
                    <p className="break-words">{message.content}</p>
                    {message.attachments && JSON.parse(message.attachments as any).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {JSON.parse(message.attachments as any).map((url: string, idx: number) => (
                          <div key={idx} className="relative">
                            <ImageIcon size={16} className="inline mr-1" />
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm underline"
                            >
                              Attachment {idx + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <p className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</p>
                    {isOwnMessage && message.isRead && (
                      <span className="text-xs text-blue-500">Read</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="absolute right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-lg z-10">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Participants ({participants.length})</h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 64px)' }}>
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold">
                    {(participant.user.name || participant.user.email)[0].toUpperCase()}
                  </div>
                  <Circle
                    size={10}
                    className={`absolute bottom-0 right-0 ${getParticipantStatusColor(
                      participant.status
                    )} fill-current`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {participant.user.name || participant.user.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{participant.status.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
