/**
 * Submission Management Types
 * 
 * Core types and interfaces for the submission management system
 */

import type { Result } from '@suara/config';
import type { SubmissionWithDetails } from '@suara/database';

// ================================
// Core Submission Types
// ================================

/**
 * Issue categories for submissions
 */
export type IssueCategory = 
  | 'INFRASTRUCTURE'
  | 'ENVIRONMENT' 
  | 'SAFETY'
  | 'HEALTH'
  | 'EDUCATION'
  | 'GOVERNANCE'
  | 'SOCIAL'
  | 'OTHER';

/**
 * Submission severity levels
 */
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Submission processing status
 */
export type SubmissionStatus = 
  | 'PENDING'
  | 'PROCESSING' 
  | 'PROCESSED'
  | 'REJECTED'
  | 'SPAM';

/**
 * Location data for submissions
 */
export interface SubmissionLocation {
  coordinates: [number, number]; // [latitude, longitude]
  address: string;
  accuracy: number; // GPS accuracy in meters
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
}

/**
 * Input data for creating a new submission
 */
export interface CreateSubmissionInput {
  content: string;
  category: IssueCategory;
  location: SubmissionLocation;
  images?: string[]; // Base64 encoded images
  severity: IssueSeverity;
  isAnonymous?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Enriched submission data with validation results
 */
export interface ProcessedSubmission extends SubmissionWithDetails {
  validationResults: SubmissionValidationResult;
  processingMetadata: SubmissionProcessingMetadata;
}

/**
 * Submission validation results
 */
export interface SubmissionValidationResult {
  isValid: boolean;
  qualityScore: number;
  issues: string[];
  warnings: string[];
  recommendations: string[];
  
  // Validation details
  contentAnalysis: {
    length: number;
    clarity: number;
    relevance: number;
    language: string;
  };
  
  locationAnalysis: {
    accuracy: number;
    withinIndonesia: boolean;
    administrativeDataComplete: boolean;
  };
  
  imageAnalysis?: {
    count: number;
    quality: number[];
    relevance: number[];
    containsSensitiveContent: boolean;
  };
}

/**
 * Processing metadata for submissions
 */
export interface SubmissionProcessingMetadata {
  processedAt: Date;
  processingDuration: number; // milliseconds
  algorithmVersion: string;
  confidence: number;
  
  // AI analysis results
  aiAnalysis?: {
    sentiment: number;
    urgency: number;
    extractedEntities: string[];
    suggestedCategory: IssueCategory;
    categoryConfidence: number;
  };
  
  // Geographic analysis
  geoAnalysis?: {
    nearbySubmissions: number;
    clusterCandidate: boolean;
    administrativeLevel: string;
  };
}

// ================================
// Search and Filtering Types
// ================================

/**
 * Search criteria for submissions
 */
export interface SubmissionSearchCriteria {
  query?: string;
  category?: IssueCategory | IssueCategory[];
  severity?: IssueSeverity | IssueSeverity[];
  status?: SubmissionStatus | SubmissionStatus[];
  
  // Geographic filters
  location?: {
    center: [number, number];
    radius: number; // kilometers
  };
  
  // Administrative filters
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  kelurahan?: string;
  
  // Date filters
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  // Quality filters
  minQualityScore?: number;
  maxQualityScore?: number;
  
  // User filters
  userId?: string;
  isAnonymous?: boolean;
  
  // Advanced filters
  hasImages?: boolean;
  hasLocationData?: boolean;
  isProcessed?: boolean;
}

/**
 * Sorting options for search results
 */
export interface SubmissionSortOptions {
  field: 'createdAt' | 'updatedAt' | 'qualityScore' | 'severity' | 'distance';
  direction: 'asc' | 'desc';
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Search result with pagination
 */
export interface SubmissionSearchResult {
  submissions: ProcessedSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  aggregations?: {
    byCategory: Record<IssueCategory, number>;
    bySeverity: Record<IssueSeverity, number>;
    byStatus: Record<SubmissionStatus, number>;
    byProvinsi: Record<string, number>;
  };
}

// ================================
// Service Response Types
// ================================

/**
 * Result type for submission creation
 */
export type CreateSubmissionResult = Result<{
  submission: ProcessedSubmission;
  validationWarnings?: string[];
}>;

/**
 * Result type for submission retrieval
 */
export type GetSubmissionResult = Result<ProcessedSubmission>;

/**
 * Result type for submission search
 */
export type SearchSubmissionResult = Result<SubmissionSearchResult>;

/**
 * Result type for submission status update
 */
export type UpdateSubmissionStatusResult = Result<{
  updated: boolean;
  newStatus: SubmissionStatus;
}>;

/**
 * Result type for submission statistics
 */
export type SubmissionStatsResult = Result<{
  total: number;
  processed: number;
  avgQualityScore: number;
  byCategory: Record<IssueCategory, number>;
  byStatus: Record<SubmissionStatus, number>;
  byProvinsi: Record<string, number>;
}>;

// ================================
// Processing Pipeline Types
// ================================

/**
 * Submission processing pipeline step
 */
export interface ProcessingStep {
  name: string;
  execute: (submission: SubmissionWithDetails) => Promise<Result<any>>;
  dependencies?: string[];
  optional?: boolean;
}

/**
 * Processing pipeline configuration
 */
export interface ProcessingPipelineConfig {
  steps: ProcessingStep[];
  maxConcurrency: number;
  timeoutMs: number;
  retryAttempts: number;
}

/**
 * Processing result for individual step
 */
export interface StepProcessingResult {
  stepName: string;
  success: boolean;
  duration: number;
  result?: any;
  error?: string;
}

/**
 * Complete processing result
 */
export interface PipelineProcessingResult {
  submissionId: string;
  success: boolean;
  totalDuration: number;
  steps: StepProcessingResult[];
  finalResult?: ProcessedSubmission;
  error?: string;
}

// ================================
// Export all types
// ================================

export type {
  // Core types are already exported above
};