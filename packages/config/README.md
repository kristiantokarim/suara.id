# Config Package

Shared configurations, constants, and types for the Suara.id platform.

## Structure

```
packages/config/
├── src/
│   ├── env/              # Environment configurations
│   │   ├── development.ts
│   │   ├── production.ts
│   │   └── test.ts
│   ├── constants/        # Shared constants
│   │   ├── categories.ts
│   │   ├── languages.ts
│   │   └── limits.ts
│   ├── types/            # TypeScript types
│   │   ├── user.ts
│   │   ├── submission.ts
│   │   └── scoring.ts
│   └── index.ts          # Main exports
└── package.json
```

## Environment Configuration

### Development
```typescript
export const developmentConfig = {
  database: {
    url: process.env.DATABASE_URL,
    logQueries: true
  },
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    sms: {
      provider: 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID
    }
  }
};
```

### Production
```typescript
export const productionConfig = {
  database: {
    url: process.env.DATABASE_URL,
    ssl: true,
    connectionLimit: 20
  },
  redis: {
    url: process.env.REDIS_URL,
    cluster: true
  },
  storage: {
    provider: 's3',
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION
  }
};
```

## Shared Constants

### Issue Categories
```typescript
export const ISSUE_CATEGORIES = {
  INFRASTRUCTURE: 'infrastructure',
  CLEANLINESS: 'cleanliness', 
  LIGHTING: 'lighting',
  WATER_DRAINAGE: 'water_drainage',
  ENVIRONMENT: 'environment',
  SAFETY: 'safety'
} as const;
```

### Language Support
```typescript
export const SUPPORTED_LANGUAGES = {
  TIER_1: ['id', 'jv', 'su'], // Full support
  TIER_2: ['btk', 'min', 'bug', 'bjn'], // Basic support
  TIER_3: ['*'] // Limited recognition
} as const;
```

### System Limits
```typescript
export const LIMITS = {
  SUBMISSION: {
    MAX_IMAGES: 5,
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_TEXT_LENGTH: 5000,
    DAILY_LIMIT_BASIC: 3,
    DAILY_LIMIT_VERIFIED: 10,
    DAILY_LIMIT_PREMIUM: 20
  },
  TRUST_SCORE: {
    MIN: 1.0,
    MAX: 5.0,
    VERIFICATION_BONUS: 1.0
  }
} as const;
```

## TypeScript Types

### User Types
```typescript
export interface User {
  id: string;
  phone: string;
  trustScore: number;
  verificationLevel: 'basic' | 'verified' | 'premium';
  language: string;
  createdAt: Date;
}

export interface TrustScore {
  userId: string;
  score: number;
  phoneVerified: boolean;
  ktpVerified: boolean;
  selfieVerified: boolean;
  socialVerified: boolean;
  lastUpdated: Date;
}
```

### Submission Types
```typescript
export interface Submission {
  id: string;
  userId: string;
  conversation: ConversationMessage[];
  finalData: SubmissionData;
  qualityScore: number;
  trustWeight: number;
  status: 'pending' | 'processed' | 'rejected';
  createdAt: Date;
}

export interface SubmissionData {
  description: string;
  category: string;
  location: {
    coordinates: [number, number];
    address: string;
    accuracy: number;
  };
  images: string[];
  timestamp: Date;
}
```

## Usage

```typescript
import { 
  getConfig, 
  ISSUE_CATEGORIES, 
  LIMITS,
  type User,
  type Submission 
} from '@suara/config';

// Get environment-specific config
const config = getConfig();

// Use constants
const categories = Object.values(ISSUE_CATEGORIES);
const maxImages = LIMITS.SUBMISSION.MAX_IMAGES;

// TypeScript types
const createUser = (data: Partial<User>): User => {
  // Implementation
};
```

## Environment Variables

Required environment variables by package:

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI Services  
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# Authentication
JWT_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=suara-id-files

# Maps & Location
GOOGLE_MAPS_API_KEY=...
```