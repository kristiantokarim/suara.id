/**
 * Submission Service
 * 
 * Core business logic for submission management including creation,
 * validation, search, and status management.
 */

import { 
  validateSubmission, 
  validatePagination, 
  validateSearch,
  LIMITS,
  success,
  failure,
  type Result 
} from '@suara/config';

import {
  createSubmission as dbCreateSubmission,
  getSubmissionById as dbGetSubmissionById,
  getUserSubmissions as dbGetUserSubmissions,
  searchSubmissions as dbSearchSubmissions,
  updateSubmissionStatus as dbUpdateSubmissionStatus,
  getSubmissionStats as dbGetSubmissionStats,
  getSubmissionsByLocation as dbGetSubmissionsByLocation,
  type SubmissionWithDetails,
  type SubmissionCreateInput
} from '@suara/database';

import type {
  CreateSubmissionInput,
  CreateSubmissionResult,
  GetSubmissionResult,
  SearchSubmissionResult,
  UpdateSubmissionStatusResult,
  SubmissionStatsResult,
  SubmissionSearchCriteria,
  SubmissionSortOptions,
  PaginationParams,
  SubmissionStatus,
  ProcessedSubmission,
  SubmissionValidationResult,
  SubmissionProcessingMetadata
} from '../types';

import { validateSubmissionQuality } from '../processors/quality-validator';
import { enrichSubmissionData } from '../processors/data-enricher';
import { calculateGeographicMetrics } from '../utils/geographic-utils';

/**
 * Create a new submission with comprehensive validation and processing
 * 
 * @param userId - ID of the user creating the submission
 * @param input - Submission input data
 * @returns Result containing the processed submission
 * 
 * @example
 * ```typescript
 * const result = await createSubmission('user123', {
 *   content: 'Jalan rusak parah di depan sekolah',
 *   category: 'INFRASTRUCTURE',
 *   location: {
 *     coordinates: [-6.2088, 106.8456],
 *     address: 'Jl. Sudirman No. 1, Jakarta',
 *     accuracy: 10
 *   },
 *   severity: 'HIGH'
 * });
 * ```
 */
export async function createSubmission(
  userId: string,
  input: CreateSubmissionInput
): Promise<CreateSubmissionResult> {
  try {
    // Validate input using Zod
    const validation = validateSubmission(input);
    if (!validation.success) {
      return failure(validation.error, validation.issues);
    }

    const validatedInput = validation.data;

    // Check user submission rate limits
    const rateLimitCheck = await checkSubmissionRateLimit(userId);
    if (!rateLimitCheck.success) {
      return failure(rateLimitCheck.error, rateLimitCheck.issues);
    }

    // Validate submission quality
    const qualityValidation = await validateSubmissionQuality(validatedInput);
    if (!qualityValidation.success) {
      return failure(qualityValidation.error, qualityValidation.issues);
    }

    // Check for potential duplicates
    const duplicateCheck = await checkForDuplicates(userId, validatedInput);
    if (duplicateCheck.isDuplicate) {
      return failure(
        'Laporan serupa sudah ada. Silakan periksa laporan sebelumnya.',
        ['Potential duplicate submission detected']
      );
    }

    // Prepare database input
    const dbInput: SubmissionCreateInput = {
      description: validatedInput.content,
      location: validatedInput.location,
      images: validatedInput.images || [],
      conversationLog: [], // Will be populated by AI conversation
      metadata: {
        ...validatedInput.metadata,
        category: validatedInput.category,
        severity: validatedInput.severity,
        isAnonymous: validatedInput.isAnonymous || false,
        createdVia: 'web', // TODO: Make this dynamic
        clientMetadata: {
          userAgent: 'unknown', // TODO: Pass from request
          ipAddress: 'unknown',  // TODO: Pass from request
          timestamp: new Date().toISOString()
        }
      }
    };

    // Create submission in database
    const submission = await dbCreateSubmission(userId, dbInput);

    // Process submission (enrich data, calculate metrics)
    const processedSubmission = await processSubmission(submission);
    if (!processedSubmission.success) {
      // Log error but don't fail the creation
      console.error('Failed to process submission:', processedSubmission.error);
      // Return the basic submission with minimal processing
      return success({
        submission: await createMinimalProcessedSubmission(submission),
        validationWarnings: ['Submission created but processing incomplete']
      });
    }

    return success({
      submission: processedSubmission.data,
      validationWarnings: qualityValidation.data.warnings
    });

  } catch (error) {
    console.error('Failed to create submission:', error);
    return failure(
      'Gagal membuat laporan',
      [error instanceof Error ? error.message : 'Submission creation error']
    );
  }
}

/**
 * Get submission by ID with full processing data
 * 
 * @param submissionId - Submission ID
 * @param userId - Optional user ID for access control
 * @returns Result containing the processed submission
 */
export async function getSubmission(
  submissionId: string,
  userId?: string
): Promise<GetSubmissionResult> {
  try {
    const submission = await dbGetSubmissionById(submissionId);
    if (!submission) {
      return failure('Laporan tidak ditemukan', ['Submission not found']);
    }

    // Check access permissions (only owner or public submissions)
    if (userId && submission.userId !== userId && !submission.metadata?.isPublic) {
      return failure('Akses ditolak', ['Access denied to private submission']);
    }

    const processedSubmission = await ensureProcessedSubmission(submission);
    return success(processedSubmission);

  } catch (error) {
    console.error('Failed to get submission:', error);
    return failure(
      'Gagal mengambil data laporan',
      [error instanceof Error ? error.message : 'Submission retrieval error']
    );
  }
}

/**
 * Get user's submissions with pagination
 * 
 * @param userId - User ID
 * @param pagination - Pagination parameters
 * @returns Result containing paginated submissions
 */
export async function getUserSubmissions(
  userId: string,
  pagination: PaginationParams = { page: 1, limit: LIMITS.PAGINATION.DEFAULT_PAGE_SIZE }
): Promise<SearchSubmissionResult> {
  try {
    // Validate pagination
    const paginationValidation = validatePagination(pagination);
    if (!paginationValidation.success) {
      return failure(paginationValidation.error, paginationValidation.issues);
    }

    const { page, limit } = paginationValidation.data;
    const result = await dbGetUserSubmissions(userId, page, limit);

    // Process submissions
    const processedSubmissions = await Promise.all(
      result.data.map(submission => ensureProcessedSubmission(submission))
    );

    return success({
      submissions: processedSubmissions,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Failed to get user submissions:', error);
    return failure(
      'Gagal mengambil laporan pengguna',
      [error instanceof Error ? error.message : 'User submissions retrieval error']
    );
  }
}

/**
 * Search submissions with comprehensive filtering
 * 
 * @param criteria - Search criteria
 * @param pagination - Pagination parameters
 * @param sort - Sort options
 * @returns Result containing search results
 */
export async function searchSubmissions(
  criteria: SubmissionSearchCriteria,
  pagination: PaginationParams = { page: 1, limit: LIMITS.PAGINATION.DEFAULT_PAGE_SIZE },
  sort?: SubmissionSortOptions
): Promise<SearchSubmissionResult> {
  try {
    // Validate search criteria
    const searchValidation = validateSearch({
      query: criteria.query,
      category: Array.isArray(criteria.category) ? criteria.category[0] : criteria.category,
      location: criteria.location,
      dateRange: criteria.dateRange,
      severity: Array.isArray(criteria.severity) ? criteria.severity[0] : criteria.severity,
      status: Array.isArray(criteria.status) ? criteria.status[0] : criteria.status
    });
    
    if (!searchValidation.success) {
      return failure(searchValidation.error, searchValidation.issues);
    }

    // Validate pagination
    const paginationValidation = validatePagination(pagination);
    if (!paginationValidation.success) {
      return failure(paginationValidation.error, paginationValidation.issues);
    }

    const { page, limit } = paginationValidation.data;

    // Handle geographic search
    if (criteria.location) {
      const geoResults = await dbGetSubmissionsByLocation(
        criteria.location.center,
        criteria.location.radius,
        {
          category: Array.isArray(criteria.category) ? criteria.category : 
                   criteria.category ? [criteria.category] : undefined,
          status: Array.isArray(criteria.status) ? criteria.status : 
                 criteria.status ? [criteria.status] : undefined,
          dateRange: criteria.dateRange
        },
        limit
      );

      const processedSubmissions = await Promise.all(
        geoResults.map(submission => ensureProcessedSubmission(submission))
      );

      return success({
        submissions: processedSubmissions,
        pagination: {
          page: 1,
          limit: processedSubmissions.length,
          total: processedSubmissions.length,
          totalPages: 1
        }
      });
    }

    // Handle text search
    if (criteria.query) {
      const searchResults = await dbSearchSubmissions(
        criteria.query,
        {
          category: Array.isArray(criteria.category) ? criteria.category : 
                   criteria.category ? [criteria.category] : undefined,
          status: Array.isArray(criteria.status) ? criteria.status : 
                 criteria.status ? [criteria.status] : undefined,
          dateRange: criteria.dateRange
        },
        page,
        limit
      );

      const processedSubmissions = await Promise.all(
        searchResults.data.map(submission => ensureProcessedSubmission(submission))
      );

      return success({
        submissions: processedSubmissions,
        pagination: searchResults.pagination
      });
    }

    // Handle filtered search without text query
    return success({
      submissions: [],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        totalPages: 0
      }
    });

  } catch (error) {
    console.error('Failed to search submissions:', error);
    return failure(
      'Gagal mencari laporan',
      [error instanceof Error ? error.message : 'Submission search error']
    );
  }
}

/**
 * Update submission status
 * 
 * @param submissionId - Submission ID
 * @param newStatus - New status
 * @param userId - Optional user ID for access control
 * @returns Result containing update status
 */
export async function updateSubmissionStatus(
  submissionId: string,
  newStatus: SubmissionStatus,
  userId?: string
): Promise<UpdateSubmissionStatusResult> {
  try {
    // Check if submission exists and user has access
    const submission = await dbGetSubmissionById(submissionId);
    if (!submission) {
      return failure('Laporan tidak ditemukan', ['Submission not found']);
    }

    if (userId && submission.userId !== userId) {
      return failure('Akses ditolak', ['Access denied']);
    }

    // Update status in database
    const processedAt = newStatus === 'PROCESSED' ? new Date() : undefined;
    await dbUpdateSubmissionStatus(submissionId, newStatus, processedAt);

    return success({
      updated: true,
      newStatus
    });

  } catch (error) {
    console.error('Failed to update submission status:', error);
    return failure(
      'Gagal mengupdate status laporan',
      [error instanceof Error ? error.message : 'Status update error']
    );
  }
}

/**
 * Get submission statistics
 * 
 * @param timeframe - Optional time range filter
 * @returns Result containing statistics
 */
export async function getSubmissionStatistics(
  timeframe?: { start: Date; end: Date }
): Promise<SubmissionStatsResult> {
  try {
    const stats = await dbGetSubmissionStats(timeframe);

    return success({
      total: stats.total,
      processed: stats.processed,
      avgQualityScore: stats.avgQualityScore,
      byCategory: stats.byCategory.reduce((acc, item) => {
        acc[item.category as any] = item._count.category;
        return acc;
      }, {} as Record<string, number>),
      byStatus: stats.byStatus.reduce((acc, item) => {
        acc[item.status as any] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
      byProvinsi: {} // TODO: Implement provincial statistics
    });

  } catch (error) {
    console.error('Failed to get submission statistics:', error);
    return failure(
      'Gagal mengambil statistik laporan',
      [error instanceof Error ? error.message : 'Statistics retrieval error']
    );
  }
}

// ================================
// Helper Functions
// ================================

/**
 * Check submission rate limit for user
 */
async function checkSubmissionRateLimit(userId: string): Promise<Result<boolean>> {
  try {
    // Get user's submissions from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSubmissions = await dbGetUserSubmissions(userId, 1, 100);
    
    const todaySubmissions = recentSubmissions.data.filter(
      submission => submission.createdAt > oneDayAgo
    );

    if (todaySubmissions.length >= LIMITS.SUBMISSION.MAX_DAILY_SUBMISSIONS) {
      return failure(
        `Batas maksimal ${LIMITS.SUBMISSION.MAX_DAILY_SUBMISSIONS} laporan per hari tercapai`,
        ['Daily submission limit exceeded']
      );
    }

    return success(true);

  } catch (error) {
    console.error('Failed to check rate limit:', error);
    return failure('Gagal memeriksa batas pengiriman', ['Rate limit check error']);
  }
}

/**
 * Check for potential duplicate submissions
 */
async function checkForDuplicates(
  userId: string, 
  input: CreateSubmissionInput
): Promise<{ isDuplicate: boolean; similarSubmission?: SubmissionWithDetails }> {
  try {
    // Get user's recent submissions (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSubmissions = await dbGetUserSubmissions(userId, 1, 50);
    
    const recentUserSubmissions = recentSubmissions.data.filter(
      submission => submission.createdAt > weekAgo
    );

    // Check for similar content and location
    for (const submission of recentUserSubmissions) {
      const contentSimilarity = calculateTextSimilarity(
        input.content, 
        submission.description
      );
      
      const locationSimilarity = calculateLocationSimilarity(
        input.location.coordinates,
        (submission.location as any)?.coordinates || [0, 0]
      );

      // Mark as duplicate if content is >80% similar and location is within 100m
      if (contentSimilarity > 0.8 && locationSimilarity < 0.1) {
        return { isDuplicate: true, similarSubmission: submission };
      }
    }

    return { isDuplicate: false };

  } catch (error) {
    console.error('Failed to check duplicates:', error);
    // Don't fail submission creation due to duplicate check error
    return { isDuplicate: false };
  }
}

/**
 * Process submission with full pipeline
 */
async function processSubmission(
  submission: SubmissionWithDetails
): Promise<Result<ProcessedSubmission>> {
  try {
    // Run quality validation
    const qualityResult = await validateSubmissionQuality({
      content: submission.description,
      category: (submission.metadata as any)?.category || 'OTHER',
      location: submission.location as any,
      images: submission.images,
      severity: (submission.metadata as any)?.severity || 'MEDIUM'
    });

    if (!qualityResult.success) {
      return failure(qualityResult.error, qualityResult.issues);
    }

    // Enrich submission data
    const enrichedData = await enrichSubmissionData(submission);
    
    // Calculate geographic metrics
    const geoMetrics = await calculateGeographicMetrics(submission.location as any);

    // Create processed submission
    const processedSubmission: ProcessedSubmission = {
      ...submission,
      validationResults: qualityResult.data,
      processingMetadata: {
        processedAt: new Date(),
        processingDuration: 0, // Will be calculated by pipeline
        algorithmVersion: '1.0.0',
        confidence: qualityResult.data.qualityScore / 100,
        aiAnalysis: enrichedData.aiAnalysis,
        geoAnalysis: {
          nearbySubmissions: 0, // TODO: Calculate
          clusterCandidate: false, // TODO: Calculate
          administrativeLevel: geoMetrics.administrativeLevel
        }
      }
    };

    return success(processedSubmission);

  } catch (error) {
    console.error('Failed to process submission:', error);
    return failure(
      'Gagal memproses laporan',
      [error instanceof Error ? error.message : 'Submission processing error']
    );
  }
}

/**
 * Create minimal processed submission when full processing fails
 */
async function createMinimalProcessedSubmission(
  submission: SubmissionWithDetails
): Promise<ProcessedSubmission> {
  return {
    ...submission,
    validationResults: {
      isValid: true,
      qualityScore: 50, // Default score
      issues: [],
      warnings: [],
      recommendations: [],
      contentAnalysis: {
        length: submission.description.length,
        clarity: 0.5,
        relevance: 0.5,
        language: 'id'
      },
      locationAnalysis: {
        accuracy: (submission.location as any)?.accuracy || 0,
        withinIndonesia: true, // Assume true
        administrativeDataComplete: false
      }
    },
    processingMetadata: {
      processedAt: new Date(),
      processingDuration: 0,
      algorithmVersion: '1.0.0',
      confidence: 0.5
    }
  };
}

/**
 * Ensure submission is processed (process if needed)
 */
async function ensureProcessedSubmission(
  submission: SubmissionWithDetails
): Promise<ProcessedSubmission> {
  // Check if already processed
  if ((submission as any).validationResults) {
    return submission as ProcessedSubmission;
  }

  // Process the submission
  const processResult = await processSubmission(submission);
  if (processResult.success) {
    return processResult.data;
  }

  // Fallback to minimal processing
  return createMinimalProcessedSubmission(submission);
}

/**
 * Calculate text similarity between two strings
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple implementation - in production use more sophisticated algorithm
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / totalWords;
}

/**
 * Calculate location similarity (distance in km)
 */
function calculateLocationSimilarity(
  coords1: [number, number], 
  coords2: [number, number]
): number {
  const [lat1, lng1] = coords1;
  const [lat2, lng2] = coords2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}