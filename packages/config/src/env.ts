import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  
  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // SMS Service (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // AI Services
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  
  // File Storage
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-southeast-1'),
  S3_BUCKET: z.string().optional(),
  
  // Maps and Location
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  
  // Social Media APIs
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  INSTAGRAM_CLIENT_ID: z.string().optional(),
  INSTAGRAM_CLIENT_SECRET: z.string().optional(),
  
  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default('http://localhost:3002'),
  
  // API Configuration
  API_PORT: z.string().transform(Number).default('3001'),
  API_CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3002'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // File Upload Limits
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  MAX_FILES_PER_SUBMISSION: z.string().transform(Number).default('5'),
  
  // Trust Scoring
  TRUST_SCORE_RECALC_INTERVAL: z.string().transform(Number).default('86400000'), // 24 hours
  
  // Analytics
  ANALYTICS_ENABLED: z.string().transform(Boolean).default('true'),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Parse and validate environment variables
function getEnvConfig(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment configuration:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

// Export validated configuration
export const env = getEnvConfig();

// Configuration by environment
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Database configuration
export const databaseConfig = {
  url: env.DATABASE_URL,
  redis: env.REDIS_URL,
  ssl: isProduction,
  logging: isDevelopment,
};

// Authentication configuration
export const authConfig = {
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  bcryptRounds: isProduction ? 12 : 10,
};

// SMS configuration
export const smsConfig = {
  provider: 'twilio' as const,
  accountSid: env.TWILIO_ACCOUNT_SID,
  authToken: env.TWILIO_AUTH_TOKEN,
  phoneNumber: env.TWILIO_PHONE_NUMBER,
  enabled: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
};

// AI configuration
export const aiConfig = {
  provider: env.AI_PROVIDER,
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: 'gpt-4-1106-preview',
    visionModel: 'gpt-4-vision-preview',
    temperature: 0.7,
    maxTokens: 1000,
  },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 1000,
  },
};

// Storage configuration
export const storageConfig = {
  provider: 's3' as const,
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    bucket: env.S3_BUCKET,
  },
  maxFileSize: env.MAX_FILE_SIZE,
  maxFilesPerSubmission: env.MAX_FILES_PER_SUBMISSION,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
  ],
};

// Maps configuration
export const mapsConfig = {
  provider: 'google' as const,
  apiKey: env.GOOGLE_MAPS_API_KEY,
  defaultCenter: [-6.2088, 106.8456], // Jakarta coordinates
  defaultZoom: 12,
};

// Social media configuration
export const socialConfig = {
  facebook: {
    appId: env.FACEBOOK_APP_ID,
    appSecret: env.FACEBOOK_APP_SECRET,
    enabled: !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
  },
  instagram: {
    clientId: env.INSTAGRAM_CLIENT_ID,
    clientSecret: env.INSTAGRAM_CLIENT_SECRET,
    enabled: !!(env.INSTAGRAM_CLIENT_ID && env.INSTAGRAM_CLIENT_SECRET),
  },
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

// CORS configuration
export const corsConfig = {
  origin: env.API_CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Application URLs
export const appUrls = {
  web: env.NEXT_PUBLIC_APP_URL,
  api: env.NEXT_PUBLIC_API_URL,
  admin: env.NEXT_PUBLIC_ADMIN_URL,
};

// Monitoring configuration
export const monitoringConfig = {
  sentry: {
    dsn: env.SENTRY_DSN,
    enabled: !!env.SENTRY_DSN && isProduction,
  },
  analytics: {
    enabled: env.ANALYTICS_ENABLED,
  },
  logging: {
    level: env.LOG_LEVEL,
    pretty: isDevelopment,
  },
};