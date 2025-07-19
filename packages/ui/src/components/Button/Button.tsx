import React from 'react';
import { cn, getButtonClasses } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant of the button
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  
  /**
   * Size of the button
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Whether button is in loading state
   */
  loading?: boolean;
  
  /**
   * Icon to display before button text
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Icon to display after button text
   */
  rightIcon?: React.ReactNode;
  
  /**
   * Whether button should take full width
   */
  fullWidth?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Button content
   */
  children: React.ReactNode;
}

/**
 * Primary button component for Suara.id platform
 * 
 * Designed for Indonesian users with:
 * - Touch-friendly sizing (minimum 44px touch target)
 * - High contrast for readability
 * - Loading states for async actions
 * - Accessibility support
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" onClick={handleSubmit}>
 *   Kirim Laporan
 * </Button>
 * 
 * <Button variant="secondary" leftIcon={<PlusIcon />} loading={isLoading}>
 *   Tambah Foto
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          getButtonClasses(variant, size),
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="loading-spinner w-4 h-4 mr-2" aria-hidden="true" />
        )}
        
        {/* Left icon */}
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        {/* Button text */}
        <span className={cn(loading && 'opacity-70')}>
          {children}
        </span>
        
        {/* Right icon */}
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
        
        {/* Screen reader loading indicator */}
        {loading && (
          <span className="sr-only">Memuat...</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';