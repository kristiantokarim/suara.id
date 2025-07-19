// API request and response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: Record<string, any>;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

// Authentication API types
export interface LoginRequest {
  phone: string;
  otp: string;
}

export interface LoginResponse {
  user: {
    id: string;
    phone: string;
    name?: string;
    trustLevel: 'BASIC' | 'VERIFIED' | 'PREMIUM';
    language: string;
  };
  token: string;
  expiresIn: string;
}

export interface RegisterRequest {
  phone: string;
  name?: string;
  language?: string;
}

export interface SendOtpRequest {
  phone: string;
}

// Submission API types
export interface SubmissionRequest {
  description: string;
  location: {
    coordinates: [number, number];
    address: string;
    accuracy: number;
  };
  images?: string[];
  conversationLog: ConversationMessage[];
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  messageType: 'text' | 'image' | 'location' | 'system';
  metadata?: Record<string, any>;
}

export interface SubmissionResponse {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'REJECTED';
  referenceNumber: string;
  estimatedProcessingTime: string;
  qualityScore?: number;
  trustWeight?: number;
}

// Chat API types
export interface ChatMessageRequest {
  conversationId: string;
  message: string;
  messageType: 'text' | 'image' | 'location';
  metadata?: Record<string, any>;
}

export interface ChatMessageResponse {
  id: string;
  role: 'bot';
  content: string;
  messageType: 'text' | 'system';
  followUpQuestions?: string[];
  suggestedActions?: {
    type: 'location' | 'photo' | 'clarification';
    label: string;
    prompt: string;
  }[];
  conversationState: {
    stage: 'greeting' | 'problem_description' | 'location_gathering' | 'photo_request' | 'confirmation' | 'complete';
    completeness: number; // 0-1
    missingFields: string[];
  };
}

// Verification API types
export interface KtpVerificationRequest {
  documentImage: string; // base64 encoded
  selfieImage: string; // base64 encoded
}

export interface KtpVerificationResponse {
  success: boolean;
  confidence: number;
  extractedData: {
    name: string;
    nik: string;
    address: string;
    dateOfBirth: string;
    placeOfBirth: string;
  };
  faceMatchConfidence: number;
  verificationId: string;
}

export interface SocialVerificationRequest {
  platform: 'facebook' | 'instagram' | 'whatsapp';
  accessToken: string;
  profileUrl?: string;
}

// File upload types
export interface FileUploadRequest {
  file: File;
  type: 'image' | 'video' | 'document';
  purpose: 'submission' | 'verification' | 'profile';
}

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    gpsLocation?: [number, number];
  };
}

// Dashboard API types
export interface DashboardStatsResponse {
  overview: {
    totalSubmissions: number;
    totalIssues: number;
    totalClusters: number;
    totalUsers: number;
    verifiedUsers: number;
    resolvedIssues: number;
    avgResponseTime: number;
  };
  trends: {
    submissionTrend: Array<{
      date: string;
      count: number;
    }>;
    categoryDistribution: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    locationStats: Array<{
      area: string;
      level: 'kelurahan' | 'kecamatan' | 'kabupaten';
      count: number;
    }>;
  };
  recentActivity: Array<{
    type: 'submission' | 'resolution' | 'verification';
    description: string;
    timestamp: Date;
    location?: string;
  }>;
}

export interface IssueSearchRequest {
  query?: string;
  category?: string[];
  status?: string[];
  location?: {
    coordinates: [number, number];
    radius: number; // in kilometers
  };
  administrativeArea?: {
    provinsi?: string;
    kabupaten?: string;
    kecamatan?: string;
    kelurahan?: string;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  trustLevel?: ('BASIC' | 'VERIFIED' | 'PREMIUM')[];
  sortBy?: 'created' | 'priority' | 'trust_weight' | 'quality_score';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface IssueSearchResponse {
  issues: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    location: {
      coordinates: [number, number];
      address: string;
      administrativeArea: {
        kelurahan?: string;
        kecamatan?: string;
        kabupaten?: string;
        provinsi?: string;
      };
    };
    status: string;
    createdAt: Date;
    updatedAt: Date;
    qualityScore: number;
    trustWeight: number;
    clusterInfo?: {
      id: string;
      title: string;
      issueCount: number;
    };
  }>;
  clusters: Array<{
    id: string;
    title: string;
    category: string;
    issueCount: number;
    priority: number;
    location: {
      center: [number, number];
      radius: number;
    };
  }>;
  aggregations: {
    totalCount: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    avgQualityScore: number;
  };
}

// Admin API types
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminDashboardStats {
  users: {
    total: number;
    basic: number;
    verified: number;
    premium: number;
    newThisWeek: number;
  };
  submissions: {
    total: number;
    pending: number;
    processed: number;
    rejected: number;
    spam: number;
    avgQualityScore: number;
  };
  issues: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    avgResolutionTime: number;
  };
  moderation: {
    pendingReviews: number;
    flaggedContent: number;
    reportedUsers: number;
  };
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'chat_message' | 'typing' | 'conversation_update' | 'system_message';
  conversationId: string;
  data: any;
  timestamp: Date;
}

export interface WebSocketResponse {
  type: 'bot_response' | 'system_notification' | 'error';
  conversationId: string;
  data: any;
  timestamp: Date;
}