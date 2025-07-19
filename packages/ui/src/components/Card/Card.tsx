import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps {
  /**
   * Card content
   */
  children: React.ReactNode;
  
  /**
   * Whether the card is elevated (has stronger shadow)
   */
  elevated?: boolean;
  
  /**
   * Whether the card is interactive (clickable)
   */
  interactive?: boolean;
  
  /**
   * Click handler for interactive cards
   */
  onClick?: () => void;
  
  /**
   * Card padding variant
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface CardHeaderProps {
  /**
   * Header content
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface CardBodyProps {
  /**
   * Body content
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface CardFooterProps {
  /**
   * Footer content
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Card component for displaying content in Indonesian interface
 * 
 * Features:
 * - Mobile-optimized spacing
 * - Interactive states
 * - Elevation levels
 * - Composable with header, body, footer
 * 
 * @example
 * ```tsx
 * <Card elevated interactive onClick={handleClick}>
 *   <Card.Header>
 *     <h3>Judul Kartu</h3>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Konten kartu di sini...</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button>Aksi</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({
  children,
  elevated = false,
  interactive = false,
  onClick,
  padding = 'md',
  className,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'card',
        elevated && 'card--elevated',
        interactive && 'card--interactive',
        paddingClasses[padding],
        onClick && 'w-full text-left',
        className
      )}
      {...(onClick && { type: 'button' })}
    >
      {children}
    </Component>
  );
};

/**
 * Card header component
 */
const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('border-b border-gray-200 pb-3 mb-4', className)}>
    {children}
  </div>
);

/**
 * Card body component
 */
const CardBody: React.FC<CardBodyProps> = ({ children, className }) => (
  <div className={cn('flex-1', className)}>
    {children}
  </div>
);

/**
 * Card footer component
 */
const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn('border-t border-gray-200 pt-3 mt-4', className)}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;