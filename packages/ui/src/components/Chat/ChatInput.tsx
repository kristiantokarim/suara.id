import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface ChatInputProps {
  /**
   * Placeholder text for the input
   */
  placeholder?: string;
  
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the chat is in loading state
   */
  loading?: boolean;
  
  /**
   * Maximum characters allowed
   */
  maxLength?: number;
  
  /**
   * Callback when message is sent
   */
  onSend: (message: string) => void;
  
  /**
   * Callback when attachment button is clicked
   */
  onAttachment?: () => void;
  
  /**
   * Callback when location button is clicked
   */
  onLocation?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Chat input component for Indonesian conversation interface
 * 
 * Features:
 * - Auto-expanding textarea
 * - Attachment and location buttons
 * - Indonesian keyboard support
 * - Mobile-optimized for touch input
 * - Character counter
 * 
 * @example
 * ```tsx
 * <ChatInput
 *   placeholder="Ketik pesan Anda..."
 *   onSend={handleSend}
 *   onAttachment={handleAttachment}
 *   onLocation={handleLocation}
 *   maxLength={500}
 * />
 * ```
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  placeholder = 'Ketik pesan Anda...',
  disabled = false,
  loading = false,
  maxLength = 500,
  onSend,
  onAttachment,
  onLocation,
  className,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isDisabled = disabled || loading;
  const canSend = message.trim().length > 0 && !isDisabled;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn('bg-white border-t border-gray-200 p-4 safe-area-bottom', className)}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input container */}
        <div className="flex items-end space-x-3">
          {/* Attachment button */}
          {onAttachment && (
            <button
              type="button"
              onClick={onAttachment}
              disabled={isDisabled}
              className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors duration-200 touch-target"
              aria-label="Lampirkan file"
            >
              <span className="text-gray-600 text-lg" aria-hidden="true">
                📎
              </span>
            </button>
          )}

          {/* Location button */}
          {onLocation && (
            <button
              type="button"
              onClick={onLocation}
              disabled={isDisabled}
              className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors duration-200 touch-target"
              aria-label="Bagikan lokasi"
            >
              <span className="text-gray-600 text-lg" aria-hidden="true">
                📍
              </span>
            </button>
          )}

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={isDisabled}
              maxLength={maxLength}
              rows={1}
              className={cn(
                'w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none',
                'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'text-base leading-tight'
              )}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!canSend}
              className={cn(
                'absolute right-2 bottom-2 w-8 h-8 rounded-full flex items-center justify-center',
                'transition-all duration-200 touch-target',
                canSend
                  ? 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
              aria-label="Kirim pesan"
            >
              {loading ? (
                <div className="loading-spinner w-4 h-4" aria-hidden="true" />
              ) : (
                <span className="text-sm font-bold" aria-hidden="true">
                  ➤
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Character counter */}
        {maxLength && (
          <div className="flex justify-end">
            <span
              className={cn(
                'text-xs',
                message.length > maxLength * 0.9 ? 'text-warning' : 'text-gray-500',
                message.length >= maxLength && 'text-error'
              )}
            >
              {message.length}/{maxLength}
            </span>
          </div>
        )}
      </form>
    </div>
  );
};