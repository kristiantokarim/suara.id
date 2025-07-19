import React from 'react';
import { cn, getTrustLevelClasses, getCategoryClasses } from '../../utils/cn';

export interface BadgeProps {
  /**
   * Badge content
   */
  children: React.ReactNode;
  
  /**
   * Badge variant
   */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  
  /**
   * Badge size
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface TrustBadgeProps {
  /**
   * Trust level
   */
  level: 'BASIC' | 'VERIFIED' | 'PREMIUM';
  
  /**
   * Show trust score
   */
  score?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface CategoryBadgeProps {
  /**
   * Issue category
   */
  category: 'INFRASTRUCTURE' | 'CLEANLINESS' | 'LIGHTING' | 'WATER_DRAINAGE' | 'ENVIRONMENT' | 'SAFETY';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Generic badge component
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    primary: 'bg-primary-100 text-primary-800 border-primary-200',
    secondary: 'bg-secondary-100 text-secondary-800 border-secondary-200',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};

/**
 * Trust level badge for Indonesian users
 * 
 * Displays user trust level with Indonesian labels
 * 
 * @example
 * ```tsx
 * <TrustBadge level="VERIFIED" score={3.2} />
 * <TrustBadge level="PREMIUM" />
 * ```
 */
export const TrustBadge: React.FC<TrustBadgeProps> = ({
  level,
  score,
  className,
}) => {
  const classes = getTrustLevelClasses(level);
  
  const levelLabels = {
    BASIC: 'Dasar',
    VERIFIED: 'Terverifikasi',
    PREMIUM: 'Premium',
  };

  const levelIcons = {
    BASIC: '👤',
    VERIFIED: '✅',
    PREMIUM: '⭐',
  };

  return (
    <span
      className={cn(
        'trust-badge',
        classes.badge,
        className
      )}
      title={`Tingkat kepercayaan: ${levelLabels[level]}${score ? ` (${score.toFixed(1)})` : ''}`}
    >
      <span className="mr-1" aria-hidden="true">
        {levelIcons[level]}
      </span>
      {levelLabels[level]}
      {score && (
        <span className="ml-1 font-mono text-xs opacity-75">
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
};

/**
 * Category badge for Indonesian civic issues
 * 
 * @example
 * ```tsx
 * <CategoryBadge category="INFRASTRUCTURE" />
 * <CategoryBadge category="CLEANLINESS" />
 * ```
 */
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  className,
}) => {
  const classes = getCategoryClasses(category);
  
  const categoryLabels = {
    INFRASTRUCTURE: 'Infrastruktur',
    CLEANLINESS: 'Kebersihan',
    LIGHTING: 'Penerangan',
    WATER_DRAINAGE: 'Air & Drainase',
    ENVIRONMENT: 'Lingkungan',
    SAFETY: 'Keamanan',
  };

  const categoryIcons = {
    INFRASTRUCTURE: '🏗️',
    CLEANLINESS: '🧹',
    LIGHTING: '💡',
    WATER_DRAINAGE: '💧',
    ENVIRONMENT: '🌱',
    SAFETY: '🛡️',
  };

  return (
    <span
      className={cn(
        'category-badge',
        classes.badge,
        className
      )}
      title={`Kategori: ${categoryLabels[category]}`}
    >
      <span className="mr-1.5" aria-hidden="true">
        {categoryIcons[category]}
      </span>
      {categoryLabels[category]}
    </span>
  );
};