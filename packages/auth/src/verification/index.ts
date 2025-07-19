export * from './phone';
export * from './ktp';
export * from './selfie';

import { sendOtp, verifyOtp } from './phone';
import { verifyKtp, KtpData } from './ktp';
import { verifySelfie } from './selfie';
import { SocialMediaManager } from '../social';
import { prisma } from '@suara/database';
import { LIMITS } from '@suara/config';

export interface VerificationStep {
  type: 'phone' | 'ktp' | 'selfie' | 'social';
  required: boolean;
  completed: boolean;
  score: number;
  issues?: string[];
}

export interface CompleteVerificationResult {
  success: boolean;
  trustScore: number;
  trustLevel: 'BASIC' | 'VERIFIED' | 'PREMIUM';
  completedSteps: VerificationStep[];
  nextSteps?: VerificationStep[];
  error?: string;
}

export interface UserVerificationData {
  userId: string;
  phone?: string;
  ktpData?: KtpData;
  selfieVerified?: boolean;
  socialAccounts?: string[];
}

/**
 * Main verification orchestrator class
 */
export class VerificationManager {
  private socialManager: SocialMediaManager;

  constructor() {
    this.socialManager = new SocialMediaManager();
  }

  /**
   * Get current verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<{
    currentLevel: 'BASIC' | 'VERIFIED' | 'PREMIUM';
    currentScore: number;
    steps: VerificationStep[];
    canUpgrade: boolean;
    nextRequirements?: string[];
  }> {
    try {
      // Get user's current trust score and verification data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          trustScore: true,
          verifications: true,
          socialAccounts: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const currentScore = user.trustScore?.trustScore || 1.0;
      const currentLevel = user.trustScore?.trustLevel || 'BASIC';

      // Determine completed verification steps
      const steps: VerificationStep[] = [
        {
          type: 'phone',
          required: true,
          completed: user.phoneVerified,
          score: user.phoneVerified ? LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS : 0
        },
        {
          type: 'ktp',
          required: false,
          completed: user.trustScore?.ktpVerified || false,
          score: user.trustScore?.ktpVerified ? LIMITS.TRUST_SCORE.KTP_VERIFICATION_BONUS : 0
        },
        {
          type: 'selfie',
          required: false,
          completed: user.trustScore?.selfieVerified || false,
          score: user.trustScore?.selfieVerified ? LIMITS.TRUST_SCORE.SELFIE_VERIFICATION_BONUS : 0
        },
        {
          type: 'social',
          required: false,
          completed: user.trustScore?.socialVerified || false,
          score: user.trustScore?.socialVerified ? LIMITS.TRUST_SCORE.SOCIAL_VERIFICATION_BONUS : 0
        }
      ];

      // Determine what's needed for next level
      const nextRequirements: string[] = [];
      let canUpgrade = false;

      if (currentLevel === 'BASIC') {
        if (!user.trustScore?.ktpVerified) {
          nextRequirements.push('KTP verification');
        }
        if (!user.trustScore?.selfieVerified) {
          nextRequirements.push('Selfie verification');
        }
        canUpgrade = user.phoneVerified && nextRequirements.length === 0;
      } else if (currentLevel === 'VERIFIED') {
        if (!user.trustScore?.socialVerified) {
          nextRequirements.push('Social media verification');
        }
        if ((user.trustScore?.communityScore || 0) < 0.3) {
          nextRequirements.push('Community endorsements');
        }
        canUpgrade = nextRequirements.length === 0;
      }

      return {
        currentLevel,
        currentScore,
        steps,
        canUpgrade,
        nextRequirements: nextRequirements.length > 0 ? nextRequirements : undefined
      };

    } catch (error) {
      throw new Error(`Failed to get verification status: ${error}`);
    }
  }

  /**
   * Start phone verification process
   */
  async startPhoneVerification(phone: string): Promise<{
    success: boolean;
    sid?: string;
    error?: string;
  }> {
    return sendOtp(phone);
  }

  /**
   * Complete phone verification
   */
  async completePhoneVerification(
    userId: string,
    phone: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const otpResult = await verifyOtp(phone, code);
      
      if (!otpResult.success || !otpResult.valid) {
        return {
          success: false,
          error: otpResult.error || 'Invalid verification code'
        };
      }

      // Update user's phone verification status
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: new Date()
        }
      });

      // Recalculate trust score
      await this.recalculateTrustScore(userId);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Phone verification failed: ${error}`
      };
    }
  }

  /**
   * Start KTP verification process
   */
  async startKtpVerification(
    userId: string,
    ktpImageBuffer: Buffer,
    userProvidedData?: Partial<KtpData>
  ): Promise<{
    success: boolean;
    valid?: boolean;
    extractedData?: KtpData;
    confidence?: number;
    issues?: string[];
    error?: string;
  }> {
    try {
      const ktpResult = await verifyKtp(ktpImageBuffer, userProvidedData);

      if (!ktpResult.success) {
        return {
          success: false,
          error: ktpResult.error
        };
      }

      // Store verification attempt
      const verificationRecord = await prisma.verification.create({
        data: {
          userId,
          type: 'KTP',
          status: ktpResult.valid ? 'APPROVED' : 'REJECTED',
          confidence: ktpResult.confidence,
          extractedData: ktpResult.extractedData ? JSON.stringify(ktpResult.extractedData) : null,
          issues: ktpResult.issues ? JSON.stringify(ktpResult.issues) : null,
          verifiedAt: ktpResult.valid ? new Date() : null
        }
      });

      if (ktpResult.valid && ktpResult.extractedData) {
        // Update user's trust score
        await prisma.userTrustScore.upsert({
          where: { userId },
          create: {
            userId,
            ktpVerified: true,
            trustScore: 1.0 + LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS + LIMITS.TRUST_SCORE.KTP_VERIFICATION_BONUS,
            trustLevel: 'BASIC'
          },
          update: {
            ktpVerified: true
          }
        });

        // Store KTP data securely
        await prisma.userProfile.upsert({
          where: { userId },
          create: {
            userId,
            fullName: ktpResult.extractedData.name,
            nik: ktpResult.extractedData.nik,
            placeOfBirth: ktpResult.extractedData.placeOfBirth,
            dateOfBirth: ktpResult.extractedData.dateOfBirth,
            gender: ktpResult.extractedData.gender,
            address: ktpResult.extractedData.address,
            kelurahan: ktpResult.extractedData.kelurahan,
            kecamatan: ktpResult.extractedData.kecamatan,
            kabupaten: ktpResult.extractedData.kabupaten,
            provinsi: ktpResult.extractedData.provinsi
          },
          update: {
            fullName: ktpResult.extractedData.name,
            nik: ktpResult.extractedData.nik,
            placeOfBirth: ktpResult.extractedData.placeOfBirth,
            dateOfBirth: ktpResult.extractedData.dateOfBirth,
            gender: ktpResult.extractedData.gender,
            address: ktpResult.extractedData.address,
            kelurahan: ktpResult.extractedData.kelurahan,
            kecamatan: ktpResult.extractedData.kecamatan,
            kabupaten: ktpResult.extractedData.kabupaten,
            provinsi: ktpResult.extractedData.provinsi
          }
        });

        // Recalculate trust score
        await this.recalculateTrustScore(userId);
      }

      return {
        success: true,
        valid: ktpResult.valid,
        extractedData: ktpResult.extractedData,
        confidence: ktpResult.confidence,
        issues: ktpResult.issues
      };

    } catch (error) {
      return {
        success: false,
        error: `KTP verification failed: ${error}`
      };
    }
  }

  /**
   * Start selfie verification process
   */
  async startSelfieVerification(
    userId: string,
    selfieBuffer: Buffer,
    additionalImages?: Buffer[]
  ): Promise<{
    success: boolean;
    valid?: boolean;
    qualityScore?: number;
    issues?: string[];
    error?: string;
  }> {
    try {
      // Get user's KTP photo if available for comparison
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          verifications: {
            where: { 
              type: 'KTP',
              status: 'APPROVED'
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      let ktpPhotoBuffer: Buffer | undefined;
      
      // TODO: Extract KTP photo from stored verification data
      // This would require storing the extracted face from KTP during KTP verification

      const selfieResult = await verifySelfie(
        selfieBuffer,
        ktpPhotoBuffer,
        additionalImages
      );

      if (!selfieResult.success) {
        return {
          success: false,
          error: selfieResult.error
        };
      }

      // Store verification attempt
      await prisma.verification.create({
        data: {
          userId,
          type: 'SELFIE',
          status: selfieResult.valid ? 'APPROVED' : 'REJECTED',
          confidence: selfieResult.qualityScore,
          issues: selfieResult.issues ? JSON.stringify(selfieResult.issues) : null,
          verifiedAt: selfieResult.valid ? new Date() : null
        }
      });

      if (selfieResult.valid) {
        // Update user's trust score
        await prisma.userTrustScore.upsert({
          where: { userId },
          create: {
            userId,
            selfieVerified: true,
            trustScore: 1.0 + LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS + LIMITS.TRUST_SCORE.SELFIE_VERIFICATION_BONUS,
            trustLevel: 'BASIC'
          },
          update: {
            selfieVerified: true
          }
        });

        // Recalculate trust score
        await this.recalculateTrustScore(userId);
      }

      return {
        success: true,
        valid: selfieResult.valid,
        qualityScore: selfieResult.qualityScore,
        issues: selfieResult.issues
      };

    } catch (error) {
      return {
        success: false,
        error: `Selfie verification failed: ${error}`
      };
    }
  }

  /**
   * Start social media verification process
   */
  async startSocialVerification(
    userId: string,
    platform: string,
    accessToken: string
  ): Promise<{
    success: boolean;
    valid?: boolean;
    trustScore?: number;
    issues?: string[];
    error?: string;
  }> {
    try {
      const socialResult = await this.socialManager.verifyAccount(platform, accessToken, userId);

      if (!socialResult.success) {
        return {
          success: false,
          error: socialResult.error
        };
      }

      // Store social account verification
      await prisma.socialAccount.create({
        data: {
          userId,
          platform: platform.toUpperCase(),
          platformUserId: socialResult.profile?.id || '',
          username: socialResult.profile?.username,
          displayName: socialResult.profile?.name,
          verified: socialResult.valid || false,
          trustScore: socialResult.trustScore?.score || 0,
          verifiedAt: socialResult.valid ? new Date() : null,
          profileData: socialResult.profile ? JSON.stringify(socialResult.profile) : null
        }
      });

      if (socialResult.valid) {
        // Update user's trust score
        await prisma.userTrustScore.upsert({
          where: { userId },
          create: {
            userId,
            socialVerified: true,
            trustScore: 1.0 + LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS + LIMITS.TRUST_SCORE.SOCIAL_VERIFICATION_BONUS,
            trustLevel: 'BASIC'
          },
          update: {
            socialVerified: true
          }
        });

        // Recalculate trust score
        await this.recalculateTrustScore(userId);
      }

      return {
        success: true,
        valid: socialResult.valid,
        trustScore: socialResult.trustScore?.score,
        issues: socialResult.issues
      };

    } catch (error) {
      return {
        success: false,
        error: `Social verification failed: ${error}`
      };
    }
  }

  /**
   * Get social auth URL for platform
   */
  getSocialAuthUrl(platform: string, state?: string): string {
    const provider = this.socialManager.getProvider(platform);
    if (!provider) {
      throw new Error(`Unsupported social platform: ${platform}`);
    }
    return provider.getAuthUrl(state);
  }

  /**
   * Exchange social auth code for access token
   */
  async exchangeSocialCode(platform: string, code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
  }> {
    const provider = this.socialManager.getProvider(platform);
    if (!provider) {
      throw new Error(`Unsupported social platform: ${platform}`);
    }
    return provider.exchangeCodeForToken(code);
  }

  /**
   * Recalculate user's trust score based on all verification factors
   */
  async recalculateTrustScore(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          trustScore: true,
          submissions: {
            include: {
              issue: {
                include: {
                  responses: true
                }
              }
            }
          },
          socialAccounts: true,
          endorsements: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      let totalScore = LIMITS.TRUST_SCORE.MIN; // Base score: 1.0
      const factors = {
        phoneVerification: 0,
        ktpVerification: 0,
        selfieVerification: 0,
        socialVerification: 0,
        communityEndorsements: 0,
        historicalAccuracy: 0,
        submissionHistory: 0
      };

      // Phone verification bonus
      if (user.phoneVerified) {
        factors.phoneVerification = LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS;
        totalScore += factors.phoneVerification;
      }

      // KTP verification bonus
      if (user.trustScore?.ktpVerified) {
        factors.ktpVerification = LIMITS.TRUST_SCORE.KTP_VERIFICATION_BONUS;
        totalScore += factors.ktpVerification;
      }

      // Selfie verification bonus
      if (user.trustScore?.selfieVerified) {
        factors.selfieVerification = LIMITS.TRUST_SCORE.SELFIE_VERIFICATION_BONUS;
        totalScore += factors.selfieVerification;
      }

      // Social verification bonus
      if (user.trustScore?.socialVerified) {
        factors.socialVerification = LIMITS.TRUST_SCORE.SOCIAL_VERIFICATION_BONUS;
        totalScore += factors.socialVerification;
      }

      // Community endorsements
      const endorsementCount = user.endorsements?.length || 0;
      factors.communityEndorsements = Math.min(
        endorsementCount * LIMITS.TRUST_SCORE.COMMUNITY_ENDORSEMENT_BONUS,
        0.5 // Maximum 0.5 points from endorsements
      );
      totalScore += factors.communityEndorsements;

      // Historical accuracy
      if (user.submissions && user.submissions.length > 0) {
        const resolvedSubmissions = user.submissions.filter(s => 
          s.issue?.status === 'RESOLVED' || (s.issue?.responses && s.issue.responses.length > 0)
        );

        if (resolvedSubmissions.length > 0) {
          const accuracySum = resolvedSubmissions.reduce((sum, submission) => {
            const wasAcknowledged = submission.issue?.status !== 'REJECTED';
            return sum + (wasAcknowledged ? 1 : 0);
          }, 0);

          const accuracyRatio = accuracySum / resolvedSubmissions.length;
          const confidenceMultiplier = Math.min(resolvedSubmissions.length / 5, 1.0);
          factors.historicalAccuracy = accuracyRatio * confidenceMultiplier * LIMITS.TRUST_SCORE.ACCURACY_BONUS_MAX;
          totalScore += factors.historicalAccuracy;
        }
      }

      // Submission history bonus
      const submissionCount = user.submissions?.length || 0;
      if (submissionCount > 5) {
        const bonus = Math.log(submissionCount / 5) * 0.1;
        factors.submissionHistory = Math.min(bonus, LIMITS.TRUST_SCORE.SUBMISSION_HISTORY_MAX);
        totalScore += factors.submissionHistory;
      }

      // Calculate final score and trust level
      const finalScore = Math.min(totalScore, LIMITS.TRUST_SCORE.MAX);
      let trustLevel: 'BASIC' | 'VERIFIED' | 'PREMIUM' = 'BASIC';

      if (finalScore >= LIMITS.TRUST_SCORE.PREMIUM_THRESHOLD) {
        trustLevel = 'PREMIUM';
      } else if (finalScore >= LIMITS.TRUST_SCORE.VERIFIED_THRESHOLD) {
        trustLevel = 'VERIFIED';
      }

      // Update trust score in database
      await prisma.userTrustScore.upsert({
        where: { userId },
        create: {
          userId,
          trustScore: finalScore,
          trustLevel,
          phoneVerified: user.phoneVerified,
          ktpVerified: user.trustScore?.ktpVerified || false,
          selfieVerified: user.trustScore?.selfieVerified || false,
          socialVerified: user.trustScore?.socialVerified || false,
          submissionCount: submissionCount,
          accuracyScore: factors.historicalAccuracy,
          communityScore: factors.communityEndorsements,
          lastCalculated: new Date()
        },
        update: {
          trustScore: finalScore,
          trustLevel,
          phoneVerified: user.phoneVerified,
          submissionCount: submissionCount,
          accuracyScore: factors.historicalAccuracy,
          communityScore: factors.communityEndorsements,
          lastCalculated: new Date()
        }
      });

    } catch (error) {
      console.error('Failed to recalculate trust score:', error);
      throw error;
    }
  }

  /**
   * Get complete verification result for user
   */
  async getCompleteVerificationResult(userId: string): Promise<CompleteVerificationResult> {
    try {
      const status = await this.getVerificationStatus(userId);
      
      const completedSteps = status.steps.filter(step => step.completed);
      const nextSteps = status.steps.filter(step => !step.completed && !step.required);

      return {
        success: true,
        trustScore: status.currentScore,
        trustLevel: status.currentLevel,
        completedSteps,
        nextSteps: nextSteps.length > 0 ? nextSteps : undefined
      };

    } catch (error) {
      return {
        success: false,
        trustScore: 1.0,
        trustLevel: 'BASIC',
        completedSteps: [],
        error: `Failed to get verification result: ${error}`
      };
    }
  }
}