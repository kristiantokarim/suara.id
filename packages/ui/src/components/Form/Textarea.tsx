import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Textarea label
   */
  label?: string;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Help text to display below textarea
   */
  helpText?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Show character counter
   */
  showCount?: boolean;
  
  /**
   * Additional CSS classes for the textarea
   */
  className?: string;
  
  /**
   * Additional CSS classes for the container
   */
  containerClassName?: string;
}

/**
 * Textarea component for longer text input in Indonesian context
 * 
 * Features:
 * - Auto-resizing height
 * - Character counter for length limits
 * - Optimized for Indonesian text input
 * - Touch-friendly sizing
 * 
 * @example
 * ```tsx
 * <Textarea
 *   label="Deskripsi Masalah"
 *   placeholder="Jelaskan masalah yang Anda temukan..."
 *   required
 *   showCount
 *   maxLength={500}
 * />
 * ```
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helpText,
      required,
      showCount,
      className,
      containerClassName,
      id,
      maxLength,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const errorId = error ? `${textareaId}-error` : undefined;
    const helpId = helpText ? `${textareaId}-help` : undefined;
    
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className={cn('space-y-1', containerClassName)}>
        {/* Label */}
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
            {required && (
              <span className="text-error ml-1" aria-label="wajib diisi">
                *
              </span>
            )}
          </label>
        )}

        {/* Textarea field */}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'form-textarea',
            error && 'form-input--error',
            className
          )}
          maxLength={maxLength}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            errorId && errorId,
            helpId && helpId
          )}
          value={value}
          {...props}
        />

        {/* Character counter */}
        {showCount && maxLength && (
          <div className="flex justify-end">
            <span
              className={cn(
                'text-sm',
                currentLength > maxLength * 0.9 ? 'text-warning' : 'text-gray-500',
                currentLength >= maxLength && 'text-error'
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p id={errorId} className="form-error" role="alert">
            {error}
          </p>
        )}

        {/* Help text */}
        {helpText && !error && (
          <p id={helpId} className="form-help">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';