// Re-export all types
export * from './api';

// Re-export database types
export type {
  User,
  UserTrustScore,
  Verification,
  Submission,
  SubmissionQualityScore,
  Issue,
  IssueCluster,
  ClusterInsight,
  IssueResponse,
  AdminUser,
  CommunityEndorsement,
  AnalyticsEvent,
  TrustLevel,
  VerificationType,
  VerificationStatus,
  SubmissionStatus,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  ClusterStatus,
  RespondentType,
  AdminRole,
} from '@suara/database';

// Common utility types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  coordinates: [number, number]; // [lat, lng]
  address: string;
  accuracy: number; // GPS accuracy in meters
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// Configuration types
export interface DatabaseConfig {
  url: string;
  redis?: string;
  ssl: boolean;
  logging: boolean;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

export interface SmsConfig {
  provider: 'twilio';
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  enabled: boolean;
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
}

export interface StorageConfig {
  provider: 's3';
  aws: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    bucket?: string;
  };
  maxFileSize: number;
  maxFilesPerSubmission: number;
  allowedMimeTypes: string[];
}

export interface MapsConfig {
  provider: 'google';
  apiKey?: string;
  defaultCenter: [number, number];
  defaultZoom: number;
}

export interface SocialConfig {
  facebook: {
    appId?: string;
    appSecret?: string;
    enabled: boolean;
  };
  instagram: {
    clientId?: string;
    clientSecret?: string;
    enabled: boolean;
  };
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ServiceError {
  service: string;
  operation: string;
  error: Error;
  context?: Record<string, any>;
}

// Event types for analytics
export interface AnalyticsEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  data: Record<string, any>;
  timestamp: Date;
  location?: {
    coordinates: [number, number];
    administrativeArea: {
      kelurahan?: string;
      kecamatan?: string;
      kabupaten?: string;
      provinsi?: string;
    };
  };
}

// Scoring types
export interface QualityScoreBreakdown {
  textScore: number;
  mediaScore: number;
  locationScore: number;
  aiValidationScore: number;
  totalScore: number;
  grade: 'LOW' | 'MEDIUM' | 'HIGH';
  details: {
    textAnalysis: {
      length: number;
      hasLocationReference: boolean;
      hasTimeReference: boolean;
      clarityScore: number;
    };
    mediaAnalysis: {
      imageCount: number;
      videoCount: number;
      qualityScore: number;
      hasGpsMetadata: boolean;
    };
    locationAnalysis: {
      hasGpsCoordinates: boolean;
      addressSpecificity: number;
      accuracy: number;
    };
    aiValidation: {
      textImageConsistency: number;
      plausibilityScore: number;
      duplicateProbability: number;
    };
  };
}

export interface TrustScoreBreakdown {
  currentScore: number;
  level: 'BASIC' | 'VERIFIED' | 'PREMIUM';
  factors: {
    phoneVerification: number;
    ktpVerification: number;
    selfieVerification: number;
    socialVerification: number;
    communityEndorsements: number;
    historicalAccuracy: number;
    submissionHistory: number;
  };
  nextLevelRequirements?: {
    level: 'VERIFIED' | 'PREMIUM';
    missing: string[];
    requiredScore: number;
  };
}

// Clustering types
export interface ClusteringParams {
  category: string;
  location: {
    center: [number, number];
    radius: number;
  };
  timeWindow: {
    start: Date;
    end: Date;
  };
  minWeight: number;
  similarityThreshold: number;
}

export interface ClusterCandidate {
  submissions: string[]; // submission IDs
  center: [number, number];
  radius: number;
  totalWeight: number;
  avgQuality: number;
  confidence: number;
}

// Notification types
export interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  push: boolean;
  categories: string[];
  location: {
    enabled: boolean;
    radius: number; // kilometers
  };
}

export interface NotificationMessage {
  type: 'submission_update' | 'issue_resolved' | 'trust_level_updated' | 'system_announcement';
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('sms' | 'email' | 'push')[];
  scheduledFor?: Date;
}