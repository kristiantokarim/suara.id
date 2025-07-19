import React from 'react';
import { cn, getInputClasses } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input label
   */
  label?: string;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Help text to display below input
   */
  helpText?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Icon to display at the start of input
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Icon to display at the end of input
   */
  rightIcon?: React.ReactNode;
  
  /**
   * Additional CSS classes for the input
   */
  className?: string;
  
  /**
   * Additional CSS classes for the container
   */
  containerClassName?: string;
}

/**
 * Input component optimized for Indonesian mobile users
 * 
 * Features:
 * - Large touch targets (44px minimum)
 * - Clear error states with Indonesian messaging
 * - Icon support for better UX
 * - Accessibility with proper labeling
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Nomor Telepon"
 *   placeholder="08123456789"
 *   type="tel"
 *   required
 *   leftIcon={<PhoneIcon />}
 * />
 * 
 * <Input
 *   label="Email"
 *   error="Format email tidak valid"
 *   helpText="Contoh: nama@email.com"
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helpText,
      required,
      leftIcon,
      rightIcon,
      className,
      containerClassName,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const helpId = helpText ? `${inputId}-help` : undefined;

    return (
      <div className={cn('space-y-1', containerClassName)}>
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {required && (
              <span className="text-error ml-1" aria-label="wajib diisi">
                *
              </span>
            )}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 w-5 h-5" aria-hidden="true">
                {leftIcon}
              </span>
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              getInputClasses(!!error, props.disabled),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              errorId && errorId,
              helpId && helpId
            )}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400 w-5 h-5" aria-hidden="true">
                {rightIcon}
              </span>
            </div>
          )}
        </div>

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

Input.displayName = 'Input';