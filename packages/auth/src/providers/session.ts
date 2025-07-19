import bcrypt from 'bcryptjs';
import { authConfig } from '@suara/config';
import type { User, TrustLevel } from '@suara/database';

export interface SessionUser {
  id: string;
  phone: string;
  name?: string;
  trustLevel: TrustLevel;
  language: string;
  phoneVerified: boolean;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(authConfig.bcryptRounds);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate random OTP code
 */
export function generateOtp(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
}

/**
 * Generate secure random string
 */
export function generateSecureId(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return result;
}

/**
 * Normalize Indonesian phone number
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle Indonesian phone number formats
  if (digits.startsWith('0')) {
    // Convert 08xxx to +628xxx
    return '+62' + digits.substring(1);
  } else if (digits.startsWith('62')) {
    // Add + if missing
    return '+' + digits;
  } else if (digits.startsWith('8')) {
    // Add country code
    return '+62' + digits;
  }
  
  // Return as-is if already has country code or unknown format
  return digits.startsWith('+') ? digits : '+' + digits;
}

/**
 * Validate Indonesian phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  // Indonesian mobile numbers: +62 8xx-xxxx-xxxx (10-13 digits after 62)
  const indonesianMobileRegex = /^\+628\d{8,11}$/;
  
  return indonesianMobileRegex.test(normalized);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.startsWith('+628')) {
    // Format as +62 8xx-xxxx-xxxx
    const number = normalized.substring(3); // Remove +62
    return `+62 ${number.substring(0, 3)}-${number.substring(3, 7)}-${number.substring(7)}`;
  }
  
  return normalized;
}

/**
 * Create session user object from database user
 */
export function createSessionUser(user: User & { 
  trustScore?: { trustLevel: TrustLevel } | null 
}): SessionUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name || undefined,
    trustLevel: user.trustScore?.trustLevel || 'BASIC',
    language: user.language,
    phoneVerified: user.phoneVerified,
  };
}

/**
 * Check if user has required trust level
 */
export function hasRequiredTrustLevel(
  userTrustLevel: TrustLevel,
  requiredLevel: TrustLevel
): boolean {
  const trustLevels: Record<TrustLevel, number> = {
    BASIC: 1,
    VERIFIED: 2,
    PREMIUM: 3,
  };
  
  return trustLevels[userTrustLevel] >= trustLevels[requiredLevel];
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  /**
   * Check if key has exceeded rate limit
   */
  isRateLimited(key: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);
    
    if (!attempt || now > attempt.resetTime) {
      // Reset or create new attempt record
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }
    
    if (attempt.count >= this.maxAttempts) {
      return true;
    }
    
    // Increment attempt count
    attempt.count++;
    return false;
  }
  
  /**
   * Get remaining attempts
   */
  getRemainingAttempts(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt || Date.now() > attempt.resetTime) {
      return this.maxAttempts;
    }
    
    return Math.max(0, this.maxAttempts - attempt.count);
  }
  
  /**
   * Get time until reset
   */
  getResetTime(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt || Date.now() > attempt.resetTime) {
      return 0;
    }
    
    return attempt.resetTime - Date.now();
  }
  
  /**
   * Clear attempts for key
   */
  clearAttempts(key: string): void {
    this.attempts.delete(key);
  }
}