/**
 * AI System Types
 * 
 * Core types and interfaces for AI/ML processing including clustering,
 * conversation management, and predictive analytics.
 */

import type { Result, IssueCategory, IssueSeverity } from '@suara/config';

// Temporary submission types until submissions package is built
export interface ProcessedSubmission {
  id: string;
  description: string;
  location: {
    coordinates: [number, number];
    address: string;
    accuracy: number;
  };
  images: string[];
  metadata: {
    category?: IssueCategory;
    severity?: IssueSeverity;
  };
  createdAt: Date;
  updatedAt: Date;
  validationResults?: {
    qualityScore: number;
    issues: string[];
  };
  processingMetadata?: {
    clusterId?: string;
    processed: boolean;
    aiAnalysis?: Record<string, any>;
  };
}

// ================================
// Clustering Types
// ================================

/**
 * Cluster of related submissions
 */
export interface SubmissionCluster {
  id: string;
  name: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  
  // Cluster metrics
  submissionCount: number;
  avgQualityScore: number;
  urgencyScore: number;
  impactScore: number;
  
  // Geographic data
  centerLocation: [number, number]; // [latitude, longitude]
  radiusKm: number;
  affectedAreas: string[]; // Administrative areas
  
  // Temporal data
  firstReported: Date;
  lastReported: Date;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  
  // AI analysis
  aiSummary: string;
  suggestedActions: string[];
  priorityRank: number; // 1-10 scale
  
  // Relationships
  submissions: ProcessedSubmission[];
  relatedClusters: string[]; // IDs of related clusters
  parentCluster?: string; // For hierarchical clustering
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'resolved' | 'merged' | 'archived';
}

/**
 * Clustering algorithm configuration
 */
export interface ClusteringConfig {
  maxDistanceKm: number;
  minSubmissions: number;
  semanticSimilarityThreshold: number;
  temporalWindowHours: number;
  categoryWeight: number;
  locationWeight: number;
  contentWeight: number;
  timeWeight: number;
}

/**
 * Clustering result with metrics
 */
export interface ClusteringResult {
  clusters: SubmissionCluster[];
  orphanedSubmissions: ProcessedSubmission[];
  metrics: {
    totalClusters: number;
    avgClusterSize: number;
    clusteringAccuracy: number;
    processingTimeMs: number;
  };
}

// ================================
// Conversation AI Types
// ================================

/**
 * Conversation context for AI interactions
 */
export interface ConversationContext {
  userId: string;
  sessionId: string;
  language: string;
  userProfile: {
    trustLevel: string;
    previousSubmissions: number;
    preferredCategories: IssueCategory[];
  };
  currentSubmission?: Partial<ProcessedSubmission>;
  conversationHistory: ConversationMessage[];
}

/**
 * Individual conversation message
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    extractedData?: Record<string, any>;
  };
}

/**
 * AI conversation response
 */
export interface ConversationResponse {
  message: string;
  intent: string;
  confidence: number;
  extractedData: Record<string, any>;
  suggestedActions: string[];
  followUpQuestions: string[];
  requiresHumanEscalation: boolean;
  completionStatus: 'incomplete' | 'complete' | 'requires_clarification';
}

// ================================
// Analytics and Prediction Types
// ================================

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  timeframe: { start: Date; end: Date };
  category: IssueCategory;
  location?: {
    administrativeLevel: string;
    area: string;
  };
  
  // Trend metrics
  submissionCount: number;
  growthRate: number; // Percentage change
  seasonality: {
    pattern: 'seasonal' | 'cyclical' | 'random';
    peakPeriods: string[];
  };
  
  // Predictions
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
  };
  
  // Correlations
  correlatedFactors: Array<{
    factor: string;
    correlation: number;
    significance: number;
  }>;
}

/**
 * Government response prediction
 */
export interface ResponsePrediction {
  clusterId: string;
  estimatedResponseTime: {
    acknowledgment: number; // hours
    investigation: number; // days
    resolution: number; // days
  };
  
  recommendedDepartment: string;
  requiredResources: Array<{
    type: string;
    amount: number;
    cost?: number;
  }>;
  
  successProbability: number;
  riskFactors: string[];
  alternativeApproaches: string[];
}

/**
 * Impact assessment
 */
export interface ImpactAssessment {
  clusterId: string;
  affectedPopulation: number;
  economicImpact: {
    estimatedCost: number;
    affectedBusinesses: number;
    productivityLoss: number;
  };
  
  socialImpact: {
    qualityOfLifeScore: number;
    communityRisk: 'low' | 'medium' | 'high';
    vulnerableGroupsAffected: string[];
  };
  
  environmentalImpact?: {
    severity: 'low' | 'medium' | 'high';
    duration: 'temporary' | 'medium_term' | 'permanent';
    affectedAreas: string[];
  };
}

// ================================
// AI Model Configuration Types
// ================================

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  provider: 'openai' | 'claude' | 'local';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  
  // Generation parameters
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Vision model configuration
 */
export interface VisionConfig {
  provider: 'openai' | 'google' | 'local';
  model: string;
  apiKey?: string;
  
  // Analysis parameters
  maxImageSize: number;
  supportedFormats: string[];
  analysisTypes: Array<'classification' | 'object_detection' | 'quality_assessment'>;
}

/**
 * Embedding model configuration
 */
export interface EmbeddingConfig {
  provider: 'openai' | 'huggingface' | 'local';
  model: string;
  apiKey?: string;
  dimensions: number;
  
  // Processing parameters
  chunkSize: number;
  overlap: number;
  batchSize: number;
}

// ================================
// Service Response Types
// ================================

/**
 * Result type for clustering operations
 */
export type ClusteringOperationResult = Result<ClusteringResult>;

/**
 * Result type for conversation processing
 */
export type ConversationResult = Result<ConversationResponse>;

/**
 * Result type for trend analysis
 */
export type TrendAnalysisResult = Result<TrendAnalysis>;

/**
 * Result type for response prediction
 */
export type ResponsePredictionResult = Result<ResponsePrediction>;

/**
 * Result type for impact assessment
 */
export type ImpactAssessmentResult = Result<ImpactAssessment>;

// ================================
// Processing Pipeline Types
// ================================

/**
 * AI processing pipeline step
 */
export interface AIProcessingStep {
  name: string;
  type: 'clustering' | 'classification' | 'conversation' | 'prediction' | 'analysis';
  dependencies: string[];
  config: Record<string, any>;
  execute: (input: any) => Promise<Result<any>>;
}

/**
 * Pipeline execution context
 */
export interface PipelineContext {
  submissionId?: string;
  clusterId?: string;
  conversationId?: string;
  userId?: string;
  metadata: Record<string, any>;
}

/**
 * Pipeline execution result
 */
export interface PipelineExecutionResult {
  success: boolean;
  executedSteps: string[];
  results: Record<string, any>;
  errors: Array<{ step: string; error: string }>;
  executionTimeMs: number;
}

// ================================
// Export all types
// ================================

export type {
  // Core clustering exports are already defined above
};