import { prisma } from '../client';
import type { 
  User, 
  UserWithTrustScore, 
  TrustLevel,
  TrustScoreUpdateInput 
} from '../types';

/**
 * Get user by ID with trust score
 */
export async function getUserById(id: string): Promise<UserWithTrustScore | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      trustScore: true,
    },
  });
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phone: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { phone },
  });
}

/**
 * Create new user with basic trust score
 */
export async function createUser(data: {
  phone: string;
  name?: string;
  language?: string;
}): Promise<UserWithTrustScore> {
  return prisma.user.create({
    data: {
      ...data,
      trustScore: {
        create: {
          trustScore: 1.0,
          trustLevel: 'BASIC',
          phoneVerified: false,
        },
      },
    },
    include: {
      trustScore: true,
    },
  });
}

/**
 * Update user trust score
 */
export async function updateTrustScore(
  userId: string, 
  updates: TrustScoreUpdateInput
): Promise<void> {
  const trustScore = await prisma.userTrustScore.findUnique({
    where: { userId },
  });

  if (!trustScore) {
    throw new Error('Trust score not found');
  }

  // Calculate new trust score
  let newScore = 1.0; // Base score
  let newLevel: TrustLevel = 'BASIC';

  if (updates.phoneVerified) newScore += 0.5;
  if (updates.ktpVerified) newScore += 1.5;
  if (updates.selfieVerified) newScore += 0.5;
  if (updates.socialVerified) newScore += 1.0;
  
  // Add historical factors
  if (updates.accuracyScore) newScore += updates.accuracyScore * 0.5;
  if (updates.submissionCount && updates.submissionCount > 5) {
    newScore += Math.min(0.3, updates.submissionCount * 0.05);
  }

  // Determine trust level
  if (newScore >= 4.1) newLevel = 'PREMIUM';
  else if (newScore >= 2.1) newLevel = 'VERIFIED';

  await prisma.userTrustScore.update({
    where: { userId },
    data: {
      ...updates,
      trustScore: Math.min(5.0, newScore),
      trustLevel: newLevel,
      lastCalculated: new Date(),
    },
  });
}

/**
 * Verify user phone number
 */
export async function verifyUserPhone(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    },
  });

  await updateTrustScore(userId, { phoneVerified: true });
}

/**
 * Get users by trust level
 */
export async function getUsersByTrustLevel(
  trustLevel: TrustLevel,
  limit: number = 50
): Promise<UserWithTrustScore[]> {
  return prisma.user.findMany({
    where: {
      trustScore: {
        trustLevel,
      },
    },
    include: {
      trustScore: true,
    },
    take: limit,
    orderBy: {
      trustScore: {
        trustScore: 'desc',
      },
    },
  });
}

/**
 * Get user submission statistics
 */
export async function getUserStats(userId: string) {
  const [submissionCount, verifications, endorsements] = await Promise.all([
    prisma.submission.count({
      where: { userId },
    }),
    prisma.verification.findMany({
      where: { userId },
      select: { type: true, status: true },
    }),
    prisma.communityEndorsement.count({
      where: { endorsedUserId: userId },
    }),
  ]);

  return {
    submissionCount,
    verifications,
    endorsementCount: endorsements,
  };
}