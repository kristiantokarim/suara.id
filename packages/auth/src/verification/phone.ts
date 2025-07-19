import twilio from 'twilio';
import { smsConfig } from '@suara/config';
import { normalizePhoneNumber, validatePhoneNumber, generateOtp, RateLimiter } from '../providers/session';

export interface OtpResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export interface OtpVerificationResult {
  success: boolean;
  valid: boolean;
  error?: string;
}

// Rate limiters
const sendOtpLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour
const verifyOtpLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

// OTP storage (in production, use Redis)
interface OtpRecord {
  code: string;
  phone: string;
  createdAt: Date;
  attempts: number;
}

const otpStorage = new Map<string, OtpRecord>();

/**
 * Initialize Twilio client
 */
function getTwilioClient() {
  if (!smsConfig.enabled) {
    throw new Error('SMS service is not configured');
  }
  
  return twilio(smsConfig.accountSid, smsConfig.authToken);
}

/**
 * Send OTP via SMS
 */
export async function sendOtp(phone: string): Promise<OtpResult> {
  try {
    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      return {
        success: false,
        error: 'Invalid phone number format',
      };
    }
    
    const normalizedPhone = normalizePhoneNumber(phone);
    
    // Check rate limiting
    if (sendOtpLimiter.isRateLimited(normalizedPhone)) {
      const resetTime = sendOtpLimiter.getResetTime(normalizedPhone);
      return {
        success: false,
        error: `Too many attempts. Try again in ${Math.ceil(resetTime / 60000)} minutes.`,
      };
    }
    
    // Generate OTP
    const otpCode = generateOtp(6);
    const otpKey = `otp:${normalizedPhone}`;
    
    // Store OTP (expires in 10 minutes)
    otpStorage.set(otpKey, {
      code: otpCode,
      phone: normalizedPhone,
      createdAt: new Date(),
      attempts: 0,
    });
    
    // Clean up expired OTPs
    setTimeout(() => {
      otpStorage.delete(otpKey);
    }, 10 * 60 * 1000); // 10 minutes
    
    // Send SMS in development mode (log instead of sending)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 OTP for ${normalizedPhone}: ${otpCode}`);
      return {
        success: true,
        sid: 'dev-mode',
      };
    }
    
    // Send SMS via Twilio
    const client = getTwilioClient();
    const message = await client.messages.create({
      body: `Kode verifikasi Suara.id Anda: ${otpCode}. Berlaku 10 menit. Jangan bagikan kode ini.`,
      from: smsConfig.phoneNumber,
      to: normalizedPhone,
    });
    
    return {
      success: true,
      sid: message.sid,
    };
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return {
      success: false,
      error: 'Failed to send verification code',
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOtp(phone: string, code: string): Promise<OtpVerificationResult> {
  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const otpKey = `otp:${normalizedPhone}`;
    
    // Check rate limiting
    if (verifyOtpLimiter.isRateLimited(normalizedPhone)) {
      const resetTime = verifyOtpLimiter.getResetTime(normalizedPhone);
      return {
        success: false,
        valid: false,
        error: `Too many verification attempts. Try again in ${Math.ceil(resetTime / 60000)} minutes.`,
      };
    }
    
    // Get stored OTP
    const otpRecord = otpStorage.get(otpKey);
    if (!otpRecord) {
      return {
        success: false,
        valid: false,
        error: 'Verification code expired or not found',
      };
    }
    
    // Check if OTP is expired (10 minutes)
    const expiryTime = new Date(otpRecord.createdAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expiryTime) {
      otpStorage.delete(otpKey);
      return {
        success: false,
        valid: false,
        error: 'Verification code expired',
      };
    }
    
    // Increment attempt count
    otpRecord.attempts++;
    
    // Check max attempts (5 attempts per OTP)
    if (otpRecord.attempts > 5) {
      otpStorage.delete(otpKey);
      return {
        success: false,
        valid: false,
        error: 'Too many attempts. Please request a new code.',
      };
    }
    
    // Verify code
    const isValid = otpRecord.code === code.trim();
    
    if (isValid) {
      // Clear OTP on successful verification
      otpStorage.delete(otpKey);
      // Clear rate limiting on success
      verifyOtpLimiter.clearAttempts(normalizedPhone);
    }
    
    return {
      success: true,
      valid: isValid,
      error: isValid ? undefined : 'Invalid verification code',
    };
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return {
      success: false,
      valid: false,
      error: 'Verification failed',
    };
  }
}

/**
 * Resend OTP (with cooldown)
 */
export async function resendOtp(phone: string): Promise<OtpResult> {
  const normalizedPhone = normalizePhoneNumber(phone);
  
  // Check if there's an existing OTP that's still fresh (wait at least 1 minute)
  const otpKey = `otp:${normalizedPhone}`;
  const existingOtp = otpStorage.get(otpKey);
  
  if (existingOtp) {
    const timeSinceCreated = Date.now() - existingOtp.createdAt.getTime();
    if (timeSinceCreated < 60 * 1000) { // 1 minute cooldown
      const waitTime = Math.ceil((60 * 1000 - timeSinceCreated) / 1000);
      return {
        success: false,
        error: `Please wait ${waitTime} seconds before requesting a new code.`,
      };
    }
  }
  
  // Clear existing OTP and send new one
  otpStorage.delete(otpKey);
  return sendOtp(phone);
}

/**
 * Check OTP status without verifying
 */
export function getOtpStatus(phone: string): {
  exists: boolean;
  expiresAt?: Date;
  attemptsRemaining?: number;
} {
  const normalizedPhone = normalizePhoneNumber(phone);
  const otpKey = `otp:${normalizedPhone}`;
  const otpRecord = otpStorage.get(otpKey);
  
  if (!otpRecord) {
    return { exists: false };
  }
  
  const expiresAt = new Date(otpRecord.createdAt.getTime() + 10 * 60 * 1000);
  const attemptsRemaining = Math.max(0, 5 - otpRecord.attempts);
  
  return {
    exists: true,
    expiresAt,
    attemptsRemaining,
  };
}

/**
 * Clean up expired OTPs (utility function)
 */
export function cleanupExpiredOtps(): void {
  const now = new Date();
  
  for (const [key, record] of otpStorage.entries()) {
    const expiryTime = new Date(record.createdAt.getTime() + 10 * 60 * 1000);
    if (now > expiryTime) {
      otpStorage.delete(key);
    }
  }
}

// Cleanup expired OTPs every 5 minutes
setInterval(cleanupExpiredOtps, 5 * 60 * 1000);