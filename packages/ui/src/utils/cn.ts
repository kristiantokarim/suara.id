import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Handles conditional classes and resolves conflicts
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate trust level specific classes
 * @param level - Trust level (BASIC, VERIFIED, PREMIUM)
 * @returns Object with trust level classes
 */
export function getTrustLevelClasses(level: 'BASIC' | 'VERIFIED' | 'PREMIUM') {
  const classMap = {
    BASIC: {
      badge: 'trust-badge--basic',
      text: 'text-trust-basic',
      bg: 'bg-trust-basic/10',
      border: 'border-trust-basic',
      ring: 'ring-trust-basic',
    },
    VERIFIED: {
      badge: 'trust-badge--verified',
      text: 'text-trust-verified',
      bg: 'bg-trust-verified/10',
      border: 'border-trust-verified',
      ring: 'ring-trust-verified',
    },
    PREMIUM: {
      badge: 'trust-badge--premium',
      text: 'text-trust-premium',
      bg: 'bg-trust-premium/10',
      border: 'border-trust-premium',
      ring: 'ring-trust-premium',
    },
  };

  return classMap[level];
}

/**
 * Generate category specific classes for Indonesian civic issues
 * @param category - Issue category
 * @returns Object with category classes
 */
export function getCategoryClasses(
  category: 'INFRASTRUCTURE' | 'CLEANLINESS' | 'LIGHTING' | 'WATER_DRAINAGE' | 'ENVIRONMENT' | 'SAFETY'
) {
  const classMap = {
    INFRASTRUCTURE: {
      badge: 'category-badge--infrastructure',
      text: 'text-category-infrastructure',
      bg: 'bg-category-infrastructure/10',
      border: 'border-category-infrastructure',
      icon: 'text-category-infrastructure',
    },
    CLEANLINESS: {
      badge: 'category-badge--cleanliness',
      text: 'text-category-cleanliness',
      bg: 'bg-category-cleanliness/10',
      border: 'border-category-cleanliness',
      icon: 'text-category-cleanliness',
    },
    LIGHTING: {
      badge: 'category-badge--lighting',
      text: 'text-category-lighting',
      bg: 'bg-category-lighting/10',
      border: 'border-category-lighting',
      icon: 'text-category-lighting',
    },
    WATER_DRAINAGE: {
      badge: 'category-badge--water',
      text: 'text-category-water',
      bg: 'bg-category-water/10',
      border: 'border-category-water',
      icon: 'text-category-water',
    },
    ENVIRONMENT: {
      badge: 'category-badge--environment',
      text: 'text-category-environment',
      bg: 'bg-category-environment/10',
      border: 'border-category-environment',
      icon: 'text-category-environment',
    },
    SAFETY: {
      badge: 'category-badge--safety',
      text: 'text-category-safety',
      bg: 'bg-category-safety/10',
      border: 'border-category-safety',
      icon: 'text-category-safety',
    },
  };

  return classMap[category];
}

/**
 * Generate responsive text size classes
 * @param size - Text size variant
 * @returns Responsive text classes
 */
export function getResponsiveTextClasses(size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl') {
  const sizeMap = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
    '3xl': 'text-3xl sm:text-4xl',
  };

  return sizeMap[size];
}

/**
 * Generate button variant classes
 * @param variant - Button variant
 * @param size - Button size
 * @returns Button classes
 */
export function getButtonClasses(
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md'
) {
  const baseClasses = 'btn';
  const variantClasses = `btn--${variant}`;
  const sizeClasses = `btn--${size}`;

  return cn(baseClasses, variantClasses, sizeClasses);
}

/**
 * Generate input state classes
 * @param hasError - Whether input has error
 * @param disabled - Whether input is disabled
 * @returns Input classes
 */
export function getInputClasses(hasError?: boolean, disabled?: boolean) {
  return cn(
    'form-input',
    hasError && 'form-input--error',
    disabled && 'opacity-50 cursor-not-allowed'
  );
}