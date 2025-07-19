import React from 'react';
import { cn } from '../../utils/cn';

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'bot' | 'system';
  messageType?: 'text' | 'image' | 'location' | 'file';
  metadata?: Record<string, any>;
}

export interface ChatBubbleProps {
  /**
   * Message data to display
   */
  message: ChatMessage;
  
  /**
   * Whether to show timestamp
   */
  showTimestamp?: boolean;
  
  /**
   * Whether this is the last message (for styling)
   */
  isLast?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Custom avatar component
   */
  avatar?: React.ReactNode;
}

/**
 * Chat bubble component for Indonesian conversation interface
 * 
 * Supports:
 * - Different message types (text, image, location)
 * - User, bot, and system messages
 * - Indonesian timestamp formatting
 * - RTL/LTR text direction
 * 
 * @example
 * ```tsx
 * <ChatBubble
 *   message={{
 *     id: '1',
 *     content: 'Halo! Ada masalah apa yang ingin Anda laporkan?',
 *     timestamp: new Date(),
 *     sender: 'bot'
 *   }}
 *   showTimestamp
 * />
 * ```
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  showTimestamp = false,
  isLast = false,
  className,
  avatar,
}) => {
  const { content, timestamp, sender, messageType = 'text' } = message;

  // Format timestamp in Indonesian locale
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const isUser = sender === 'user';
  const isBot = sender === 'bot';
  const isSystem = sender === 'system';

  return (
    <div
      className={cn(
        'flex gap-3 mb-4',
        isUser && 'flex-row-reverse',
        isLast && 'mb-6',
        className
      )}
    >
      {/* Avatar for bot messages */}
      {isBot && (
        <div className="flex-shrink-0">
          {avatar || (
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              S
            </div>
          )}
        </div>
      )}

      {/* Message container */}
      <div
        className={cn(
          'flex flex-col',
          isUser && 'items-end',
          isBot && 'items-start',
          isSystem && 'items-center w-full'
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            'chat-bubble',
            isUser && 'chat-bubble--user',
            isBot && 'chat-bubble--bot',
            isSystem && 'chat-bubble--system'
          )}
        >
          {/* Text content */}
          {messageType === 'text' && (
            <p className="whitespace-pre-wrap break-words">
              {content}
            </p>
          )}

          {/* Image content */}
          {messageType === 'image' && (
            <div className="space-y-2">
              <img
                src={content}
                alt="Gambar dari pengguna"
                className="rounded-lg max-w-xs w-full h-auto"
                loading="lazy"
              />
            </div>
          )}

          {/* Location content */}
          {messageType === 'location' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">📍 Lokasi:</p>
              <p className="font-medium">{content}</p>
            </div>
          )}

          {/* File content */}
          {messageType === 'file' && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                📎
              </div>
              <span className="text-sm">{content}</span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <span
            className={cn(
              'text-xs text-gray-500 mt-1 px-1',
              isUser && 'text-right',
              isBot && 'text-left',
              isSystem && 'text-center'
            )}
          >
            {formatTimestamp(timestamp)}
          </span>
        )}
      </div>

      {/* Spacer for user messages to maintain alignment */}
      {isUser && <div className="w-8" />}
    </div>
  );
};