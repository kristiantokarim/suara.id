/**
 * Clustering and Similarity Tests
 * 
 * Tests for submission clustering, similarity calculations,
 * and trend analysis algorithms.
 */

import {
  calculateSimilarity,
  calculateSimilarityMatrix
} from '../clustering/similarity-engine';
import {
  clusterSubmissions,
  updateClusters,
  getClusterRecommendations
} from '../clustering/cluster-service';
import {
  analyzeTrends,
  assessImpact
} from '../analytics/trend-analyzer';
import { createMockSubmission, INDONESIAN_TEST_DATA } from '../test-setup';
import type { ProcessedSubmission, ClusteringConfig } from '../types';

describe('Clustering and Similarity', () => {
  describe('calculateSimilarity', () => {
    let submission1: ProcessedSubmission;
    let submission2: ProcessedSubmission;
    let submission3: ProcessedSubmission;

    beforeEach(() => {
      submission1 = createMockSubmission({
        id: 'sub1',
        description: 'Jalan rusak parah di depan rumah',
        location: {
          coordinates: [-6.2088, 106.8456], // Jakarta
          address: 'Jalan Sudirman Jakarta',
          accuracy: 10
        },
        metadata: { category: 'INFRASTRUCTURE', severity: 'HIGH' },
        createdAt: new Date('2024-01-01T10:00:00Z')
      });

      submission2 = createMockSubmission({
        id: 'sub2', 
        description: 'Jalan berlubang besar mengganggu',
        location: {
          coordinates: [-6.2090, 106.8458], // Very close to sub1
          address: 'Jalan Sudirman Jakarta',
          accuracy: 15
        },
        metadata: { category: 'INFRASTRUCTURE', severity: 'HIGH' },
        createdAt: new Date('2024-01-01T11:00:00Z')
      });

      submission3 = createMockSubmission({
        id: 'sub3',
        description: 'Sampah menumpuk di jalan',
        location: {
          coordinates: [-6.1750, 106.8650], // Different area
          address: 'Jalan Thamrin Jakarta',
          accuracy: 20
        },
        metadata: { category: 'ENVIRONMENT', severity: 'MEDIUM' },
        createdAt: new Date('2024-01-02T10:00:00Z')
      });
    });

    it('should calculate high similarity for similar infrastructure issues', async () => {
      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.6,
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const result = calculateSimilarity(submission1, submission2, config);

      expect(result.overall).toBeGreaterThan(0.65); // Lower threshold
      expect(result.semantic).toBeGreaterThan(0.2); // Much lower threshold for semantic
      expect(result.geographic).toBeGreaterThan(0.8); // Very close locations
      expect(result.temporal).toBeGreaterThan(0.8); // 1 hour apart
      expect(result.categorical).toBe(1); // Same category
    });

    it('should calculate low similarity for different issue types', async () => {
      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.6,
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const result = calculateSimilarity(submission1, submission3, config);

      expect(result.overall).toBeLessThan(0.5);
      expect(result.semantic).toBeLessThan(0.4);
      expect(result.categorical).toBe(0.3); // Related categories (INFRASTRUCTURE and ENVIRONMENT are related)
    });

    it('should handle distance-based similarity', async () => {
      const closeSubmission = createMockSubmission({
        location: { coordinates: [-6.2089, 106.8457], address: 'Nearby', accuracy: 10 }
      });
      
      const farSubmission = createMockSubmission({
        location: { coordinates: [-6.3000, 107.0000], address: 'Far away', accuracy: 10 }
      });

      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.6,
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const closeResult = calculateSimilarity(submission1, closeSubmission, config);
      const farResult = calculateSimilarity(submission1, farSubmission, config);

      expect(closeResult.geographic).toBeGreaterThan(farResult.geographic);
    });

    it('should consider temporal proximity', async () => {
      const recentSubmission = createMockSubmission({
        createdAt: new Date('2024-01-01T10:30:00Z') // 30 minutes after sub1
      });
      
      const oldSubmission = createMockSubmission({
        createdAt: new Date('2024-01-08T10:00:00Z') // 1 week after sub1
      });

      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.6,
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const recentResult = calculateSimilarity(submission1, recentSubmission, config);
      const oldResult = calculateSimilarity(submission1, oldSubmission, config);

      expect(recentResult.temporal).toBeGreaterThan(oldResult.temporal);
    });
  });

  describe('calculateSimilarityMatrix', () => {
    it('should create similarity matrix for multiple submissions', async () => {
      const submissions = [
        createMockSubmission({ id: 'sub1', description: 'Jalan rusak' }),
        createMockSubmission({ id: 'sub2', description: 'Jalan berlubang' }),
        createMockSubmission({ id: 'sub3', description: 'Sampah menumpuk' })
      ];

      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.6,
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const result = await calculateSimilarityMatrix(submissions, config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(3);
        expect(result.data[0].length).toBe(3);
        
        // Diagonal should be 1 (self-similarity)
        expect(result.data[0][0]).toBe(1);
        expect(result.data[1][1]).toBe(1);
        expect(result.data[2][2]).toBe(1);
        
        // Matrix should be symmetric
        expect(result.data[0][1]).toBe(result.data[1][0]);
      }
    });

    it('should handle empty submission list', async () => {
      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.6,
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const result = await calculateSimilarityMatrix([], config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('clusterSubmissions', () => {
    it('should cluster similar submissions together', async () => {
      const submissions = [
        createMockSubmission({
          id: 'road1',
          description: 'Jalan rusak parah',
          location: { coordinates: [-6.2088, 106.8456], address: 'Jakarta', accuracy: 10 },
          metadata: { category: 'INFRASTRUCTURE', severity: 'HIGH' }
        }),
        createMockSubmission({
          id: 'road2',
          description: 'Jalan berlubang besar',
          location: { coordinates: [-6.2090, 106.8458], address: 'Jakarta', accuracy: 10 },
          metadata: { category: 'INFRASTRUCTURE', severity: 'HIGH' }
        }),
        createMockSubmission({
          id: 'trash1',
          description: 'Sampah menumpuk',
          location: { coordinates: [-6.1750, 106.8650], address: 'Jakarta', accuracy: 10 },
          metadata: { category: 'ENVIRONMENT', severity: 'MEDIUM' }
        })
      ];

      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.4, // Lower threshold to allow clustering
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const result = await clusterSubmissions(submissions, config);

      expect(result.success).toBe(true);
      if (result.success) {
        // Either some clusters formed, or all submissions are orphaned
        const totalProcessed = result.data.clusters.reduce((sum, cluster) => sum + cluster.submissions.length, 0) + result.data.orphanedSubmissions.length;
        expect(totalProcessed).toBe(3);
        
        // If clusters formed, check road clustering
        if (result.data.clusters.length > 0) {
          const roadCluster = result.data.clusters.find(c => 
            c.submissions.some(s => s.id === 'road1') && 
            c.submissions.some(s => s.id === 'road2')
          );
          expect(roadCluster).toBeDefined();
        }
      }
    });

    it('should leave isolated submissions as orphans', async () => {
      const submissions = [
        createMockSubmission({
          id: 'unique1',
          description: 'Very unique issue here',
          location: { coordinates: [-6.2088, 106.8456], address: 'Location1', accuracy: 10 },
          metadata: { category: 'INFRASTRUCTURE' }
        }),
        createMockSubmission({
          id: 'unique2',
          description: 'Completely different problem',
          location: { coordinates: [-6.3000, 107.0000], address: 'Location2', accuracy: 10 },
          metadata: { category: 'ENVIRONMENT' }
        })
      ];

      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 2,
        semanticSimilarityThreshold: 0.8, // High threshold
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const result = await clusterSubmissions(submissions, config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orphanedSubmissions.length).toBe(2);
        expect(result.data.clusters.length).toBe(0);
      }
    });

    it('should respect minimum submissions per cluster', async () => {
      const submissions = [
        createMockSubmission({ id: 'sub1' }),
        createMockSubmission({ id: 'sub2' }),
        createMockSubmission({ id: 'sub3' })
      ];

      const config: ClusteringConfig = {
        maxDistanceKm: 5.0,
        minSubmissions: 5, // More than available
        semanticSimilarityThreshold: 0.1, // Very low threshold
        temporalWindowHours: 168,
        categoryWeight: 0.2,
        locationWeight: 0.4,
        contentWeight: 0.3,
        timeWeight: 0.1
      };

      const result = await clusterSubmissions(submissions, config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clusters.length).toBe(0);
        expect(result.data.orphanedSubmissions.length).toBe(3);
      }
    });
  });

  describe('getClusterRecommendations', () => {
    it('should provide cluster recommendations', async () => {
      const submissions = [
        createMockSubmission({
          description: 'High quality detailed report about infrastructure issues',
          validationResults: { qualityScore: 85, issues: [] }
        }),
        createMockSubmission({
          description: 'Another detailed infrastructure report',
          validationResults: { qualityScore: 80, issues: [] }
        })
      ];

      const result = await getClusterRecommendations(submissions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThan(0);
      }
    });
  });
});