import React from 'react';
import { TypingIndicator as TypingIndicatorType } from '../hooks/useChat';

interface TypingIndicatorProps {
  typingUsers: TypingIndicatorType[];
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, className = '' }) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    } else {
      return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <div className="flex gap-1">
        <span className="animate-bounce animation-delay-0 w-2 h-2 bg-gray-400 rounded-full"></span>
        <span className="animate-bounce animation-delay-100 w-2 h-2 bg-gray-400 rounded-full"></span>
        <span className="animate-bounce animation-delay-200 w-2 h-2 bg-gray-400 rounded-full"></span>
      </div>
      <span className="italic">{getTypingText()}</span>
    </div>
  );
};

export default TypingIndicator;
