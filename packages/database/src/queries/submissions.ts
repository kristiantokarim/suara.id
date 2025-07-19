import { prisma } from '../client';
import type { 
  SubmissionWithDetails,
  SubmissionCreateInput,
  IssueFilters,
  PaginatedResponse,
  LocationData,
  ConversationMessage
} from '../types';

/**
 * Create new submission
 */
export async function createSubmission(
  userId: string,
  data: SubmissionCreateInput
): Promise<SubmissionWithDetails> {
  return prisma.submission.create({
    data: {
      userId,
      description: data.description,
      location: data.location as any,
      images: data.images || [],
      conversationLog: data.conversationLog as any,
      metadata: data.metadata as any,
      status: 'PENDING',
    },
    include: {
      user: true,
      qualityScore: true,
      issue: true,
      cluster: true,
    },
  });
}

/**
 * Get submission by ID with full details
 */
export async function getSubmissionById(id: string): Promise<SubmissionWithDetails | null> {
  return prisma.submission.findUnique({
    where: { id },
    include: {
      user: true,
      qualityScore: true,
      issue: true,
      cluster: true,
    },
  });
}

/**
 * Get user's submissions with pagination
 */
export async function getUserSubmissions(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<SubmissionWithDetails>> {
  const offset = (page - 1) * limit;

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where: { userId },
      include: {
        user: true,
        qualityScore: true,
        issue: true,
        cluster: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.submission.count({
      where: { userId },
    }),
  ]);

  return {
    data: submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get submissions by location radius
 */
export async function getSubmissionsByLocation(
  center: [number, number],
  radiusKm: number,
  filters?: IssueFilters,
  limit: number = 100
): Promise<SubmissionWithDetails[]> {
  // Note: This is a simplified version. In production, you'd use PostGIS
  // for proper geographic queries
  const submissions = await prisma.submission.findMany({
    where: {
      AND: [
        filters?.category ? {
          category: { in: filters.category }
        } : {},
        filters?.status ? {
          status: { in: filters.status }
        } : {},
        filters?.dateRange ? {
          createdAt: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end,
          }
        } : {},
        {
          processed: true,
        },
      ],
    },
    include: {
      user: true,
      qualityScore: true,
      issue: true,
      cluster: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Filter by geographic distance (simplified)
  return submissions.filter(submission => {
    const location = submission.location as LocationData;
    if (!location.coordinates) return false;
    
    const [lat, lng] = location.coordinates;
    const distance = calculateDistance(center[0], center[1], lat, lng);
    return distance <= radiusKm;
  });
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
  id: string,
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'REJECTED' | 'SPAM',
  processedAt?: Date
): Promise<void> {
  await prisma.submission.update({
    where: { id },
    data: {
      status,
      processed: status === 'PROCESSED',
      processedAt: processedAt || (status === 'PROCESSED' ? new Date() : undefined),
    },
  });
}

/**
 * Get pending submissions for processing
 */
export async function getPendingSubmissions(limit: number = 50): Promise<SubmissionWithDetails[]> {
  return prisma.submission.findMany({
    where: {
      status: 'PENDING',
      processed: false,
    },
    include: {
      user: true,
      qualityScore: true,
      issue: true,
      cluster: true,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

/**
 * Search submissions by text
 */
export async function searchSubmissions(
  query: string,
  filters?: IssueFilters,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<SubmissionWithDetails>> {
  const offset = (page - 1) * limit;

  const whereClause = {
    AND: [
      {
        OR: [
          { description: { contains: query, mode: 'insensitive' as const } },
          { issue: { title: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      filters?.category ? {
        category: { in: filters.category }
      } : {},
      filters?.status ? {
        status: { in: filters.status }
      } : {},
      filters?.dateRange ? {
        createdAt: {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end,
        }
      } : {},
    ],
  };

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where: whereClause,
      include: {
        user: true,
        qualityScore: true,
        issue: true,
        cluster: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.submission.count({
      where: whereClause,
    }),
  ]);

  return {
    data: submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get submission statistics
 */
export async function getSubmissionStats(timeframe?: { start: Date; end: Date }) {
  const whereClause = timeframe ? {
    createdAt: {
      gte: timeframe.start,
      lte: timeframe.end,
    },
  } : {};

  const [
    total,
    processed,
    byCategory,
    byStatus,
    avgQuality
  ] = await Promise.all([
    prisma.submission.count({ where: whereClause }),
    prisma.submission.count({ 
      where: { ...whereClause, processed: true } 
    }),
    prisma.submission.groupBy({
      by: ['category'],
      where: whereClause,
      _count: { category: true },
    }),
    prisma.submission.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { status: true },
    }),
    prisma.submissionQualityScore.aggregate({
      _avg: { totalScore: true },
      where: {
        submission: whereClause,
      },
    }),
  ]);

  return {
    total,
    processed,
    byCategory,
    byStatus,
    avgQualityScore: avgQuality._avg.totalScore || 0,
  };
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}