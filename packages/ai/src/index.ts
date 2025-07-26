/**
 * Suara.id AI Package
 * 
 * AI/ML processing utilities for Indonesian citizen issue reporting platform.
 * Includes conversation management, clustering, analytics, and language processing.
 */

// Core conversation engine
export * from './llm/conversation-engine';

// Types and interfaces
export * from './types';

// Language processing
export * from './language';

// Clustering and analytics
export * from './clustering/similarity-engine';
export * from './clustering/cluster-service';
export * from './analytics/trend-analyzer';

// Vision processing (when implemented)
// export * from './vision';

// Re-export common types for convenience
export type {
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  ConversationResult,
  SubmissionCluster,
  ClusteringResult,
  TrendAnalysis,
  LLMConfig,
  VisionConfig,
  EmbeddingConfig
} from './types';