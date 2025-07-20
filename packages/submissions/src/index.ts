/**
 * @suara/submissions
 * 
 * Submission management system for Suara.id
 * 
 * This package provides comprehensive submission management including:
 * - Submission creation and validation
 * - Quality assessment and scoring
 * - Geographic analysis and clustering
 * - Search and filtering capabilities
 * - Status management and processing pipeline
 */

// Core service exports
export {
  createSubmission,
  getSubmission,
  getUserSubmissions,
  searchSubmissions,
  updateSubmissionStatus,
  getSubmissionStatistics
} from './services/submission-service';

// Type exports
export type {
  // Core types
  IssueCategory,
  IssueSeverity,
  SubmissionStatus,
  SubmissionLocation,
  CreateSubmissionInput,
  ProcessedSubmission,
  SubmissionValidationResult,
  SubmissionProcessingMetadata,
  
  // Search and filtering
  SubmissionSearchCriteria,
  SubmissionSortOptions,
  PaginationParams,
  SubmissionSearchResult,
  
  // Service results
  CreateSubmissionResult,
  GetSubmissionResult,
  SearchSubmissionResult,
  UpdateSubmissionStatusResult,
  SubmissionStatsResult,
  
  // Processing pipeline
  ProcessingStep,
  ProcessingPipelineConfig,
  StepProcessingResult,
  PipelineProcessingResult
} from './types';

// Processor exports
export {
  validateSubmissionQuality
} from './processors/quality-validator';

export {
  enrichSubmissionData,
  type AIAnalysisResult,
  type EnrichedSubmissionData
} from './processors/data-enricher';

// Utility exports
export {
  calculateGeographicMetrics,
  calculateDistance,
  isWithinBounds,
  findSubmissionsWithinRadius,
  calculateBoundingBox,
  type GeographicMetrics
} from './utils/geographic-utils';

// Package metadata
export const PACKAGE_VERSION = '0.1.0';
export const PACKAGE_NAME = '@suara/submissions';

/**
 * Package feature flags and configuration
 */
export const FEATURES = {
  AI_ANALYSIS: true,
  GEOGRAPHIC_CLUSTERING: true,
  QUALITY_VALIDATION: true,
  IMAGE_ANALYSIS: false, // TODO: Implement
  REAL_TIME_PROCESSING: false, // TODO: Implement
  ADVANCED_SEARCH: true
} as const;

/**
 * Default configuration for submission processing
 */
export const DEFAULT_CONFIG = {
  QUALITY_THRESHOLD: 60,
  MAX_PROCESSING_TIME_MS: 30000,
  DEFAULT_SEARCH_RADIUS_KM: 5,
  MAX_SEARCH_RESULTS: 100,
  CLUSTERING_MIN_SUBMISSIONS: 3,
  CLUSTERING_MAX_DISTANCE_KM: 0.5
} as const;