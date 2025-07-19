// System limits and constraints
export const LIMITS = {
  // User submission limits
  SUBMISSION: {
    MAX_IMAGES: 5,
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB per image
    MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB per video
    MAX_TEXT_LENGTH: 5000, // characters
    MIN_TEXT_LENGTH: 10, // characters
    MAX_CONVERSATION_TURNS: 20, // chat turns before force completion
    
    // Daily limits by trust level
    DAILY_LIMIT_BASIC: 3,
    DAILY_LIMIT_VERIFIED: 10,
    DAILY_LIMIT_PREMIUM: 20,
    
    // Weekly limits (additional protection)
    WEEKLY_LIMIT_BASIC: 15,
    WEEKLY_LIMIT_VERIFIED: 50,
    WEEKLY_LIMIT_PREMIUM: 100,
  },
  
  // Trust scoring bounds
  TRUST_SCORE: {
    MIN: 1.0,
    MAX: 5.0,
    DEFAULT: 1.0,
    
    // Score thresholds for trust levels
    BASIC_THRESHOLD: 2.0,
    VERIFIED_THRESHOLD: 2.1,
    PREMIUM_THRESHOLD: 4.1,
    
    // Bonus points for verification
    PHONE_VERIFICATION_BONUS: 0.5,
    KTP_VERIFICATION_BONUS: 1.5,
    SELFIE_VERIFICATION_BONUS: 0.5,
    SOCIAL_VERIFICATION_BONUS: 1.0,
    COMMUNITY_ENDORSEMENT_BONUS: 0.1, // per endorsement, max 0.5
    ACCURACY_BONUS_MAX: 0.5,
    SUBMISSION_HISTORY_MAX: 0.3,
  },
  
  // Quality scoring bounds
  QUALITY_SCORE: {
    MIN: 0,
    MAX: 12,
    
    // Component scores
    TEXT_SCORE_MAX: 3,
    MEDIA_SCORE_MAX: 4,
    LOCATION_SCORE_MAX: 2,
    AI_VALIDATION_MAX: 3,
    
    // Quality thresholds
    LOW_QUALITY_THRESHOLD: 4,
    MEDIUM_QUALITY_THRESHOLD: 7,
    HIGH_QUALITY_THRESHOLD: 10,
  },
  
  // Clustering parameters
  CLUSTERING: {
    MIN_WEIGHT_FOR_CLUSTER: 1.0, // Minimum weight to create cluster
    HIGH_WEIGHT_THRESHOLD: 3.0, // Weight for independent cluster creation
    MIN_SIMILAR_REPORTS: 3, // Minimum reports for low-weight clustering
    MAX_CLUSTER_RADIUS_METERS: 1000, // 1km max radius
    MIN_CLUSTER_RADIUS_METERS: 50, // 50m min radius
    SIMILARITY_THRESHOLD: 0.7, // Text similarity threshold (0-1)
    MAX_CLUSTER_SIZE: 50, // Maximum issues per cluster
  },
  
  // Geographic bounds
  LOCATION: {
    // Indonesia bounding box
    MIN_LATITUDE: -11.0, // Southern tip
    MAX_LATITUDE: 6.0, // Northern tip
    MIN_LONGITUDE: 95.0, // Western tip
    MAX_LONGITUDE: 141.0, // Eastern tip
    
    // Location accuracy thresholds
    GPS_ACCURACY_EXCELLENT: 10, // meters
    GPS_ACCURACY_GOOD: 50, // meters
    GPS_ACCURACY_POOR: 200, // meters
    GPS_ACCURACY_REJECT: 1000, // meters - reject if worse
    
    // Address specificity scoring
    COORDINATE_POINTS: 2,
    STREET_ADDRESS_POINTS: 2,
    LANDMARK_POINTS: 1,
    KELURAHAN_POINTS: 1,
    VAGUE_LOCATION_POINTS: 0,
  },
  
  // File processing limits
  FILE_PROCESSING: {
    MAX_PROCESSING_TIME_MS: 30000, // 30 seconds
    MAX_OCR_PROCESSING_TIME_MS: 15000, // 15 seconds
    MAX_FACE_RECOGNITION_TIME_MS: 10000, // 10 seconds
    MAX_RETRY_ATTEMPTS: 3,
    
    // Image processing
    MAX_IMAGE_DIMENSIONS: 4096, // pixels
    MIN_IMAGE_DIMENSIONS: 100, // pixels
    COMPRESSION_QUALITY: 0.8, // JPEG quality
    
    // Supported formats
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
  
  // Rate limiting
  RATE_LIMITING: {
    // API endpoints
    SUBMISSIONS_PER_HOUR: 20,
    VERIFICATIONS_PER_DAY: 5,
    LOGIN_ATTEMPTS_PER_HOUR: 10,
    PASSWORD_RESET_PER_DAY: 3,
    
    // Chat interactions
    MESSAGES_PER_MINUTE: 30,
    CONVERSATIONS_PER_HOUR: 10,
    
    // File uploads
    UPLOADS_PER_HOUR: 50,
    UPLOAD_BANDWIDTH_MB_PER_HOUR: 100,
  },
  
  // Database pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MIN_PAGE_SIZE: 5,
  },
  
  // Search and filtering
  SEARCH: {
    MIN_QUERY_LENGTH: 3,
    MAX_QUERY_LENGTH: 100,
    MAX_SEARCH_RESULTS: 1000,
    SEARCH_RADIUS_KM_DEFAULT: 5,
    SEARCH_RADIUS_KM_MAX: 50,
  },
  
  // Admin panel limits
  ADMIN: {
    MAX_BULK_OPERATIONS: 1000,
    MAX_EXPORT_RECORDS: 10000,
    MAX_CONCURRENT_ADMIN_SESSIONS: 50,
  },
  
  // AI processing limits
  AI_PROCESSING: {
    MAX_PROMPT_LENGTH: 8000, // characters
    MAX_CONVERSATION_CONTEXT: 10, // previous messages
    MAX_CLASSIFICATION_TIME_MS: 5000,
    MAX_CLUSTERING_TIME_MS: 30000,
    MIN_CONFIDENCE_THRESHOLD: 0.7,
    
    // LLM token limits
    MAX_INPUT_TOKENS: 4000,
    MAX_OUTPUT_TOKENS: 1000,
  },
  
  // Verification limits
  VERIFICATION: {
    MAX_KTP_ATTEMPTS_PER_DAY: 3,
    MAX_SELFIE_ATTEMPTS_PER_DAY: 5,
    MAX_SOCIAL_LINKS_PER_USER: 3,
    
    // Document processing
    MIN_KTP_CONFIDENCE: 0.8,
    MIN_FACE_MATCH_CONFIDENCE: 0.85,
    MAX_VERIFICATION_AGE_DAYS: 30, // Re-verify after 30 days
    
    // Community endorsements
    MAX_ENDORSEMENTS_PER_USER: 10,
    MIN_ENDORSER_TRUST_LEVEL: 2.5,
    ENDORSEMENT_COOLDOWN_DAYS: 30,
  },
  
  // Analytics and reporting
  ANALYTICS: {
    MAX_TIMEFRAME_DAYS: 365,
    MIN_TIMEFRAME_HOURS: 1,
    MAX_DASHBOARD_WIDGETS: 20,
    CACHE_TTL_MINUTES: 15,
    
    // Data retention
    RAW_ANALYTICS_RETENTION_DAYS: 90,
    AGGREGATED_DATA_RETENTION_YEARS: 5,
  },
} as const;

// Helper functions
export const getTrustLevelLimits = (trustLevel: 'BASIC' | 'VERIFIED' | 'PREMIUM') => {
  switch (trustLevel) {
    case 'BASIC':
      return {
        dailySubmissions: LIMITS.SUBMISSION.DAILY_LIMIT_BASIC,
        weeklySubmissions: LIMITS.SUBMISSION.WEEKLY_LIMIT_BASIC,
        priority: 1,
      };
    case 'VERIFIED':
      return {
        dailySubmissions: LIMITS.SUBMISSION.DAILY_LIMIT_VERIFIED,
        weeklySubmissions: LIMITS.SUBMISSION.WEEKLY_LIMIT_VERIFIED,
        priority: 2,
      };
    case 'PREMIUM':
      return {
        dailySubmissions: LIMITS.SUBMISSION.DAILY_LIMIT_PREMIUM,
        weeklySubmissions: LIMITS.SUBMISSION.WEEKLY_LIMIT_PREMIUM,
        priority: 3,
      };
    default:
      return getTrustLevelLimits('BASIC');
  }
};

export const getQualityGrade = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (score >= LIMITS.QUALITY_SCORE.HIGH_QUALITY_THRESHOLD) return 'HIGH';
  if (score >= LIMITS.QUALITY_SCORE.MEDIUM_QUALITY_THRESHOLD) return 'MEDIUM';
  return 'LOW';
};

export const isWithinIndonesia = (lat: number, lng: number): boolean => {
  return (
    lat >= LIMITS.LOCATION.MIN_LATITUDE &&
    lat <= LIMITS.LOCATION.MAX_LATITUDE &&
    lng >= LIMITS.LOCATION.MIN_LONGITUDE &&
    lng <= LIMITS.LOCATION.MAX_LONGITUDE
  );
};

export const getLocationAccuracyGrade = (accuracyMeters: number): 'EXCELLENT' | 'GOOD' | 'POOR' | 'REJECT' => {
  if (accuracyMeters >= LIMITS.LOCATION.GPS_ACCURACY_REJECT) return 'REJECT';
  if (accuracyMeters >= LIMITS.LOCATION.GPS_ACCURACY_POOR) return 'POOR';
  if (accuracyMeters >= LIMITS.LOCATION.GPS_ACCURACY_GOOD) return 'GOOD';
  return 'EXCELLENT';
};