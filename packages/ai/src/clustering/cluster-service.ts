/**
 * Cluster Service
 * 
 * Main service for clustering submissions using multiple algorithms including
 * DBSCAN, hierarchical clustering, and geographic clustering optimized for
 * Indonesian urban issue reporting.
 */

import { success, failure, type Result, type IssueCategory, type IssueSeverity } from '@suara/config';
import type { ProcessedSubmission } from '../types';
import type { 
  SubmissionCluster, 
  ClusteringConfig, 
  ClusteringResult,
  ClusteringOperationResult 
} from '../types';
import { 
  calculateSimilarity, 
  calculateSimilarityMatrix, 
  type SimilarityScore 
} from './similarity-engine';

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
 * Default clustering configuration optimized for Indonesian urban issues
 */
const DEFAULT_CONFIG: ClusteringConfig = {
  maxDistanceKm: 5.0, // 5km default search radius
  minSubmissions: 2,
  semanticSimilarityThreshold: 0.6,
  temporalWindowHours: 168, // 1 week
  categoryWeight: 0.2,
  locationWeight: 0.4,
  contentWeight: 0.3,
  timeWeight: 0.1
};

/**
 * Cluster submissions using enhanced DBSCAN algorithm
 * 
 * @param submissions - Array of processed submissions
 * @param config - Clustering configuration
 * @returns Clustering result with formed clusters and metrics
 */
export async function clusterSubmissions(
  submissions: ProcessedSubmission[],
  config: ClusteringConfig = DEFAULT_CONFIG
): Promise<ClusteringOperationResult> {
  try {
    const startTime = Date.now();
    
    if (submissions.length < config.minSubmissions) {
      return success({
        clusters: [],
        orphanedSubmissions: submissions,
        metrics: {
          totalClusters: 0,
          avgClusterSize: 0,
          clusteringAccuracy: 0,
          processingTimeMs: Date.now() - startTime
        }
      });
    }

    // Calculate similarity matrix
    const similarityResult = await calculateSimilarityMatrix(submissions, config);
    if (!similarityResult.success) {
      return failure(similarityResult.error, similarityResult.issues);
    }
    
    const similarityMatrix = similarityResult.data;
    
    // Apply enhanced DBSCAN clustering
    const clusterAssignments = await performDBSCANClustering(
      submissions,
      similarityMatrix,
      config
    );
    
    // Form clusters from assignments
    const clusters = await formClusters(submissions, clusterAssignments, config);
    
    // Calculate metrics
    const metrics = calculateClusteringMetrics(
      clusters, 
      submissions, 
      Date.now() - startTime
    );
    
    // Identify orphaned submissions
    const clusteredSubmissionIds = new Set(
      clusters.flatMap(cluster => cluster.submissions.map(s => s.id))
    );
    const orphanedSubmissions = submissions.filter(
      s => !clusteredSubmissionIds.has(s.id)
    );
    
    return success({
      clusters,
      orphanedSubmissions,
      metrics
    });
    
  } catch (error) {
    console.error('Failed to cluster submissions:', error);
    return failure(
      'Gagal mengelompokkan laporan',
      [error instanceof Error ? error.message : 'Clustering operation error']
    );
  }
}

/**
 * Update existing clusters with new submissions
 * 
 * @param existingClusters - Current cluster state
 * @param newSubmissions - New submissions to process
 * @param config - Clustering configuration
 * @returns Updated clusters and new clusters
 */
export async function updateClusters(
  existingClusters: SubmissionCluster[],
  newSubmissions: ProcessedSubmission[],
  config: ClusteringConfig = DEFAULT_CONFIG
): Promise<Result<{
  updatedClusters: SubmissionCluster[];
  newClusters: SubmissionCluster[];
  orphanedSubmissions: ProcessedSubmission[];
}>> {
  try {
    const updatedClusters: SubmissionCluster[] = [];
    const newClusters: SubmissionCluster[] = [];
    const orphanedSubmissions: ProcessedSubmission[] = [];
    
    for (const submission of newSubmissions) {
      let assigned = false;
      
      // Try to assign to existing clusters
      for (const cluster of existingClusters) {
        if (await shouldAddToCluster(submission, cluster, config)) {
          const updatedCluster = await addSubmissionToCluster(submission, cluster);
          
          // Replace or add updated cluster
          const existingIndex = updatedClusters.findIndex(c => c.id === cluster.id);
          if (existingIndex >= 0) {
            updatedClusters[existingIndex] = updatedCluster;
          } else {
            updatedClusters.push(updatedCluster);
          }
          
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        // Check if submission can form new cluster with other orphaned submissions
        const canFormCluster = await canFormNewCluster(
          submission, 
          orphanedSubmissions, 
          config
        );
        
        if (canFormCluster.canForm) {
          const newCluster = await createClusterFromSubmissions(
            [submission, ...canFormCluster.relatedSubmissions],
            config
          );
          newClusters.push(newCluster);
          
          // Remove used submissions from orphaned list
          canFormCluster.relatedSubmissions.forEach(related => {
            const index = orphanedSubmissions.findIndex(s => s.id === related.id);
            if (index >= 0) orphanedSubmissions.splice(index, 1);
          });
        } else {
          orphanedSubmissions.push(submission);
        }
      }
    }
    
    return success({
      updatedClusters,
      newClusters,
      orphanedSubmissions
    });
    
  } catch (error) {
    console.error('Failed to update clusters:', error);
    return failure(
      'Gagal memperbarui pengelompokan',
      [error instanceof Error ? error.message : 'Cluster update error']
    );
  }
}

/**
 * Get cluster recommendations for government response
 * 
 * @param clusters - Array of submission clusters
 * @returns Prioritized cluster recommendations
 */
export async function getClusterRecommendations(
  clusters: SubmissionCluster[]
): Promise<Result<Array<{
  cluster: SubmissionCluster;
  priority: number;
  recommendedActions: string[];
  estimatedImpact: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}>>> {
  try {
    const recommendations = await Promise.all(
      clusters.map(async cluster => {
        const priority = calculateClusterPriority(cluster);
        const recommendedActions = generateRecommendedActions(cluster);
        const estimatedImpact = assessClusterImpact(cluster);
        const urgencyLevel = determineUrgencyLevel(cluster);
        
        return {
          cluster,
          priority,
          recommendedActions,
          estimatedImpact,
          urgencyLevel
        };
      })
    );
    
    // Sort by priority (descending)
    recommendations.sort((a, b) => b.priority - a.priority);
    
    return success(recommendations);
    
  } catch (error) {
    console.error('Failed to generate cluster recommendations:', error);
    return failure(
      'Gagal membuat rekomendasi pengelompokan',
      [error instanceof Error ? error.message : 'Recommendation generation error']
    );
  }
}

// ================================
// Core Clustering Algorithms
// ================================

/**
 * Perform DBSCAN clustering with enhancements for submission data
 */
async function performDBSCANClustering(
  submissions: ProcessedSubmission[],
  similarityMatrix: number[][],
  config: ClusteringConfig
): Promise<number[]> {
  const n = submissions.length;
  const clusterAssignments: number[] = Array(n).fill(-1); // -1 = unassigned
  let currentClusterId = 0;
  
  for (let i = 0; i < n; i++) {
    if (clusterAssignments[i] !== -1) continue; // Already processed
    
    // Find neighbors based on similarity threshold
    const neighbors = findNeighbors(i, similarityMatrix, config.semanticSimilarityThreshold);
    
    if (neighbors.length < config.minSubmissions) {
      continue; // Not enough neighbors to form cluster
    }
    
    // Start new cluster
    clusterAssignments[i] = currentClusterId;
    const queue = [...neighbors];
    
    while (queue.length > 0) {
      const currentIdx = queue.shift()!;
      
      if (clusterAssignments[currentIdx] === -1) {
        clusterAssignments[currentIdx] = currentClusterId;
        
        // Find neighbors of current point
        const currentNeighbors = findNeighbors(
          currentIdx, 
          similarityMatrix, 
          config.semanticSimilarityThreshold
        );
        
        if (currentNeighbors.length >= config.minSubmissions) {
          // Add new neighbors to queue
          for (const neighborIdx of currentNeighbors) {
            if (clusterAssignments[neighborIdx] === -1) {
              queue.push(neighborIdx);
            }
          }
        }
      }
    }
    
    currentClusterId++;
  }
  
  return clusterAssignments;
}

/**
 * Find neighbors based on similarity threshold
 */
function findNeighbors(
  pointIndex: number,
  similarityMatrix: number[][],
  threshold: number
): number[] {
  const neighbors: number[] = [];
  
  for (let i = 0; i < similarityMatrix.length; i++) {
    if (i !== pointIndex && similarityMatrix[pointIndex][i] >= threshold) {
      neighbors.push(i);
    }
  }
  
  return neighbors;
}

/**
 * Form cluster objects from cluster assignments
 */
async function formClusters(
  submissions: ProcessedSubmission[],
  clusterAssignments: number[],
  config: ClusteringConfig
): Promise<SubmissionCluster[]> {
  const clusterMap = new Map<number, ProcessedSubmission[]>();
  
  // Group submissions by cluster ID
  clusterAssignments.forEach((clusterId, index) => {
    if (clusterId >= 0) {
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      clusterMap.get(clusterId)!.push(submissions[index]);
    }
  });
  
  // Create cluster objects
  const clusters: SubmissionCluster[] = [];
  let clusterIndex = 0;
  
  for (const [clusterId, clusterSubmissions] of clusterMap) {
    if (clusterSubmissions.length >= config.minSubmissions) {
      const cluster = await createClusterFromSubmissions(clusterSubmissions, config);
      cluster.id = `cluster_${Date.now()}_${clusterIndex++}`;
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

/**
 * Create cluster from submissions
 */
async function createClusterFromSubmissions(
  submissions: ProcessedSubmission[],
  config: ClusteringConfig
): Promise<SubmissionCluster> {
  // Calculate cluster center (geographic)
  const centerLocation = calculateClusterCenter(submissions);
  
  // Calculate cluster radius
  const radiusKm = calculateClusterRadius(submissions, centerLocation);
  
  // Determine cluster category (most common)
  const category = determineClusterCategory(submissions);
  
  // Determine cluster severity (highest)
  const severity = determineClusterSeverity(submissions);
  
  // Generate cluster summary
  const aiSummary = generateClusterSummary(submissions);
  
  // Calculate metrics
  const avgQualityScore = submissions.reduce(
    (sum, s) => sum + (s.validationResults?.qualityScore || 0), 0
  ) / submissions.length;
  
  const urgencyScore = calculateClusterUrgency(submissions);
  const impactScore = calculateClusterImpact(submissions);
  
  // Get affected areas
  const affectedAreas = getAffectedAreas(submissions);
  
  // Generate suggested actions
  const suggestedActions = generateSuggestedActions(submissions, category);
  
  return {
    id: '', // Will be set by caller
    name: generateClusterName(category, affectedAreas[0] || 'Area'),
    description: aiSummary,
    category,
    severity,
    
    submissionCount: submissions.length,
    avgQualityScore,
    urgencyScore,
    impactScore,
    
    centerLocation,
    radiusKm,
    affectedAreas,
    
    firstReported: new Date(Math.min(...submissions.map(s => s.createdAt.getTime()))),
    lastReported: new Date(Math.max(...submissions.map(s => s.createdAt.getTime()))),
    trendDirection: 'stable', // TODO: Calculate based on submission frequency
    
    aiSummary,
    suggestedActions,
    priorityRank: calculateClusterPriority({ submissions, urgencyScore, impactScore } as any),
    
    submissions,
    relatedClusters: [], // TODO: Find related clusters
    
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  };
}

// ================================
// Helper Functions
// ================================

/**
 * Calculate geographic center of cluster
 */
function calculateClusterCenter(submissions: ProcessedSubmission[]): [number, number] {
  const validCoords = submissions
    .map(s => (s.location as any)?.coordinates)
    .filter(coords => coords && coords.length === 2);
  
  if (validCoords.length === 0) return [0, 0];
  
  const sumLat = validCoords.reduce((sum, coords) => sum + coords[0], 0);
  const sumLng = validCoords.reduce((sum, coords) => sum + coords[1], 0);
  
  return [sumLat / validCoords.length, sumLng / validCoords.length];
}

/**
 * Calculate cluster radius in kilometers
 */
function calculateClusterRadius(
  submissions: ProcessedSubmission[],
  center: [number, number]
): number {
  const distances = submissions
    .map(s => (s.location as any)?.coordinates)
    .filter(coords => coords && coords.length === 2)
    .map(coords => calculateDistance(center[0], center[1], coords[0], coords[1]));
  
  return distances.length > 0 ? Math.max(...distances) : 0;
}

/**
 * Determine most common category in cluster
 */
function determineClusterCategory(submissions: ProcessedSubmission[]): IssueCategory {
  const categoryCounts: Record<string, number> = {};
  
  submissions.forEach(s => {
    const category = (s.metadata as any)?.category || 'OTHER';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  const mostCommon = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  return (mostCommon?.[0] || 'OTHER') as IssueCategory;
}

/**
 * Determine highest severity in cluster
 */
function determineClusterSeverity(submissions: ProcessedSubmission[]): IssueSeverity {
  const severityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let maxSeverity = 'LOW';
  
  submissions.forEach(s => {
    const severity = (s.metadata as any)?.severity || 'LOW';
    const currentIndex = severityLevels.indexOf(maxSeverity);
    const submissionIndex = severityLevels.indexOf(severity);
    
    if (submissionIndex > currentIndex) {
      maxSeverity = severity;
    }
  });
  
  return maxSeverity as IssueSeverity;
}

/**
 * Generate cluster summary using AI
 */
function generateClusterSummary(submissions: ProcessedSubmission[]): string {
  // Simple implementation - in production, use LLM
  const category = determineClusterCategory(submissions);
  const count = submissions.length;
  const area = getAffectedAreas(submissions)[0] || 'area yang tidak diketahui';
  
  const categoryNames = {
    'INFRASTRUCTURE': 'infrastruktur',
    'ENVIRONMENT': 'lingkungan',
    'SAFETY': 'keamanan',
    'HEALTH': 'kesehatan',
    'EDUCATION': 'pendidikan',
    'GOVERNANCE': 'pelayanan publik',
    'SOCIAL': 'sosial',
    'OTHER': 'umum'
  };
  
  return `Terdapat ${count} laporan terkait masalah ${categoryNames[category]} di ${area}. ` +
         `Masalah ini memerlukan perhatian dari pihak terkait untuk penanganan yang tepat.`;
}

/**
 * Calculate cluster urgency score
 */
function calculateClusterUrgency(submissions: ProcessedSubmission[]): number {
  const urgencyScores = submissions.map(s => 
    s.processingMetadata?.aiAnalysis?.urgency || 0.5
  );
  
  // Weight by recency and count
  const avgUrgency = urgencyScores.reduce((sum, score) => sum + score, 0) / urgencyScores.length;
  const countBonus = Math.min(0.3, submissions.length / 10); // Up to 0.3 bonus for more submissions
  
  return Math.min(1, avgUrgency + countBonus);
}

/**
 * Calculate cluster impact score
 */
function calculateClusterImpact(submissions: ProcessedSubmission[]): number {
  // Simple heuristic based on submission count, quality, and affected area
  const countScore = Math.min(0.5, submissions.length / 20);
  const qualityScore = submissions.reduce(
    (sum, s) => sum + (s.validationResults?.qualityScore || 0), 0
  ) / (submissions.length * 100); // Normalize to 0-1
  
  return Math.min(1, countScore + qualityScore);
}

/**
 * Get affected administrative areas
 */
function getAffectedAreas(submissions: ProcessedSubmission[]): string[] {
  const areas = new Set<string>();
  
  submissions.forEach(s => {
    const location = s.location as any;
    if (location?.kelurahan) areas.add(location.kelurahan);
    if (location?.kecamatan) areas.add(location.kecamatan);
    if (location?.kabupaten) areas.add(location.kabupaten);
  });
  
  return Array.from(areas);
}

/**
 * Generate cluster name
 */
function generateClusterName(category: IssueCategory, area: string): string {
  const categoryNames = {
    'INFRASTRUCTURE': 'Infrastruktur',
    'ENVIRONMENT': 'Lingkungan',
    'SAFETY': 'Keamanan',
    'HEALTH': 'Kesehatan',
    'EDUCATION': 'Pendidikan',
    'GOVERNANCE': 'Pelayanan Publik',
    'SOCIAL': 'Sosial',
    'OTHER': 'Umum'
  };
  
  return `${categoryNames[category]} - ${area}`;
}

/**
 * Generate suggested actions for cluster
 */
function generateSuggestedActions(
  submissions: ProcessedSubmission[],
  category: IssueCategory
): string[] {
  // Category-specific action templates
  const actionTemplates: Record<IssueCategory, string[]> = {
    'INFRASTRUCTURE': [
      'Koordinasi dengan Dinas Pekerjaan Umum',
      'Survey lapangan untuk assessment kerusakan',
      'Alokasi anggaran untuk perbaikan',
      'Jadwalkan perbaikan berdasarkan prioritas'
    ],
    'ENVIRONMENT': [
      'Koordinasi dengan Dinas Lingkungan Hidup',
      'Pembersihan dan penataan area',
      'Sosialisasi kepada masyarakat',
      'Monitoring berkelanjutan'
    ],
    'SAFETY': [
      'Koordinasi dengan Kepolisian setempat',
      'Peningkatan patroli keamanan',
      'Instalasi sistem keamanan',
      'Pembentukan ronda masyarakat'
    ],
    'HEALTH': [
      'Koordinasi dengan Dinas Kesehatan',
      'Pemeriksaan dan assessment medis',
      'Pemberian layanan kesehatan',
      'Edukasi kesehatan masyarakat'
    ],
    'EDUCATION': [
      'Koordinasi dengan Dinas Pendidikan',
      'Assessment fasilitas pendidikan',
      'Peningkatan kualitas layanan',
      'Dukungan program pendidikan'
    ],
    'GOVERNANCE': [
      'Review prosedur pelayanan',
      'Pelatihan petugas pelayanan',
      'Digitalisasi layanan publik',
      'Monitoring kepuasan masyarakat'
    ],
    'SOCIAL': [
      'Koordinasi dengan Dinas Sosial',
      'Program pemberdayaan masyarakat',
      'Mediasi konflik jika diperlukan',
      'Penguatan kohesi sosial'
    ],
    'OTHER': [
      'Assessment lebih lanjut diperlukan',
      'Koordinasi dengan dinas terkait',
      'Konsultasi dengan ahli',
      'Tindak lanjut sesuai analisis'
    ]
  };
  
  return actionTemplates[category] || actionTemplates['OTHER'];
}

/**
 * Calculate cluster priority score
 */
function calculateClusterPriority(cluster: any): number {
  const urgencyWeight = 0.4;
  const impactWeight = 0.3;
  const countWeight = 0.2;
  const timeWeight = 0.1;
  
  const urgencyScore = cluster.urgencyScore || 0;
  const impactScore = cluster.impactScore || 0;
  const countScore = Math.min(1, (cluster.submissions?.length || 0) / 10);
  
  // Time score based on how recent the latest report is
  const now = Date.now();
  const latestReport = cluster.lastReported || new Date();
  const timeDiff = (now - latestReport.getTime()) / (1000 * 60 * 60 * 24); // days
  const timeScore = Math.max(0, 1 - (timeDiff / 30)); // Decay over 30 days
  
  return Math.round(
    (urgencyScore * urgencyWeight +
     impactScore * impactWeight +
     countScore * countWeight +
     timeScore * timeWeight) * 10
  );
}

/**
 * Calculate clustering metrics
 */
function calculateClusteringMetrics(
  clusters: SubmissionCluster[],
  totalSubmissions: ProcessedSubmission[],
  processingTimeMs: number
): ClusteringResult['metrics'] {
  const totalClusters = clusters.length;
  const clusteredSubmissions = clusters.reduce((sum, c) => sum + c.submissionCount, 0);
  const avgClusterSize = totalClusters > 0 ? clusteredSubmissions / totalClusters : 0;
  const clusteringAccuracy = totalSubmissions.length > 0 ? 
    clusteredSubmissions / totalSubmissions.length : 0;
  
  return {
    totalClusters,
    avgClusterSize: Math.round(avgClusterSize * 100) / 100,
    clusteringAccuracy: Math.round(clusteringAccuracy * 100) / 100,
    processingTimeMs
  };
}

// Additional helper functions for cluster updates

async function shouldAddToCluster(
  submission: ProcessedSubmission,
  cluster: SubmissionCluster,
  config: ClusteringConfig
): Promise<boolean> {
  // Check if submission is similar enough to cluster center
  // Use a representative submission from cluster for comparison
  const representative = cluster.submissions[0];
  const similarity = calculateSimilarity(submission, representative, config);
  
  return similarity.overall >= config.semanticSimilarityThreshold;
}

async function addSubmissionToCluster(
  submission: ProcessedSubmission,
  cluster: SubmissionCluster
): Promise<SubmissionCluster> {
  const updatedSubmissions = [...cluster.submissions, submission];
  
  // Recalculate cluster properties
  const updatedCluster: SubmissionCluster = {
    ...cluster,
    submissions: updatedSubmissions,
    submissionCount: updatedSubmissions.length,
    lastReported: new Date(Math.max(
      cluster.lastReported.getTime(),
      submission.createdAt.getTime()
    )),
    updatedAt: new Date()
  };
  
  // Recalculate center and radius
  updatedCluster.centerLocation = calculateClusterCenter(updatedSubmissions);
  updatedCluster.radiusKm = calculateClusterRadius(
    updatedSubmissions, 
    updatedCluster.centerLocation
  );
  
  return updatedCluster;
}

async function canFormNewCluster(
  submission: ProcessedSubmission,
  orphanedSubmissions: ProcessedSubmission[],
  config: ClusteringConfig
): Promise<{ canForm: boolean; relatedSubmissions: ProcessedSubmission[] }> {
  const relatedSubmissions: ProcessedSubmission[] = [];
  
  for (const orphaned of orphanedSubmissions) {
    const similarity = calculateSimilarity(submission, orphaned, config);
    if (similarity.overall >= config.semanticSimilarityThreshold) {
      relatedSubmissions.push(orphaned);
    }
  }
  
  return {
    canForm: relatedSubmissions.length + 1 >= config.minSubmissions,
    relatedSubmissions
  };
}

function assessClusterImpact(cluster: SubmissionCluster): string {
  const score = cluster.impactScore;
  
  if (score >= 0.8) return 'Dampak Tinggi';
  if (score >= 0.6) return 'Dampak Sedang';
  if (score >= 0.4) return 'Dampak Rendah';
  return 'Dampak Minimal';
}

function determineUrgencyLevel(cluster: SubmissionCluster): 'low' | 'medium' | 'high' | 'critical' {
  const score = cluster.urgencyScore;
  
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function generateRecommendedActions(cluster: SubmissionCluster): string[] {
  return cluster.suggestedActions;
}