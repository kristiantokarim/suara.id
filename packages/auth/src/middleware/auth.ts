import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../providers/jwt';
import { prisma } from '@suara/database';
import { createSessionUser, SessionUser } from '../providers/session';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and loads user session
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Verify JWT token
    const payload = verifyJWT(token);
    if (!payload || !payload.userId) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        trustScore: true
      }
    });

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Create session user object
    req.user = createSessionUser(user);
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Optional authentication middleware
 * Loads user if token is provided, but doesn't require it
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = verifyJWT(token);
      if (payload && payload.userId) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: {
            trustScore: true
          }
        });

        if (user) {
          req.user = createSessionUser(user);
        }
      }
    } catch (error) {
      // Invalid token, but continue without user
      console.warn('Optional auth failed:', error);
    }

    next();

  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue even if there's an error
  }
}

/**
 * Phone verification required middleware
 */
export function requirePhoneVerification(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  if (!req.user.phoneVerified) {
    res.status(403).json({
      error: 'Phone verification required',
      code: 'PHONE_VERIFICATION_REQUIRED',
      details: {
        currentStep: 'phone_verification',
        required: true
      }
    });
    return;
  }

  next();
}