// Main authentication exports
export * from './providers/jwt';
export * from './providers/session';

// Verification system
export * from './verification';
export { VerificationManager } from './verification';

// Social media integration
export * from './social';
export { SocialMediaManager } from './social';

// Middleware
export * from './middleware';

// Utility functions
export {
  normalizePhoneNumber,
  validatePhoneNumber,
  formatPhoneNumber,
  generateOtp,
  generateSecureId,
  hashPassword,
  verifyPassword,
  createSessionUser,
  hasRequiredTrustLevel,
  RateLimiter
} from './providers/session';

// Types
export type {
  SessionUser,
  VerificationStep,
  CompleteVerificationResult,
  UserVerificationData,
  KtpData,
  KtpVerificationResult,
  SelfieVerificationResult,
  FaceDetectionResult,
  FaceComparisonResult,
  LivenessDetectionResult,
  SocialProfile,
  SocialAccountTrustScore,
  SocialVerificationResult
} from './verification';

export type {
  SocialAuthConfig
} from './social/types';