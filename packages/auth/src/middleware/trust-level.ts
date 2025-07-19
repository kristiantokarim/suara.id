import { Request, Response, NextFunction } from 'express';
import { hasRequiredTrustLevel } from '../providers/session';
import type { TrustLevel } from '@suara/database';

/**
 * Trust level middleware factory
 * Creates middleware that requires a minimum trust level
 */
export function requireTrustLevel(requiredLevel: TrustLevel) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!hasRequiredTrustLevel(req.user.trustLevel, requiredLevel)) {
      res.status(403).json({
        error: `${requiredLevel} trust level required`,
        code: 'INSUFFICIENT_TRUST_LEVEL',
        details: {
          current: req.user.trustLevel,
          required: requiredLevel,
          upgradeSteps: getUpgradeSteps(req.user.trustLevel, requiredLevel)
        }
      });
      return;
    }

    next();
  };
}

/**
 * Get steps needed to upgrade trust level
 */
function getUpgradeSteps(current: TrustLevel, target: TrustLevel): string[] {
  const steps: string[] = [];

  if (current === 'BASIC' && (target === 'VERIFIED' || target === 'PREMIUM')) {
    steps.push('Complete KTP verification');
    steps.push('Complete selfie verification');
  }

  if ((current === 'BASIC' || current === 'VERIFIED') && target === 'PREMIUM') {
    steps.push('Complete social media verification');
    steps.push('Obtain community endorsements');
    steps.push('Maintain good submission accuracy');
  }

  return steps;
}

/**
 * Verified user middleware (VERIFIED or PREMIUM)
 */
export const requireVerified = requireTrustLevel('VERIFIED');

/**
 * Premium user middleware (PREMIUM only)
 */
export const requirePremium = requireTrustLevel('PREMIUM');

/**
 * Rate limiting based on trust level
 */
export function trustBasedRateLimit() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Apply strictest limits for unauthenticated users
      res.locals.rateLimit = {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000 // 1 hour
      };
    } else {
      // Adjust limits based on trust level
      switch (req.user.trustLevel) {
        case 'BASIC':
          res.locals.rateLimit = {
            maxRequests: 50,
            windowMs: 60 * 60 * 1000 // 1 hour
          };
          break;
        case 'VERIFIED':
          res.locals.rateLimit = {
            maxRequests: 200,
            windowMs: 60 * 60 * 1000 // 1 hour
          };
          break;
        case 'PREMIUM':
          res.locals.rateLimit = {
            maxRequests: 500,
            windowMs: 60 * 60 * 1000 // 1 hour
          };
          break;
      }
    }

    next();
  };
}

/**
 * Submission limits based on trust level
 */
export function checkSubmissionLimits() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required for submissions',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Set daily submission limits based on trust level
    let dailyLimit: number;
    
    switch (req.user.trustLevel) {
      case 'BASIC':
        dailyLimit = 3;
        break;
      case 'VERIFIED':
        dailyLimit = 10;
        break;
      case 'PREMIUM':
        dailyLimit = 20;
        break;
      default:
        dailyLimit = 1;
    }

    res.locals.submissionLimit = {
      daily: dailyLimit,
      trustLevel: req.user.trustLevel
    };

    next();
  };
}