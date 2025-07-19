import { prisma } from '../client';
import type { 
  ClusterWithIssues,
  IssueCategory,
  IssueSeverity,
  LocationData
} from '../types';

/**
 * Create new issue cluster
 */
export async function createCluster(data: {
  title: string;
  description: string;
  category: IssueCategory;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
}): Promise<ClusterWithIssues> {
  return prisma.issueCluster.create({
    data: {
      ...data,
      status: 'ACTIVE',
      issueCount: 0,
      totalWeight: 0,
      avgQuality: 0,
    },
    include: {
      issues: {
        include: {
          submission: {
            include: { user: true },
          },
        },
      },
      submissions: {
        include: { user: true },
      },
      insights: true,
    },
  });
}

/**
 * Get cluster by ID with full details
 */
export async function getClusterById(id: string): Promise<ClusterWithIssues | null> {
  return prisma.issueCluster.findUnique({
    where: { id },
    include: {
      issues: {
        include: {
          submission: {
            include: { user: true },
          },
          responses: true,
        },
      },
      submissions: {
        include: { user: true },
      },
      insights: {
        orderBy: { generatedAt: 'desc' },
        take: 5,
      },
    },
  });
}

/**
 * Find clusters near a location
 */
export async function getClustersNearLocation(
  center: [number, number],
  radiusKm: number,
  category?: IssueCategory
): Promise<ClusterWithIssues[]> {
  const clusters = await prisma.issueCluster.findMany({
    where: {
      AND: [
        category ? { category } : {},
        { status: 'ACTIVE' },
      ],
    },
    include: {
      issues: {
        include: {
          submission: {
            include: { user: true },
          },
        },
      },
      submissions: {
        include: { user: true },
      },
      insights: {
        orderBy: { generatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { priority: 'desc' },
  });

  // Filter by geographic distance
  return clusters.filter(cluster => {
    const distance = calculateDistance(
      center[0], center[1], 
      cluster.centerLat, cluster.centerLng
    );
    return distance <= radiusKm;
  });
}

/**
 * Add submission to cluster
 */
export async function addSubmissionToCluster(
  clusterId: string,
  submissionId: string,
  weight: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Add submission to cluster
    await tx.submission.update({
      where: { id: submissionId },
      data: { clusterId },
    });

    // Update cluster statistics
    const cluster = await tx.issueCluster.findUnique({
      where: { id: clusterId },
      include: {
        submissions: {
          include: { qualityScore: true },
        },
      },
    });

    if (!cluster) throw new Error('Cluster not found');

    const totalWeight = cluster.totalWeight + weight;
    const avgQuality = cluster.submissions.reduce((sum, sub) => {
      return sum + (sub.qualityScore?.totalScore || 0);
    }, 0) / cluster.submissions.length;

    await tx.issueCluster.update({
      where: { id: clusterId },
      data: {
        issueCount: cluster.issueCount + 1,
        totalWeight,
        avgQuality,
        priority: calculateClusterPriority(totalWeight, avgQuality, cluster.submissions.length),
      },
    });
  });
}

/**
 * Get top priority clusters
 */
export async function getTopPriorityClusters(
  limit: number = 20,
  category?: IssueCategory,
  location?: string
): Promise<ClusterWithIssues[]> {
  return prisma.issueCluster.findMany({
    where: {
      AND: [
        category ? { category } : {},
        location ? { kelurahan: location } : {},
        { status: 'ACTIVE' },
        { issueCount: { gt: 0 } },
      ],
    },
    include: {
      issues: {
        include: {
          submission: {
            include: { user: true },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      submissions: {
        include: { user: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      insights: {
        orderBy: { generatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { priority: 'desc' },
    take: limit,
  });
}

/**
 * Update cluster severity and status
 */
export async function updateClusterStatus(
  clusterId: string,
  severity: IssueSeverity,
  status: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED'
): Promise<void> {
  await prisma.issueCluster.update({
    where: { id: clusterId },
    data: { severity, status },
  });
}

/**
 * Generate cluster insights
 */
export async function generateClusterInsight(
  clusterId: string,
  summary: string,
  trends: any,
  recommendations: any,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  await prisma.clusterInsight.create({
    data: {
      clusterId,
      summary,
      trends,
      recommendations,
      periodStart,
      periodEnd,
    },
  });
}

/**
 * Get cluster statistics by administrative area
 */
export async function getClusterStatsByArea(
  areaType: 'kelurahan' | 'kecamatan' | 'kabupaten' | 'provinsi',
  areaName: string,
  timeframe?: { start: Date; end: Date }
) {
  const whereClause = {
    [areaType]: areaName,
    ...(timeframe ? {
      createdAt: {
        gte: timeframe.start,
        lte: timeframe.end,
      },
    } : {}),
  };

  const [
    totalClusters,
    activeClusters,
    resolvedClusters,
    byCategory,
    bySeverity,
    avgPriority
  ] = await Promise.all([
    prisma.issueCluster.count({ where: whereClause }),
    prisma.issueCluster.count({ 
      where: { ...whereClause, status: 'ACTIVE' } 
    }),
    prisma.issueCluster.count({ 
      where: { ...whereClause, status: 'RESOLVED' } 
    }),
    prisma.issueCluster.groupBy({
      by: ['category'],
      where: whereClause,
      _count: { category: true },
      _sum: { issueCount: true },
    }),
    prisma.issueCluster.groupBy({
      by: ['severity'],
      where: whereClause,
      _count: { severity: true },
    }),
    prisma.issueCluster.aggregate({
      _avg: { priority: true },
      where: whereClause,
    }),
  ]);

  return {
    totalClusters,
    activeClusters,
    resolvedClusters,
    byCategory,
    bySeverity,
    avgPriority: avgPriority._avg.priority || 0,
  };
}

/**
 * Find similar clusters for potential merging
 */
export async function findSimilarClusters(
  category: IssueCategory,
  centerLat: number,
  centerLng: number,
  radiusKm: number = 1
): Promise<ClusterWithIssues[]> {
  const clusters = await prisma.issueCluster.findMany({
    where: {
      category,
      status: 'ACTIVE',
    },
    include: {
      issues: {
        include: {
          submission: {
            include: { user: true },
          },
        },
      },
      submissions: {
        include: { user: true },
      },
      insights: true,
    },
  });

  return clusters.filter(cluster => {
    const distance = calculateDistance(
      centerLat, centerLng,
      cluster.centerLat, cluster.centerLng
    );
    return distance <= radiusKm;
  });
}

// Helper functions
function calculateClusterPriority(
  totalWeight: number,
  avgQuality: number,
  issueCount: number
): number {
  // Priority = weighted combination of factors
  const weightFactor = Math.min(totalWeight / 10, 1); // Normalize to 0-1
  const qualityFactor = avgQuality / 12; // Normalize to 0-1
  const countFactor = Math.min(issueCount / 20, 1); // Normalize to 0-1
  
  return Math.round(
    (weightFactor * 0.4 + qualityFactor * 0.3 + countFactor * 0.3) * 100
  );
}

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