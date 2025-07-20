import { prisma } from '../client';
import { LIMITS, type Result, success, failure } from '@suara/config';
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
 * Calculates trust score based on verification factors
 */
function calculateTrustScore(updates: TrustScoreUpdateInput): {
  score: number;
  level: TrustLevel;
} {
  let score = LIMITS.TRUST_SCORE.DEFAULT;

  // Verification bonuses using constants
  if (updates.phoneVerified) {
    score += LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS;
  }
  if (updates.ktpVerified) {
    score += LIMITS.TRUST_SCORE.KTP_VERIFICATION_BONUS;
  }
  if (updates.selfieVerified) {
    score += LIMITS.TRUST_SCORE.SELFIE_VERIFICATION_BONUS;
  }
  if (updates.socialVerified) {
    score += LIMITS.TRUST_SCORE.SOCIAL_VERIFICATION_BONUS;
  }
  
  // Historical accuracy bonus
  if (updates.accuracyScore) {
    score += updates.accuracyScore * LIMITS.TRUST_SCORE.ACCURACY_BONUS_MAX;
  }
  
  // Submission history bonus (experience points)
  if (updates.submissionCount && updates.submissionCount > 5) {
    score += Math.min(
      LIMITS.TRUST_SCORE.SUBMISSION_HISTORY_MAX,
      updates.submissionCount * 0.01
    );
  }

  // Cap score at maximum
  const finalScore = Math.min(LIMITS.TRUST_SCORE.MAX, score);

  // Determine trust level using constants
  let level: TrustLevel = 'BASIC';
  if (finalScore >= LIMITS.TRUST_SCORE.PREMIUM_THRESHOLD) {
    level = 'PREMIUM';
  } else if (finalScore >= LIMITS.TRUST_SCORE.VERIFIED_THRESHOLD) {
    level = 'VERIFIED';
  }

  return { score: finalScore, level };
}

/**
 * Update user trust score using Result pattern
 */
export async function updateTrustScore(
  userId: string, 
  updates: TrustScoreUpdateInput
): Promise<Result<{ score: number; level: TrustLevel }>> {
  try {
    // Input validation
    if (!userId) {
      return failure('User ID is required');
    }

    // Check if trust score exists
    const existingTrustScore = await prisma.userTrustScore.findUnique({
      where: { userId },
    });

    if (!existingTrustScore) {
      return failure('Trust score record not found for user');
    }

    // Calculate new trust score
    const { score, level } = calculateTrustScore(updates);

    // Update in database
    await prisma.userTrustScore.update({
      where: { userId },
      data: {
        ...updates,
        trustScore: score,
        trustLevel: level,
        lastCalculated: new Date(),
      },
    });

    return success({ score, level });

  } catch (error) {
    return failure(
      'Failed to update trust score',
      [error instanceof Error ? error.message : 'Unknown database error']
    );
  }
}

/**
 * Verify user phone number using Result pattern
 */
export async function verifyUserPhone(userId: string): Promise<Result<void>> {
  try {
    if (!userId) {
      return failure('User ID is required');
    }

    // Update user phone verification status
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
    });

    // Update trust score
    const trustScoreResult = await updateTrustScore(userId, { phoneVerified: true });
    if (!trustScoreResult.success) {
      return failure(
        'Phone verified but trust score update failed',
        trustScoreResult.issues
      );
    }

    return success(undefined);

  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return failure('User not found');
    }
    
    return failure(
      'Failed to verify phone number',
      [error instanceof Error ? error.message : 'Unknown database error']
    );
  }
}

/**
 * Get users by trust level with proper pagination
 */
export async function getUsersByTrustLevel(
  trustLevel: TrustLevel,
  limit: number = LIMITS.PAGINATION.DEFAULT_PAGE_SIZE
): Promise<Result<UserWithTrustScore[]>> {
  try {
    // Validate pagination limits
    const validLimit = Math.min(
      Math.max(limit, LIMITS.PAGINATION.MIN_PAGE_SIZE),
      LIMITS.PAGINATION.MAX_PAGE_SIZE
    );

    const users = await prisma.user.findMany({
      where: {
        trustScore: {
          trustLevel,
        },
      },
      include: {
        trustScore: true,
      },
      take: validLimit,
      orderBy: {
        trustScore: {
          trustScore: 'desc',
        },
      },
    });

    return success(users);

  } catch (error) {
    return failure(
      'Failed to fetch users by trust level',
      [error instanceof Error ? error.message : 'Unknown database error']
    );
  }
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