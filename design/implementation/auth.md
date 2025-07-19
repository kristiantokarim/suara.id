# Authentication Implementation Documentation
## Suara.id Authentication & Verification System

### Overview

The authentication system for Suara.id is designed around Indonesian mobile-first usage patterns, featuring phone number-based registration, progressive trust verification, and integration with Indonesia-specific identity documents (KTP). The system balances accessibility with security through a multi-tier trust model.

### Architecture Decisions

#### 1. **Phone-First Authentication**
- **Why**: Phone numbers are primary identifiers in Indonesia, higher penetration than email
- **Pattern**: OTP-based verification with SMS delivery
- **Security**: Rate limiting, attempt tracking, geographic validation

#### 2. **Progressive Trust Verification**
- **Basic Level**: Phone verification only - immediate access
- **Verified Level**: KTP + selfie verification - enhanced privileges  
- **Premium Level**: Social media + community verification - maximum trust

#### 3. **JWT with Refresh Token Strategy**
- **Access Tokens**: Short-lived (7 days), contain user context
- **Refresh Tokens**: Long-lived (30 days), for seamless re-authentication
- **Stateless Design**: No server-side session storage required

### Authentication Flow Implementation

#### Phone Number Registration

```typescript
// Indonesian phone number normalization
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  // Handle Indonesian formats:
  // 08xxx-xxxx-xxxx → +628xxx-xxxx-xxxx
  // 628xxx-xxxx-xxxx → +628xxx-xxxx-xxxx  
  // 8xxx-xxxx-xxxx → +628xxx-xxxx-xxxx
  
  if (digits.startsWith('0')) {
    return '+62' + digits.substring(1);
  } else if (digits.startsWith('62')) {
    return '+' + digits;
  } else if (digits.startsWith('8')) {
    return '+62' + digits;
  }
  
  return digits.startsWith('+') ? digits : '+' + digits;
}

// Indonesian mobile number validation
export function validatePhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  // Indonesian mobile: +62 8xx-xxxx-xxxx (10-13 digits after 62)
  const indonesianMobileRegex = /^\+628\d{8,11}$/;
  
  return indonesianMobileRegex.test(normalized);
}
```

**Design Rationale:**
- **Flexible Input**: Accepts multiple Indonesian phone formats
- **Normalization**: Consistent storage format (+628xxxxxxxxx)
- **Validation**: Strict regex to prevent invalid numbers
- **Geographic Scope**: Indonesian mobile numbers only

#### OTP Generation and Delivery

```typescript
export async function sendOtp(phone: string): Promise<OtpResult> {
  const normalizedPhone = normalizePhoneNumber(phone);
  
  // Rate limiting check
  if (sendOtpLimiter.isRateLimited(normalizedPhone)) {
    const resetTime = sendOtpLimiter.getResetTime(normalizedPhone);
    return {
      success: false,
      error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(resetTime / 60000)} menit.`,
    };
  }
  
  // Generate 6-digit OTP
  const otpCode = generateOtp(6);
  
  // Store with 10-minute expiry
  const otpRecord: OtpRecord = {
    code: otpCode,
    phone: normalizedPhone,
    createdAt: new Date(),
    attempts: 0,
  };
  
  otpStorage.set(`otp:${normalizedPhone}`, otpRecord);
  
  // Send via Twilio with Indonesian message
  const message = await twilioClient.messages.create({
    body: `Kode verifikasi Suara.id Anda: ${otpCode}. Berlaku 10 menit. Jangan bagikan kode ini.`,
    from: smsConfig.phoneNumber,
    to: normalizedPhone,
  });
  
  return { success: true, sid: message.sid };
}
```

**Security Features:**
- **Rate Limiting**: 3 attempts per hour per phone number
- **Expiry**: 10-minute OTP validity
- **Attempt Tracking**: Maximum 5 verification attempts per OTP
- **Indonesian Language**: SMS in Bahasa Indonesia
- **Anti-Sharing**: Clear warning against sharing codes

#### JWT Token Management

```typescript
export interface JwtPayload {
  userId: string;
  phone: string;
  trustLevel: TrustLevel;
  iat: number;
  exp: number;
}

export function generateAccessToken(user: {
  id: string;
  phone: string;
  trustLevel: TrustLevel;
}): string {
  const payload = {
    userId: user.id,
    phone: user.phone,
    trustLevel: user.trustLevel,
  };

  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn, // 7 days
    issuer: 'suara.id',
    audience: 'suara.id-users',
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, authConfig.jwtSecret, {
      issuer: 'suara.id',
      audience: 'suara.id-users',
      algorithms: ['HS256'],
    }) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}
```

**Token Design:**
- **Trust Level Inclusion**: Access control based on verification status
- **Indonesian Context**: Phone number as secondary identifier
- **Security Claims**: Proper issuer/audience validation
- **Error Handling**: Specific error types for different failure modes

### Trust Verification System

#### KTP (Indonesian ID Card) Verification

```typescript
export interface KtpVerificationRequest {
  documentImage: string; // base64 encoded KTP image
  selfieImage: string;   // base64 encoded user selfie
}

export async function verifyKtp(
  request: KtpVerificationRequest
): Promise<KtpVerificationResult> {
  // Step 1: Document OCR processing
  const ocrResult = await extractKtpData(request.documentImage);
  
  if (ocrResult.confidence < LIMITS.VERIFICATION.MIN_KTP_CONFIDENCE) {
    return {
      success: false,
      error: 'Dokumen tidak dapat dibaca dengan jelas. Pastikan foto KTP terlihat jelas.',
    };
  }
  
  // Step 2: Document authenticity check
  const authenticityCheck = await validateKtpAuthenticity(ocrResult);
  
  if (!authenticityCheck.valid) {
    return {
      success: false,
      error: 'Dokumen tidak valid. Pastikan menggunakan KTP asli.',
    };
  }
  
  // Step 3: Face matching
  const faceMatch = await compareFaces(
    ocrResult.extractedPhoto,
    request.selfieImage
  );
  
  if (faceMatch.confidence < LIMITS.VERIFICATION.MIN_FACE_MATCH_CONFIDENCE) {
    return {
      success: false,
      error: 'Wajah pada selfie tidak cocok dengan foto KTP.',
    };
  }
  
  return {
    success: true,
    confidence: Math.min(ocrResult.confidence, faceMatch.confidence),
    extractedData: {
      name: ocrResult.name,
      nik: ocrResult.nik, // Nomor Induk Kependudukan
      address: ocrResult.address,
      dateOfBirth: ocrResult.dateOfBirth,
      placeOfBirth: ocrResult.placeOfBirth,
    },
    faceMatchConfidence: faceMatch.confidence,
  };
}
```

**KTP-Specific Processing:**
- **OCR Optimization**: Trained on Indonesian KTP format
- **Field Recognition**: NIK, name, address, birth details
- **Authenticity Checks**: Security features, format validation
- **Privacy Protection**: Extracted data encrypted before storage

#### Social Media Verification

```typescript
export async function verifySocialMedia(
  request: SocialVerificationRequest
): Promise<SocialVerificationResult> {
  const { platform, accessToken, profileUrl } = request;
  
  // Platform-specific verification
  switch (platform) {
    case 'facebook':
      return verifyFacebookProfile(accessToken, profileUrl);
    case 'instagram':
      return verifyInstagramProfile(accessToken, profileUrl);
    case 'whatsapp':
      return verifyWhatsAppBusiness(accessToken, profileUrl);
    default:
      throw new Error('Platform tidak didukung');
  }
}

async function verifyFacebookProfile(
  accessToken: string,
  profileUrl?: string
): Promise<SocialVerificationResult> {
  // Fetch profile information
  const profile = await fetchFacebookProfile(accessToken);
  
  // Verification criteria for Indonesian context
  const checks = {
    accountAge: profile.createdDate < new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
    hasProfilePhoto: !!profile.picture,
    hasRealName: profile.name && profile.name.length > 3,
    hasFriends: profile.friendCount > 10,
    hasActivity: profile.recentPosts && profile.recentPosts.length > 0,
    locationMatch: profile.location && profile.location.includes('Indonesia'),
  };
  
  const score = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;
  
  return {
    success: true,
    platform: 'facebook',
    profileData: {
      id: profile.id,
      name: profile.name,
      profileUrl: profile.link,
      accountAge: profile.createdDate,
    },
    confidence: score,
    verificationDetails: checks,
  };
}
```

**Social Verification Strategy:**
- **Multi-Platform**: Support for popular platforms in Indonesia
- **Quality Metrics**: Account age, activity, friend connections
- **Geographic Context**: Indonesian location preference
- **Privacy Respect**: Minimal data collection, user consent required

### Rate Limiting and Security

#### Advanced Rate Limiting

```typescript
export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number,
    private penaltyMs: number = 0 // Progressive penalty
  ) {}
  
  isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
        violations: record?.violations || 0,
      });
      return false;
    }
    
    if (record.count >= this.maxAttempts) {
      // Apply progressive penalty for repeated violations
      if (record.violations > 0) {
        const penaltyMultiplier = Math.min(record.violations, 5);
        record.resetTime = now + (this.windowMs * penaltyMultiplier);
      }
      
      record.violations++;
      return true;
    }
    
    record.count++;
    return false;
  }
  
  // Anti-enumeration: Different limits for different operations
  static createOtpLimiter() {
    return new RateLimiter(3, 60 * 60 * 1000, 30 * 60 * 1000); // 3/hour, 30min penalty
  }
  
  static createVerifyLimiter() {
    return new RateLimiter(5, 15 * 60 * 1000, 5 * 60 * 1000); // 5/15min, 5min penalty
  }
  
  static createKtpLimiter() {
    return new RateLimiter(3, 24 * 60 * 60 * 1000); // 3/day for KTP attempts
  }
}
```

#### Security Patterns

```typescript
// Input sanitization for Indonesian context
export function sanitizePhoneNumber(input: string): string {
  // Remove common Indonesian number formatting
  return input
    .replace(/[\s\-\(\)\.]/g, '') // Remove spaces, dashes, parens, dots
    .replace(/^(\+62|62|0)/, '+62') // Normalize country code
    .replace(/[^\d\+]/g, ''); // Keep only digits and +
}

// Prevent timing attacks on OTP verification
export async function constantTimeOtpVerify(
  storedOtp: string,
  providedOtp: string
): Promise<boolean> {
  // Always perform the same number of operations
  let result = 0;
  const maxLength = Math.max(storedOtp.length, providedOtp.length);
  
  for (let i = 0; i < maxLength; i++) {
    const a = i < storedOtp.length ? storedOtp.charCodeAt(i) : 0;
    const b = i < providedOtp.length ? providedOtp.charCodeAt(i) : 0;
    result |= a ^ b;
  }
  
  // Add random delay to prevent timing analysis
  await new Promise(resolve => {
    setTimeout(resolve, Math.random() * 100 + 50);
  });
  
  return result === 0 && storedOtp.length === providedOtp.length;
}

// Geographic validation for Indonesian phone numbers
export function validateIndonesianMobile(phone: string): {
  valid: boolean;
  carrier?: string;
  region?: string;
} {
  const normalized = normalizePhoneNumber(phone);
  
  // Indonesian carrier prefixes
  const carriers = {
    '811': 'Telkomsel (Halo)',
    '812': 'Telkomsel (simPATI)',
    '813': 'Telkomsel (simPATI)',
    '821': 'Telkomsel (As)',
    '822': 'Telkomsel (As)',
    '852': 'Telkomsel (As)',
    '853': 'Telkomsel (As)',
    '814': 'XL',
    '815': 'Indosat',
    '816': 'Indosat',
    '855': 'Indosat',
    '856': 'Indosat',
    '857': 'Indosat',
    '858': 'Indosat',
    '817': 'XL',
    '818': 'XL',
    '819': 'XL',
    '859': 'XL',
    '877': 'XL',
    '878': 'XL',
    '838': 'Axis',
    '831': 'Axis',
    '832': 'Axis',
    '833': 'Axis',
    '895': 'Three',
    '896': 'Three',
    '897': 'Three',
    '898': 'Three',
    '899': 'Three',
  };
  
  if (normalized.startsWith('+628')) {
    const prefix = normalized.substring(4, 7);
    const carrier = carriers[prefix];
    
    return {
      valid: !!carrier,
      carrier,
      region: 'Indonesia',
    };
  }
  
  return { valid: false };
}
```

### Trust Score Integration

#### Trust Level Calculation

```typescript
export async function calculateTrustScore(userId: string): Promise<TrustScoreBreakdown> {
  const user = await getUserWithVerifications(userId);
  const userStats = await getUserStats(userId);
  
  let score = 1.0; // Base score
  const factors: TrustFactors = {
    phoneVerification: 0,
    ktpVerification: 0,
    selfieVerification: 0,
    socialVerification: 0,
    communityEndorsements: 0,
    historicalAccuracy: 0,
    submissionHistory: 0,
  };
  
  // Verification bonuses
  if (user.phoneVerified) {
    factors.phoneVerification = LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS;
    score += factors.phoneVerification;
  }
  
  const ktpVerification = user.verifications.find(v => v.type === 'KTP' && v.status === 'APPROVED');
  if (ktpVerification) {
    factors.ktpVerification = LIMITS.TRUST_SCORE.KTP_VERIFICATION_BONUS;
    score += factors.ktpVerification;
  }
  
  const selfieVerification = user.verifications.find(v => v.type === 'SELFIE' && v.status === 'APPROVED');
  if (selfieVerification) {
    factors.selfieVerification = LIMITS.TRUST_SCORE.SELFIE_VERIFICATION_BONUS;
    score += factors.selfieVerification;
  }
  
  // Social media verification
  const socialVerifications = user.verifications.filter(v => 
    v.type.startsWith('SOCIAL_') && v.status === 'APPROVED'
  );
  if (socialVerifications.length > 0) {
    factors.socialVerification = LIMITS.TRUST_SCORE.SOCIAL_VERIFICATION_BONUS;
    score += factors.socialVerification;
  }
  
  // Community endorsements (max 0.5 points)
  const endorsementCount = user.endorsements.length;
  factors.communityEndorsements = Math.min(
    endorsementCount * LIMITS.TRUST_SCORE.COMMUNITY_ENDORSEMENT_BONUS,
    0.5
  );
  score += factors.communityEndorsements;
  
  // Historical accuracy (based on resolved issues)
  if (userStats.submissionCount > 0) {
    const accuracyRatio = userStats.resolvedSubmissions / userStats.submissionCount;
    factors.historicalAccuracy = accuracyRatio * LIMITS.TRUST_SCORE.ACCURACY_BONUS_MAX;
    score += factors.historicalAccuracy;
  }
  
  // Submission history bonus (experience)
  if (userStats.submissionCount > 5) {
    factors.submissionHistory = Math.min(
      userStats.submissionCount * 0.01,
      LIMITS.TRUST_SCORE.SUBMISSION_HISTORY_MAX
    );
    score += factors.submissionHistory;
  }
  
  // Cap at maximum score
  const finalScore = Math.min(score, LIMITS.TRUST_SCORE.MAX);
  
  // Determine trust level
  let level: TrustLevel = 'BASIC';
  if (finalScore >= LIMITS.TRUST_SCORE.PREMIUM_THRESHOLD) {
    level = 'PREMIUM';
  } else if (finalScore >= LIMITS.TRUST_SCORE.VERIFIED_THRESHOLD) {
    level = 'VERIFIED';
  }
  
  return {
    currentScore: finalScore,
    level,
    factors,
    nextLevelRequirements: getNextLevelRequirements(level, factors),
  };
}
```

### Middleware and Request Context

#### Authentication Middleware

```typescript
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    phone: string;
    trustLevel: TrustLevel;
    name?: string;
    language: string;
  };
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Token otentikasi diperlukan',
        },
      });
    }
    
    const payload = verifyToken(token);
    
    // Fetch current user data (trust level might have changed)
    const user = await getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Pengguna tidak ditemukan',
        },
      });
    }
    
    // Attach user context to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      phone: user.phone,
      trustLevel: user.trustScore?.trustLevel || 'BASIC',
      name: user.name || undefined,
      language: user.language,
    };
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token tidak valid atau sudah kedaluwarsa',
      },
    });
  }
};

// Trust level authorization
export const requireTrustLevel = (minLevel: TrustLevel) => 
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!hasRequiredTrustLevel(req.user.trustLevel, minLevel)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_TRUST_LEVEL',
          message: `Diperlukan tingkat kepercayaan ${minLevel} atau lebih tinggi`,
        },
      });
    }
    next();
  };
```

### Future Considerations

#### 1. **Enhanced Verification Methods**
- **Biometric Integration**: Fingerprint/face unlock for mobile apps
- **Digital Signature**: Integration with Indonesian digital identity systems
- **Bank Account Verification**: Link with Indonesian banking APIs

#### 2. **Advanced Security Features**
- **Device Fingerprinting**: Detect suspicious login patterns
- **Behavioral Analytics**: Monitor for automated/bot behavior
- **Risk Scoring**: Dynamic risk assessment based on user behavior

#### 3. **Government Integration**
- **Dukcapil Integration**: Direct verification with Indonesian civil registry
- **SIAK Integration**: Population administration system connection
- **E-ID Support**: Integration with Indonesian electronic ID systems

#### 4. **Scalability Improvements**
- **Distributed Rate Limiting**: Redis-based rate limiting for multi-instance deployment
- **Verification Queue**: Async processing for KTP verification workloads
- **Cache Optimization**: Trust score caching with intelligent invalidation

This authentication architecture provides a secure, scalable foundation tailored specifically for Indonesian users while maintaining the flexibility to evolve with changing requirements and government integrations.