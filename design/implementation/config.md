# Configuration Implementation Documentation
## Suara.id Configuration Management

### Overview

The configuration system for Suara.id is built around environment-aware, type-safe configuration management using Zod for validation. It supports Indonesian-specific requirements including multi-language support, local service integrations, and region-specific settings.

### Architecture Decisions

#### 1. **Zod for Environment Validation**
- **Why**: Runtime type safety, clear error messages, transform capabilities
- **Benefits**: Fail-fast on invalid configuration, self-documenting schemas
- **Pattern**: Single source of truth with derived configurations

#### 2. **Hierarchical Configuration Structure**
```typescript
Environment Variables → Zod Validation → Typed Config Objects → Service-Specific Configs
```

#### 3. **Indonesian Context Integration**
- **Language Tiers**: Structured approach to regional language support
- **Administrative Areas**: Built-in knowledge of Indonesian geography
- **Local Services**: Integration with Indonesian service providers

### Environment Management

#### Core Environment Schema

```typescript
const envSchema = z.object({
  // Node environment with safe defaults
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database with connection validation
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  
  // Authentication with security requirements
  JWT_SECRET: z.string().min(32), // Enforce strong secrets
  JWT_EXPIRES_IN: z.string().default('7d'),
});
```

**Design Rationale:**
- **Strict Validation**: URL validation for database connections prevents runtime errors
- **Security Enforcement**: Minimum secret length requirements
- **Sensible Defaults**: Development-friendly defaults reduce setup friction
- **Optional Services**: Redis and external services optional for basic development

#### Service Integration Patterns

```typescript
// SMS Service (Twilio for Indonesian market)
TWILIO_ACCOUNT_SID: z.string().optional(),
TWILIO_AUTH_TOKEN: z.string().optional(),
TWILIO_PHONE_NUMBER: z.string().optional(),

// AI Services (Multi-provider support)
OPENAI_API_KEY: z.string().optional(),
ANTHROPIC_API_KEY: z.string().optional(),
AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),

// File Storage (AWS optimized for Southeast Asia)
AWS_REGION: z.string().default('ap-southeast-1'), // Singapore region
```

**Indonesian Service Considerations:**
- **Twilio SMS**: Reliable SMS delivery in Indonesia
- **AWS Singapore**: Lowest latency for Indonesian users
- **Multi-Provider AI**: Fallback options for service reliability

### Multi-Language Support Architecture

#### Language Tier System

```typescript
export const SUPPORTED_LANGUAGES = {
  // Tier 1: Full conversational AI support
  TIER_1: ['id', 'jv', 'su'], // Indonesian, Javanese, Sundanese
  
  // Tier 2: Translation + basic understanding  
  TIER_2: ['btk', 'min', 'bug', 'bjn'], // Batak, Minang, Bugis, Banjar
  
  // Tier 3: Best-effort recognition
  TIER_3: ['*'], // Other regional languages
} as const;
```

#### Language Detection Implementation

```typescript
export const LANGUAGE_PATTERNS = {
  // Indonesian patterns
  id: [
    /\b(saya|aku|gue|gw)\b/i, // Personal pronouns
    /\b(ini|itu|yang|dengan)\b/i, // Common determiners
    /\b(tidak|nggak|enggak|gak)\b/i, // Negation variants
    /\b(sudah|udah|belum)\b/i, // Aspect markers
  ],
  
  // Javanese patterns (Central/East Java dialect)
  jv: [
    /\b(aku|kowe|awakmu)\b/i, // Javanese pronouns
    /\b(ning|karo|lan)\b/i, // Conjunctions
    /\b(ora|gak|mboten)\b/i, // Negation (informal/formal)
    /\b(wis|durung|lagi)\b/i, // Aspect markers
    /\b(monggo|nuwun|matur)\b/i, // Politeness markers
  ],
};

// Statistical detection algorithm
export const detectLanguage = (text: string): LanguageCode => {
  const normalizedText = text.toLowerCase();
  const scores = new Map<LanguageCode, number>();
  
  // Score each language based on pattern matches
  for (const [langCode, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = patterns.filter(pattern => pattern.test(normalizedText));
    scores.set(langCode as LanguageCode, matches.length);
  }
  
  // Find language with highest score (minimum 2 pattern matches)
  const [detectedLang, score] = [...scores.entries()]
    .sort(([,a], [,b]) => b - a)[0];
    
  return score >= 2 ? detectedLang : 'id'; // Default to Indonesian
};
```

**Detection Strategy:**
- **Pattern-Based**: Regex patterns for language-specific markers
- **Threshold-Based**: Require multiple pattern matches for confidence
- **Fallback Logic**: Default to Indonesian for ambiguous input
- **Context Aware**: Consider user's previous language preference

#### UI Text Localization

```typescript
export const UI_TEXT = {
  id: {
    submitButton: 'Kirim Laporan',
    chatPlaceholder: 'Ketik pesan Anda...',
    locationPrompt: 'Dimana lokasi masalah ini terjadi?',
    photoPrompt: 'Bisa kirim foto kondisinya?',
    confirmSubmission: 'Apakah informasi ini sudah benar?',
    thankYou: 'Terima kasih! Laporan Anda telah diterima.',
  },
  jv: {
    submitButton: 'Kirim Laporan',
    chatPlaceholder: 'Ketik pesen sampeyan...',
    locationPrompt: 'Ning endi panggonan masalahe iki?',
    photoPrompt: 'Iso ngirim foto kahananе?',
    confirmSubmission: 'Informasi iki wis bener?',
    thankYou: 'Matur nuwun! Laporan sampeyan wis ditampa.',
  },
  // ... other languages
} as const;
```

### Issue Categories Configuration

#### Category Definition Structure

```typescript
export const ISSUE_CATEGORIES = {
  INFRASTRUCTURE: 'infrastructure',
  CLEANLINESS: 'cleanliness',
  LIGHTING: 'lighting',
  WATER_DRAINAGE: 'water_drainage',
  ENVIRONMENT: 'environment',
  SAFETY: 'safety',
} as const;

export const CATEGORY_METADATA = {
  [ISSUE_CATEGORIES.INFRASTRUCTURE]: {
    label: 'Infrastruktur',
    description: 'Jalan rusak, jembatan, fasilitas umum',
    icon: '🛣️',
    color: '#ef4444', // Tailwind red-500
    examples: [
      'Jalan berlubang',
      'Trotoar rusak', 
      'Jembatan penyeberangan',
      'Halte bus rusak',
      'Fasilitas umum rusak',
    ],
  },
  // ... other categories
};
```

**Indonesian Context Design:**
- **Bahasa Indonesia Labels**: All user-facing text in Indonesian
- **Cultural Examples**: Issue examples relevant to Indonesian infrastructure
- **Visual Design**: Icons and colors for low-literacy accessibility
- **Government Alignment**: Categories match Indonesian government department structure

#### Category Selection Algorithm

```typescript
// AI-powered category suggestion
export const suggestCategory = (description: string, imageAnalysis?: any): {
  category: IssueCategory;
  confidence: number;
  alternatives: Array<{ category: IssueCategory; confidence: number }>;
} => {
  const keywords = extractKeywords(description);
  const scores = new Map<IssueCategory, number>();
  
  // Score based on keyword matches
  for (const [category, metadata] of Object.entries(CATEGORY_METADATA)) {
    const categoryKeywords = [
      ...metadata.examples,
      metadata.description.split(', '),
    ].map(k => k.toLowerCase());
    
    const matchScore = keywords.reduce((score, keyword) => {
      return categoryKeywords.some(ck => ck.includes(keyword)) ? score + 1 : score;
    }, 0);
    
    scores.set(category as IssueCategory, matchScore);
  }
  
  // Boost score with image analysis if available
  if (imageAnalysis?.detectedObjects) {
    // Road, pothole, infrastructure objects boost INFRASTRUCTURE
    // Trash, waste objects boost CLEANLINESS
    // etc.
  }
  
  const sortedScores = [...scores.entries()].sort(([,a], [,b]) => b - a);
  
  return {
    category: sortedScores[0][0],
    confidence: sortedScores[0][1] / keywords.length,
    alternatives: sortedScores.slice(1, 3).map(([cat, score]) => ({
      category: cat,
      confidence: score / keywords.length,
    })),
  };
};
```

### System Limits Configuration

#### Dynamic Limit Calculation

```typescript
export const LIMITS = {
  SUBMISSION: {
    // Base limits
    MAX_IMAGES: 5,
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_TEXT_LENGTH: 5000,
    
    // Trust-level based daily limits
    DAILY_LIMIT_BASIC: 3,
    DAILY_LIMIT_VERIFIED: 10,
    DAILY_LIMIT_PREMIUM: 20,
  },
  
  TRUST_SCORE: {
    MIN: 1.0,
    MAX: 5.0,
    
    // Verification bonuses
    PHONE_VERIFICATION_BONUS: 0.5,
    KTP_VERIFICATION_BONUS: 1.5,
    SELFIE_VERIFICATION_BONUS: 0.5,
    SOCIAL_VERIFICATION_BONUS: 1.0,
  },
  
  // Indonesian-specific limits
  LOCATION: {
    // Indonesia bounding box
    MIN_LATITUDE: -11.0, // Southern tip
    MAX_LATITUDE: 6.0,   // Northern tip  
    MIN_LONGITUDE: 95.0, // Western tip
    MAX_LONGITUDE: 141.0, // Eastern tip
  },
} as const;
```

#### Context-Aware Limit Application

```typescript
export const getTrustLevelLimits = (trustLevel: TrustLevel) => {
  const baseLimits = {
    BASIC: {
      dailySubmissions: LIMITS.SUBMISSION.DAILY_LIMIT_BASIC,
      weeklySubmissions: LIMITS.SUBMISSION.WEEKLY_LIMIT_BASIC,
      priority: 1,
      features: ['basic_submission', 'public_dashboard'],
    },
    VERIFIED: {
      dailySubmissions: LIMITS.SUBMISSION.DAILY_LIMIT_VERIFIED,
      weeklySubmissions: LIMITS.SUBMISSION.WEEKLY_LIMIT_VERIFIED,
      priority: 2,
      features: ['basic_submission', 'public_dashboard', 'status_tracking'],
    },
    PREMIUM: {
      dailySubmissions: LIMITS.SUBMISSION.DAILY_LIMIT_PREMIUM,
      weeklySubmissions: LIMITS.SUBMISSION.WEEKLY_LIMIT_PREMIUM,
      priority: 3,
      features: ['basic_submission', 'public_dashboard', 'status_tracking', 'direct_gov_contact'],
    },
  };
  
  return baseLimits[trustLevel];
};

// Geographic validation for Indonesian context
export const isWithinIndonesia = (lat: number, lng: number): boolean => {
  return (
    lat >= LIMITS.LOCATION.MIN_LATITUDE &&
    lat <= LIMITS.LOCATION.MAX_LATITUDE &&
    lng >= LIMITS.LOCATION.MIN_LONGITUDE &&
    lng <= LIMITS.LOCATION.MAX_LONGITUDE
  );
};
```

### Configuration Loading Patterns

#### Environment-Specific Configuration

```typescript
// Development configuration
export const developmentConfig = {
  database: {
    url: env.DATABASE_URL,
    logQueries: true,
    ssl: false,
  },
  ai: {
    provider: env.AI_PROVIDER,
    fallbackToMock: true, // Mock AI responses in development
    cacheResponses: true,
  },
  sms: {
    enabled: false, // Log OTP instead of sending SMS
    logOtp: true,
  },
  storage: {
    provider: 'local', // Local file storage for development
    path: './uploads',
  },
};

// Production configuration
export const productionConfig = {
  database: {
    url: env.DATABASE_URL,
    ssl: true,
    connectionLimit: 20,
    queryTimeout: 30000,
  },
  ai: {
    provider: env.AI_PROVIDER,
    fallbackToMock: false,
    cacheResponses: true,
    timeout: 10000,
  },
  sms: {
    enabled: true,
    provider: 'twilio',
    rateLimit: true,
  },
  storage: {
    provider: 's3',
    bucket: env.S3_BUCKET,
    region: env.AWS_REGION,
    encryption: true,
  },
};
```

#### Configuration Composition

```typescript
// Main configuration factory
export const getConfig = (): AppConfig => {
  const baseConfig = {
    env: env.NODE_ENV,
    app: {
      name: 'Suara.id',
      version: process.env.npm_package_version || '0.1.0',
      urls: appUrls,
    },
    auth: authConfig,
    database: databaseConfig,
    ai: aiConfig,
    storage: storageConfig,
    maps: mapsConfig,
    social: socialConfig,
    rateLimit: rateLimitConfig,
    cors: corsConfig,
    monitoring: monitoringConfig,
  };
  
  // Merge environment-specific overrides
  const envConfig = {
    development: developmentConfig,
    production: productionConfig,
    test: testConfig,
  }[env.NODE_ENV];
  
  return mergeDeep(baseConfig, envConfig);
};
```

### Type Safety and Validation

#### Configuration Type Generation

```typescript
// Inferred types from Zod schema
export type EnvConfig = z.infer<typeof envSchema>;

// Service-specific configuration types
export interface DatabaseConfig {
  url: string;
  redis?: string;
  ssl: boolean;
  logging: boolean;
  connectionLimit?: number;
  queryTimeout?: number;
}

export interface AiConfig {
  provider: 'openai' | 'anthropic';
  openai: {
    apiKey?: string;
    model: string;
    visionModel: string;
    temperature: number;
    maxTokens: number;
  };
  anthropic: {
    apiKey?: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  fallbackToMock: boolean;
  cacheResponses: boolean;
  timeout: number;
}
```

#### Runtime Validation Patterns

```typescript
// Configuration validation at startup
export const validateConfig = (): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required services for production
  if (isProduction) {
    if (!env.DATABASE_URL) errors.push('DATABASE_URL is required in production');
    if (!env.JWT_SECRET) errors.push('JWT_SECRET is required in production');
    if (!env.TWILIO_ACCOUNT_SID) warnings.push('SMS service not configured');
    if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
      warnings.push('No AI provider configured');
    }
  }
  
  // Check Indonesian-specific requirements
  if (env.GOOGLE_MAPS_API_KEY) {
    // Validate Maps API has required permissions for Indonesia
    try {
      validateMapsApiPermissions(env.GOOGLE_MAPS_API_KEY);
    } catch (error) {
      warnings.push('Google Maps API may not support Indonesian locations');
    }
  }
  
  return { errors, warnings };
};

// Startup configuration check
export const initializeConfig = (): AppConfig => {
  const validation = validateConfig();
  
  if (validation.errors.length > 0) {
    console.error('❌ Configuration errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  return getConfig();
};
```

### Security Patterns

#### Secret Management

```typescript
// Secret validation and rotation patterns
export const validateSecrets = () => {
  // Ensure JWT secrets are cryptographically strong
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  
  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', '123456', 'jwt-secret'];
  if (weakSecrets.some(weak => env.JWT_SECRET.toLowerCase().includes(weak))) {
    throw new Error('JWT_SECRET appears to be weak or default value');
  }
  
  // Validate external service credentials format
  if (env.TWILIO_ACCOUNT_SID && !env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    throw new Error('Invalid Twilio Account SID format');
  }
};

// Environment-based secret masking
export const getMaskedConfig = (): Partial<EnvConfig> => {
  const config = { ...env };
  
  // Mask sensitive values in logs
  const sensitiveKeys = [
    'JWT_SECRET', 'TWILIO_AUTH_TOKEN', 'OPENAI_API_KEY', 
    'ANTHROPIC_API_KEY', 'AWS_SECRET_ACCESS_KEY'
  ];
  
  sensitiveKeys.forEach(key => {
    if (config[key]) {
      config[key] = config[key].slice(0, 4) + '***' + config[key].slice(-4);
    }
  });
  
  return config;
};
```

### Performance and Caching

#### Configuration Caching Strategy

```typescript
// Configuration cache with TTL
class ConfigCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  
  get<T>(key: string, factory: () => T): T {
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const value = factory();
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.TTL,
    });
    
    return value;
  }
  
  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const configCache = new ConfigCache();

// Cached configuration getters
export const getCachedLanguageMetadata = (langCode: LanguageCode) =>
  configCache.get(`lang:${langCode}`, () => LANGUAGE_METADATA[langCode]);

export const getCachedCategoryMetadata = (category: IssueCategory) =>
  configCache.get(`category:${category}`, () => CATEGORY_METADATA[category]);
```

### Future Considerations

#### 1. **Dynamic Configuration**
- **Remote Config**: Support for runtime configuration updates
- **A/B Testing**: Feature flag integration for gradual rollouts
- **Regional Customization**: Province-specific configuration overrides

#### 2. **Enhanced Validation**
- **Service Health Checks**: Validate external service connectivity at startup
- **Configuration Drift Detection**: Monitor configuration changes in production
- **Compliance Checking**: Automated checks for Indonesian data protection requirements

#### 3. **Internationalization Extensions**
- **Additional Languages**: Support for other Indonesian regional languages
- **Cultural Customization**: Date/time formats, number formatting for Indonesian locale
- **Government Integration**: Configuration for local government API endpoints

This configuration architecture provides a robust, type-safe foundation that scales with the application while maintaining Indonesian-specific requirements and cultural sensitivity.