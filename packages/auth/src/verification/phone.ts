import twilio from 'twilio';
import { smsConfig, validateIndonesianPhone, validateOtpVerification, type Result, success, failure } from '@suara/config';
import { generateOtp, RateLimiter } from '../providers/session';

export interface OtpData {
  sid: string;
  expiresAt: Date;
}

export interface OtpVerificationData {
  userId?: string;
  verified: boolean;
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
 * Send OTP via SMS with Zod validation and Result pattern
 * 
 * @param phone - Indonesian phone number to send OTP to
 * @returns Result containing OTP data or error
 * 
 * @example
 * ```typescript
 * const result = await sendOtp('08123456789');
 * if (result.success) {
 *   console.log(`OTP sent, SID: ${result.data.sid}`);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function sendOtp(phone: string): Promise<Result<OtpData>> {
  try {
    // Validate phone number using Zod
    const phoneValidation = validateIndonesianPhone(phone);
    if (!phoneValidation.success) {
      return failure(phoneValidation.error, phoneValidation.issues);
    }
    
    const normalizedPhone = phoneValidation.data;
    
    // Check rate limiting
    if (sendOtpLimiter.isRateLimited(normalizedPhone)) {
      const resetTime = sendOtpLimiter.getResetTime(normalizedPhone);
      return failure(
        `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(resetTime / 60000)} menit.`,
        ['Rate limit exceeded']
      );
    }
    
    // Generate OTP
    const otpCode = generateOtp(6);
    const otpKey = `otp:${normalizedPhone}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
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
      return success({
        sid: 'dev-mode-' + Date.now(),
        expiresAt,
      });
    }
    
    // Send SMS via Twilio
    const client = getTwilioClient();
    const message = await client.messages.create({
      body: `Kode verifikasi Suara.id Anda: ${otpCode}. Berlaku 10 menit. Jangan bagikan kode ini.`,
      from: smsConfig.phoneNumber,
      to: normalizedPhone,
    });
    
    return success({
      sid: message.sid,
      expiresAt,
    });

  } catch (error) {
    console.error('Failed to send OTP:', error);
    return failure(
      'Gagal mengirim kode verifikasi', 
      [error instanceof Error ? error.message : 'SMS service error']
    );
  }
}

/**
 * Verify OTP code with Zod validation and Result pattern
 * 
 * @param phone - Indonesian phone number
 * @param code - 6-digit OTP code
 * @returns Result containing verification status
 * 
 * @example
 * ```typescript
 * const result = await verifyOtp('08123456789', '123456');
 * if (result.success && result.data.verified) {
 *   console.log('OTP verified successfully');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function verifyOtp(
  phone: string, 
  code: string
): Promise<Result<OtpVerificationData>> {
  try {
    // Validate input using Zod
    const validation = validateOtpVerification({ phone, code });
    if (!validation.success) {
      return failure(validation.error, validation.issues);
    }

    const { phone: normalizedPhone, code: otpCode } = validation.data;
    const otpKey = `otp:${normalizedPhone}`;
    
    // Check rate limiting
    if (verifyOtpLimiter.isRateLimited(normalizedPhone)) {
      const resetTime = verifyOtpLimiter.getResetTime(normalizedPhone);
      return failure(
        `Terlalu banyak percobaan verifikasi. Coba lagi dalam ${Math.ceil(resetTime / 60000)} menit.`,
        ['Rate limit exceeded']
      );
    }
    
    // Get stored OTP
    const otpRecord = otpStorage.get(otpKey);
    if (!otpRecord) {
      return failure(
        'Kode verifikasi tidak ditemukan atau sudah kedaluwarsa',
        ['OTP not found']
      );
    }
    
    // Check if OTP is expired (10 minutes)
    const expiryTime = new Date(otpRecord.createdAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expiryTime) {
      otpStorage.delete(otpKey);
      return failure(
        'Kode verifikasi sudah kedaluwarsa',
        ['OTP expired']
      );
    }
    
    // Increment attempt count
    otpRecord.attempts++;
    
    // Check max attempts (5 attempts per OTP)
    if (otpRecord.attempts > 5) {
      otpStorage.delete(otpKey);
      return failure(
        'Terlalu banyak percobaan. Silakan minta kode baru.',
        ['Max attempts exceeded']
      );
    }
    
    // Verify code
    const isValid = otpRecord.code === otpCode.trim();
    
    if (isValid) {
      // Clear OTP on successful verification
      otpStorage.delete(otpKey);
      // Clear rate limiting on success
      verifyOtpLimiter.clearAttempts(normalizedPhone);
      
      return success({
        verified: true,
      });
    } else {
      return failure(
        'Kode verifikasi tidak valid',
        ['Invalid OTP code']
      );
    }
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return failure(
      'Gagal memverifikasi kode OTP',
      [error instanceof Error ? error.message : 'Verification service error']
    );
  }
}

/**
 * Resend OTP (with cooldown)
 * 
 * @param phone - Indonesian phone number
 * @returns Result containing OTP data or error
 * 
 * @example
 * ```typescript
 * const result = await resendOtp('08123456789');
 * if (result.success) {
 *   console.log('OTP resent successfully');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function resendOtp(phone: string): Promise<Result<OtpData>> {
  try {
    // Validate phone number using Zod
    const phoneValidation = validateIndonesianPhone(phone);
    if (!phoneValidation.success) {
      return failure(phoneValidation.error, phoneValidation.issues);
    }
    
    const normalizedPhone = phoneValidation.data;
    
    // Check if there's an existing OTP that's still fresh (wait at least 1 minute)
    const otpKey = `otp:${normalizedPhone}`;
    const existingOtp = otpStorage.get(otpKey);
    
    if (existingOtp) {
      const timeSinceCreated = Date.now() - existingOtp.createdAt.getTime();
      if (timeSinceCreated < 60 * 1000) { // 1 minute cooldown
        const waitTime = Math.ceil((60 * 1000 - timeSinceCreated) / 1000);
        return failure(
          `Harap tunggu ${waitTime} detik sebelum meminta kode baru.`,
          ['Cooldown period active']
        );
      }
    }
    
    // Clear existing OTP and send new one
    otpStorage.delete(otpKey);
    return sendOtp(phone);
    
  } catch (error) {
    console.error('Failed to resend OTP:', error);
    return failure(
      'Gagal mengirim ulang kode verifikasi',
      [error instanceof Error ? error.message : 'Resend service error']
    );
  }
}

/**
 * Check OTP status without verifying
 * 
 * @param phone - Indonesian phone number  
 * @returns Result containing OTP status information
 * 
 * @example
 * ```typescript
 * const result = getOtpStatus('08123456789');
 * if (result.success && result.data.exists) {
 *   console.log(`OTP expires at: ${result.data.expiresAt}`);
 * }
 * ```
 */
export function getOtpStatus(phone: string): Result<{
  exists: boolean;
  expiresAt?: Date;
  attemptsRemaining?: number;
}> {
  try {
    // Validate phone number using Zod
    const phoneValidation = validateIndonesianPhone(phone);
    if (!phoneValidation.success) {
      return failure(phoneValidation.error, phoneValidation.issues);
    }
    
    const normalizedPhone = phoneValidation.data;
    const otpKey = `otp:${normalizedPhone}`;
    const otpRecord = otpStorage.get(otpKey);
    
    if (!otpRecord) {
      return success({ exists: false });
    }
    
    const expiresAt = new Date(otpRecord.createdAt.getTime() + 10 * 60 * 1000);
    const attemptsRemaining = Math.max(0, 5 - otpRecord.attempts);
    
    return success({
      exists: true,
      expiresAt,
      attemptsRemaining,
    });
    
  } catch (error) {
    console.error('Failed to get OTP status:', error);
    return failure(
      'Gagal mendapatkan status OTP',
      [error instanceof Error ? error.message : 'OTP status service error']
    );
  }
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