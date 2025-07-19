import type { 
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
  AdminRole
} from '@prisma/client';

// Re-export Prisma types
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
  AdminRole
};

// Enhanced types with relations
export type UserWithTrustScore = User & {
  trustScore: UserTrustScore | null;
};

export type SubmissionWithDetails = Submission & {
  user: User;
  qualityScore: SubmissionQualityScore | null;
  issue: Issue | null;
  cluster: IssueCluster | null;
};

export type IssueWithCluster = Issue & {
  submission: Submission & {
    user: User;
  };
  cluster: IssueCluster | null;
  responses: IssueResponse[];
};

export type ClusterWithIssues = IssueCluster & {
  issues: (Issue & {
    submission: Submission & {
      user: User;
    };
  })[];
  submissions: (Submission & {
    user: User;
  })[];
  insights: ClusterInsight[];
};

// Location types
export interface LocationData {
  coordinates: [number, number]; // [latitude, longitude]
  address: string;
  accuracy: number; // GPS accuracy in meters
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
}

// Conversation types for chat
export interface ConversationMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  messageType: 'text' | 'image' | 'location' | 'system';
  metadata?: Record<string, any>;
}

// Quality scoring breakdown
export interface QualityAnalysis {
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
}

// Trust scoring factors
export interface TrustFactors {
  phoneVerification: boolean;
  ktpVerification: boolean;
  selfieVerification: boolean;
  socialVerification: boolean;
  communityEndorsements: number;
  historicalAccuracy: number;
  submissionHistory: number;
}

// Analytics data structures
export interface TrendData {
  period: 'hour' | 'day' | 'week' | 'month';
  data: Array<{
    timestamp: Date;
    count: number;
    category?: string;
    location?: string;
  }>;
}

export interface InsightRecommendation {
  type: 'urgent' | 'maintenance' | 'infrastructure' | 'policy';
  priority: number;
  description: string;
  actionItems: string[];
  estimatedImpact: number;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SubmissionCreateInput {
  description: string;
  location: LocationData;
  images?: string[];
  conversationLog: ConversationMessage[];
  metadata?: Record<string, any>;
}

export interface TrustScoreUpdateInput {
  phoneVerified?: boolean;
  ktpVerified?: boolean;
  selfieVerified?: boolean;
  socialVerified?: boolean;
  submissionCount?: number;
  accuracyScore?: number;
}

// Search and filter types
export interface IssueFilters {
  category?: IssueCategory[];
  severity?: IssueSeverity[];
  status?: IssueStatus[];
  location?: {
    provinsi?: string;
    kabupaten?: string;
    kecamatan?: string;
    kelurahan?: string;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  trustLevel?: TrustLevel[];
}

export interface DashboardStats {
  totalSubmissions: number;
  totalIssues: number;
  totalClusters: number;
  totalUsers: number;
  verifiedUsers: number;
  resolvedIssues: number;
  avgResponseTime: number; // in hours
  topCategories: Array<{
    category: IssueCategory;
    count: number;
  }>;
  recentActivity: Array<{
    type: 'submission' | 'resolution' | 'verification';
    count: number;
    timestamp: Date;
  }>;
}