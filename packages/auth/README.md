# @suara/auth

Authentication and verification system for Suara.id with Indonesian context and progressive trust scoring.

## 🎯 Overview

This package provides a comprehensive authentication system designed specifically for Indonesian users, featuring:

- **Progressive Verification**: Phone → KTP → Selfie → Social media verification
- **Trust Scoring**: Dynamic trust levels (Basic 1.0-2.0, Verified 2.1-4.0, Premium 4.1-5.0)
- **Indonesian Context**: KTP NIK validation, phone number formats, administrative structure
- **Anti-Abuse**: Sophisticated fraud detection and rate limiting
- **Social Integration**: Facebook, Instagram, WhatsApp Business verification

## 📁 Package Structure

```
packages/auth/
├── src/
│   ├── verification/          # Identity verification system
│   │   ├── phone.ts          # Indonesian phone + SMS OTP
│   │   ├── ktp.ts            # KTP document verification with OCR
│   │   ├── selfie.ts         # Facial recognition + liveness detection
│   │   └── index.ts          # Verification orchestrator
│   ├── social/               # Social media integration
│   │   ├── facebook.ts       # Facebook OAuth + trust scoring
│   │   ├── instagram.ts      # Instagram Business verification
│   │   ├── whatsapp.ts       # WhatsApp Business integration
│   │   └── types.ts          # Social media interfaces
│   ├── providers/            # Core authentication providers
│   │   ├── jwt.ts            # JWT token management
│   │   └── session.ts        # Session handling + phone utilities
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # Authentication middleware
│   │   └── trust-level.ts    # Trust level guards
│   └── __tests__/            # Comprehensive test suite
│       ├── setup.ts          # Test configuration
│       ├── ktp.test.ts       # KTP verification tests
│       └── phone.test.ts     # Phone verification tests
└── package.json
```

## ✨ Key Features

### 🇮🇩 Indonesian Phone Verification
```typescript
import { sendOtp, verifyOtp, normalizePhoneNumber } from '@suara/auth';

// Handles all Indonesian formats: 08xx, 8xx, +628xx, 628xx
const normalized = normalizePhoneNumber('08123456789'); // → '+628123456789'

// Send OTP with Indonesian message
const result = await sendOtp('08123456789');
// SMS: "Kode verifikasi Suara.id Anda: 123456. Berlaku 10 menit..."

// Verify with rate limiting
const verification = await verifyOtp('08123456789', '123456');
```

### 🆔 Indonesian KTP Verification
```typescript
import { verifyKtp, validateNik } from '@suara/auth';

// Validate NIK format with demographic extraction
const nikResult = validateNik('3171154567890123');
// Extracts: province=31, gender='M', birthDate=15/04/1967

// Complete KTP verification with OCR
const ktpImage = await fs.readFile('ktp.jpg');
const result = await verifyKtp(ktpImage, {
  name: "BUDI SANTOSO",
  nik: "3171154567890123"
});

if (result.valid) {
  console.log(`Verified: ${result.extractedData.name}`);
  console.log(`Confidence: ${result.confidence * 100}%`);
}
```

### 📱 Selfie Verification with Anti-Spoofing
```typescript
import { verifySelfie } from '@suara/auth';

// Advanced facial verification with liveness detection
const selfieBuffer = await fs.readFile('selfie.jpg');
const result = await verifySelfie(selfieBuffer, ktpPhotoBuffer);

if (result.valid) {
  console.log(`Face match: ${result.faceComparison.similarity * 100}%`);
  console.log(`Liveness passed: ${result.livenessCheck.isLive}`);
}
```

### 🌐 Social Media Trust Scoring
```typescript
import { SocialMediaManager } from '@suara/auth';

const socialManager = new SocialMediaManager();

// Verify Facebook account with trust scoring
const fbResult = await socialManager.verifyAccount('facebook', accessToken, userId);

if (fbResult.valid) {
  console.log(`Trust score: ${fbResult.trustScore.score}`);
  console.log(`Account age: ${fbResult.trustScore.factors.accountAge}`);
  console.log(`Followers: ${fbResult.profile.followerCount}`);
}
```

### 🛡️ Complete Verification Orchestration
```typescript
import { VerificationManager } from '@suara/auth';

const verificationManager = new VerificationManager();

// Get current verification status
const status = await verificationManager.getVerificationStatus(userId);
console.log(`Current level: ${status.currentLevel}`);
console.log(`Trust score: ${status.currentScore}`);
console.log(`Next steps: ${status.nextRequirements}`);

// Complete verification workflow
const ktpResult = await verificationManager.startKtpVerification(userId, ktpImageBuffer);
const selfieResult = await verificationManager.startSelfieVerification(userId, selfieBuffer);
const socialResult = await verificationManager.startSocialVerification(userId, 'facebook', token);
```

## 🔒 Trust Level System

### Trust Levels & Benefits

| Level | Score Range | Requirements | Benefits |
|-------|------------|--------------|----------|
| **Basic** | 1.0-2.0 | Phone verification | 3 submissions/day, 0.3x clustering weight |
| **Verified** | 2.1-4.0 | + KTP + Selfie | 10 submissions/day, 0.7x weight, tracking |
| **Premium** | 4.1-5.0 | + Social + Community | 20 submissions/day, 1.0x weight, priority |

### Middleware Usage
```typescript
import { authenticate, requireVerified, requirePremium } from '@suara/auth';

// Basic authentication
app.use('/api/user', authenticate);

// Require verified level
app.use('/api/submissions', authenticate, requireVerified);

// Require premium level
app.use('/api/priority', authenticate, requirePremium);

// Custom trust level check
app.use('/api/admin', authenticate, requireTrustLevel('PREMIUM'));
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# CI pipeline tests
npm run test:ci
```

### Test Coverage Requirements
- **80% minimum coverage** for all functions
- **Indonesian-specific test cases** for NIK validation, phone formats
- **Mock services** for OCR, facial recognition, social media APIs
- **Integration tests** for complete verification flows

### Example Test Usage
```typescript
import { ktpTestUtils, phoneTestUtils } from '@suara/auth';

// Generate valid Indonesian test data
const validNik = ktpTestUtils.generateValidNik({
  provinsi: 31, // Jakarta
  gender: 'F',
  day: 15,
  month: 4,
  year: 1990
});

const validPhone = phoneTestUtils.generateValidIndonesianNumber('telkomsel');
```

## ⚙️ Configuration

### Environment Variables
```bash
# Twilio SMS (required for production)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+62123456789

# JWT Configuration
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# OCR Services (optional, falls back to mock in development)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-southeast-1

# Social Media OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_secret
INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_secret
```

### Development vs Production
```typescript
// Development mode uses mocks for external services
if (process.env.NODE_ENV === 'development') {
  // Mock OCR returns sample Indonesian KTP data
  // Mock facial recognition returns high similarity
  // Mock social media returns validated profiles
}
```

## 🚀 Quick Start

1. **Install dependencies**
```bash
cd packages/auth
npm install
```

2. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run tests**
```bash
npm run test
```

4. **Build package**
```bash
npm run build
```

5. **Use in your application**
```typescript
import { VerificationManager, authenticate } from '@suara/auth';

const app = express();
app.use('/api', authenticate);

const verificationManager = new VerificationManager();
```

## 📚 API Reference

### Core Functions

#### Phone Verification
- `sendOtp(phone: string)` - Send SMS OTP to Indonesian number
- `verifyOtp(phone: string, code: string)` - Verify OTP code
- `normalizePhoneNumber(phone: string)` - Normalize Indonesian phone format
- `validatePhoneNumber(phone: string)` - Validate Indonesian mobile number

#### KTP Verification
- `verifyKtp(imageBuffer: Buffer, userData?: Partial<KtpData>)` - Complete KTP verification
- `validateNik(nik: string)` - Validate Indonesian NIK format
- `extractKtpText(imageBuffer: Buffer)` - OCR text extraction
- `parseKtpText(ocrText: string)` - Parse KTP data from text

#### Selfie Verification
- `verifySelfie(selfieBuffer: Buffer, ktpPhotoBuffer?: Buffer)` - Facial verification
- `detectFace(imageBuffer: Buffer)` - Face detection with quality analysis
- `compareFaces(image1: Buffer, image2: Buffer)` - Face similarity comparison
- `detectLiveness(imageBuffer: Buffer)` - Anti-spoofing detection

#### Social Media
- `SocialMediaManager` - Main social verification orchestrator
- `FacebookProvider` - Facebook OAuth and trust scoring
- `InstagramProvider` - Instagram business verification
- `WhatsAppProvider` - WhatsApp Business integration

### Middleware
- `authenticate` - JWT authentication with user loading
- `optionalAuthenticate` - Optional authentication for public endpoints
- `requirePhoneVerification` - Require phone verification
- `requireTrustLevel(level)` - Require specific trust level
- `trustBasedRateLimit()` - Dynamic rate limiting by trust level

## 🔧 Development

### Code Quality Standards
- **TypeScript strict mode** with comprehensive type coverage
- **ESLint + Prettier** for consistent code formatting
- **JSDoc documentation** for all public functions
- **Indonesian context** in all examples and test cases

### Contributing
1. Follow established patterns for error handling and Indonesian data
2. Add comprehensive tests for new features
3. Update documentation with examples
4. Ensure 80%+ test coverage

## 🛠️ Troubleshooting

### Common Issues

**Phone verification fails**
- Check Indonesian phone number format
- Verify Twilio configuration
- Check rate limiting status

**KTP verification low confidence**
- Ensure good image quality (bright, clear, no glare)
- Check OCR service configuration
- Verify Indonesian administrative data

**Social verification fails**
- Check OAuth configuration
- Verify account age requirements
- Review bot detection patterns

## 📄 License

MIT License - see LICENSE file for details.

---

**Indonesian Context**: This package is specifically designed for Indonesian users and includes comprehensive support for local data formats, administrative structures, and cultural patterns.