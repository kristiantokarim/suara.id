/**
 * Similarity Engine
 * 
 * Core algorithms for calculating submission similarity based on multiple
 * criteria including semantic content, geographic proximity, and temporal patterns.
 */

import { success, failure, type Result, type IssueCategory } from '@suara/config';
import type { ProcessedSubmission } from '../types';
import type { ClusteringConfig } from '../types';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Similarity score between two submissions
 */
export interface SimilarityScore {
  overall: number; // 0-1 overall similarity
  semantic: number; // Content similarity
  geographic: number; // Location similarity  
  temporal: number; // Time similarity
  categorical: number; // Category similarity
  severity: number; // Severity similarity
}

/**
 * Similarity calculation weights
 */
export interface SimilarityWeights {
  semantic: number;
  geographic: number;
  temporal: number;
  categorical: number;
  severity: number;
}

/**
 * Default similarity weights optimized for Indonesian urban issues
 */
const DEFAULT_WEIGHTS: SimilarityWeights = {
  semantic: 0.4,    // Content is most important
  geographic: 0.3,   // Location matters for infrastructure issues
  temporal: 0.1,     // Time less important but still relevant
  categorical: 0.15, // Category helps grouping
  severity: 0.05     // Severity less weighted
};

/**
 * Calculate comprehensive similarity between two submissions
 * 
 * @param submission1 - First submission
 * @param submission2 - Second submission
 * @param config - Clustering configuration
 * @param weights - Custom similarity weights
 * @returns Detailed similarity scores
 */
export function calculateSimilarity(
  submission1: ProcessedSubmission,
  submission2: ProcessedSubmission,
  config: ClusteringConfig,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): SimilarityScore {
  // Calculate individual similarity components
  const semantic = calculateSemanticSimilarity(
    submission1.description,
    submission2.description
  );
  
  const geographic = calculateGeographicSimilarity(
    submission1.location,
    submission2.location,
    config.maxDistanceKm
  );
  
  const temporal = calculateTemporalSimilarity(
    submission1.createdAt,
    submission2.createdAt,
    config.temporalWindowHours
  );
  
  const categorical = calculateCategoricalSimilarity(
    (submission1.metadata as any)?.category,
    (submission2.metadata as any)?.category
  );
  
  const severity = calculateSeveritySimilarity(
    (submission1.metadata as any)?.severity,
    (submission2.metadata as any)?.severity
  );
  
  // Calculate weighted overall similarity
  const overall = (
    semantic * weights.semantic +
    geographic * weights.geographic +
    temporal * weights.temporal +
    categorical * weights.categorical +
    severity * weights.severity
  );
  
  return {
    overall,
    semantic,
    geographic,
    temporal,
    categorical,
    severity
  };
}

/**
 * Calculate semantic similarity between two text descriptions
 */
export function calculateSemanticSimilarity(text1: string, text2: string): number {
  // Preprocessing
  const clean1 = preprocessText(text1);
  const clean2 = preprocessText(text2);
  
  // Extract keywords and features
  const keywords1 = extractKeywords(clean1);
  const keywords2 = extractKeywords(clean2);
  
  // Calculate various similarity metrics
  const jaccardSim = calculateJaccardSimilarity(keywords1, keywords2);
  const cosineSim = calculateCosineSimilarity(clean1, clean2);
  const lengthSim = calculateLengthSimilarity(clean1, clean2);
  const entitySim = calculateEntitySimilarity(clean1, clean2);
  
  // Weighted combination of similarity metrics
  return (
    jaccardSim * 0.3 +
    cosineSim * 0.4 +
    lengthSim * 0.1 +
    entitySim * 0.2
  );
}

/**
 * Calculate geographic similarity based on distance
 */
export function calculateGeographicSimilarity(
  location1: any,
  location2: any,
  maxDistanceKm: number
): number {
  if (!location1?.coordinates || !location2?.coordinates) {
    return 0;
  }
  
  const distance = calculateDistance(
    location1.coordinates[0], location1.coordinates[1],
    location2.coordinates[0], location2.coordinates[1]
  );
  
  // Exponential decay function - closer locations have higher similarity
  if (distance >= maxDistanceKm) return 0;
  
  // Perfect similarity at 0 distance, exponential decay
  return Math.exp(-distance / (maxDistanceKm / 3));
}

/**
 * Calculate temporal similarity based on time difference
 */
export function calculateTemporalSimilarity(
  time1: Date,
  time2: Date,
  temporalWindowHours: number
): number {
  const timeDiffMs = Math.abs(time1.getTime() - time2.getTime());
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
  
  if (timeDiffHours >= temporalWindowHours) return 0;
  
  // Linear decay within temporal window
  return 1 - (timeDiffHours / temporalWindowHours);
}

/**
 * Calculate categorical similarity
 */
export function calculateCategoricalSimilarity(
  category1: IssueCategory,
  category2: IssueCategory
): number {
  if (!category1 || !category2) return 0.5; // Neutral if missing
  if (category1 === category2) return 1.0;
  
  // Related categories have partial similarity
  const relatedCategories: Record<IssueCategory, IssueCategory[]> = {
    'INFRASTRUCTURE': ['ENVIRONMENT', 'SAFETY'],
    'ENVIRONMENT': ['INFRASTRUCTURE', 'HEALTH'],
    'SAFETY': ['INFRASTRUCTURE', 'GOVERNANCE'],
    'HEALTH': ['ENVIRONMENT', 'SAFETY'],
    'EDUCATION': ['SOCIAL', 'GOVERNANCE'],
    'GOVERNANCE': ['SAFETY', 'EDUCATION', 'SOCIAL'],
    'SOCIAL': ['EDUCATION', 'GOVERNANCE'],
    'OTHER': []
  };
  
  const related = relatedCategories[category1] || [];
  return related.includes(category2) ? 0.3 : 0.0;
}

/**
 * Calculate severity similarity
 */
export function calculateSeveritySimilarity(severity1: string, severity2: string): number {
  if (!severity1 || !severity2) return 0.5;
  if (severity1 === severity2) return 1.0;
  
  const severityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const index1 = severityLevels.indexOf(severity1);
  const index2 = severityLevels.indexOf(severity2);
  
  if (index1 === -1 || index2 === -1) return 0.5;
  
  const diff = Math.abs(index1 - index2);
  return Math.max(0, 1 - (diff / 3)); // 3 is max difference
}

/**
 * Batch similarity calculation for multiple submissions
 * 
 * @param submissions - Array of submissions to compare
 * @param config - Clustering configuration
 * @returns Similarity matrix
 */
export async function calculateSimilarityMatrix(
  submissions: ProcessedSubmission[],
  config: ClusteringConfig
): Promise<Result<number[][]>> {
  try {
    const n = submissions.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // Calculate pairwise similarities
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0; // Perfect self-similarity
        } else {
          const similarity = calculateSimilarity(
            submissions[i],
            submissions[j],
            config
          );
          matrix[i][j] = similarity.overall;
          matrix[j][i] = similarity.overall; // Symmetric matrix
        }
      }
    }
    
    return success(matrix);
    
  } catch (error) {
    console.error('Failed to calculate similarity matrix:', error);
    return failure(
      'Gagal menghitung matriks kemiripan',
      [error instanceof Error ? error.message : 'Similarity calculation error']
    );
  }
}

// ================================
// Helper Functions
// ================================

/**
 * Preprocess text for similarity analysis
 */
function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation but keep Indonesian characters
    .replace(/[^\w\s\u00C0-\u017F\u1E00-\u1EFF]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove common stop words
    .split(' ')
    .filter(word => !INDONESIAN_STOP_WORDS.includes(word))
    .join(' ');
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const words = text.split(' ').filter(word => word.length > 2);
  
  // Extract important terms (infrastructure, locations, etc.)
  const importantTerms = words.filter(word => 
    INFRASTRUCTURE_TERMS.includes(word) ||
    LOCATION_TERMS.some(term => word.includes(term)) ||
    ISSUE_TERMS.includes(word)
  );
  
  // Combine with high-frequency meaningful words
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  const frequentWords = Object.entries(wordFreq)
    .filter(([word, freq]) => freq >= 2 && word.length > 3)
    .map(([word]) => word);
  
  return [...new Set([...importantTerms, ...frequentWords])];
}

/**
 * Calculate Jaccard similarity between two sets
 */
function calculateJaccardSimilarity(set1: string[], set2: string[]): number {
  const intersection = set1.filter(item => set2.includes(item));
  const union = [...new Set([...set1, ...set2])];
  
  return union.length === 0 ? 0 : intersection.length / union.length;
}

/**
 * Calculate cosine similarity between two texts (simplified)
 */
function calculateCosineSimilarity(text1: string, text2: string): number {
  const words1 = text1.split(' ');
  const words2 = text2.split(' ');
  
  // Create word frequency vectors
  const allWords = [...new Set([...words1, ...words2])];
  const vector1 = allWords.map(word => words1.filter(w => w === word).length);
  const vector2 = allWords.map(word => words2.filter(w => w === word).length);
  
  // Calculate dot product
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  
  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate length similarity (penalize very different lengths)
 */
function calculateLengthSimilarity(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;
  
  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;
  
  const ratio = Math.min(len1, len2) / Math.max(len1, len2);
  return ratio;
}

/**
 * Calculate entity similarity (locations, numbers, etc.)
 */
function calculateEntitySimilarity(text1: string, text2: string): number {
  const entities1 = extractEntities(text1);
  const entities2 = extractEntities(text2);
  
  return calculateJaccardSimilarity(entities1, entities2);
}

/**
 * Extract entities from text
 */
function extractEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Extract numbers
  const numbers = text.match(/\d+/g) || [];
  entities.push(...numbers);
  
  // Extract street names
  const streets = text.match(/jalan?\s+[\w\s]+|jl\.?\s*[\w\s]+/gi) || [];
  entities.push(...streets.map(s => s.toLowerCase().trim()));
  
  // Extract RT/RW
  const rtRw = text.match(/rt\s*\d+|rw\s*\d+/gi) || [];
  entities.push(...rtRw.map(s => s.toLowerCase().trim()));
  
  return entities;
}

// ================================
// Constants and Data
// ================================

const INDONESIAN_STOP_WORDS = [
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'ini', 'itu', 'ada',
  'adalah', 'atau', 'juga', 'akan', 'pada', 'oleh', 'dalam', 'tidak', 'bisa',
  'dapat', 'sudah', 'masih', 'harus', 'kalau', 'jika', 'tapi', 'tetapi'
];

const INFRASTRUCTURE_TERMS = [
  'jalan', 'jembatan', 'trotoar', 'lampu', 'drainase', 'got', 'selokan',
  'pipa', 'kabel', 'tiang', 'aspal', 'beton', 'rusak', 'bocor', 'pecah'
];

const LOCATION_TERMS = [
  'jalan', 'jl', 'gang', 'gg', 'rt', 'rw', 'kelurahan', 'kecamatan',
  'depan', 'belakang', 'samping', 'dekat', 'sekitar'
];

const ISSUE_TERMS = [
  'rusak', 'bocor', 'pecah', 'roboh', 'kotor', 'bau', 'macet', 'gelap',
  'bahaya', 'tidak', 'kurang', 'buruk', 'jelek', 'parah'
];