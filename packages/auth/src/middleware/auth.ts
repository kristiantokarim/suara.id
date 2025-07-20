import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../providers/jwt';
import { createSessionUser, SessionUser } from '../providers/session';
import type { Result } from '@suara/config';

// Database client interface for dependency injection
export interface DatabaseClient {
  user: {
    findUnique: (args: any) => Promise<any>;
  };
}

// JWT provider interface for dependency injection
export interface JwtProvider {
  verify: (token: string) => any;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/**
 * Creates an authentication middleware with dependency injection
 * 
 * @param database - Database client for user lookup
 * @param jwtProvider - JWT verification provider
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * import { prisma } from '@suara/database';
 * 
 * const authMiddleware = createAuthMiddleware(prisma, { verify: verifyJWT });
 * app.use('/protected', authMiddleware);
 * ```
 */
export function createAuthMiddleware(
  database: DatabaseClient,
  jwtProvider: JwtProvider
) {
  return async function authenticate(
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
      
      // Verify JWT token using injected provider
      const payload = jwtProvider.verify(token);
      if (!payload || !payload.userId) {
        res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        return;
      }

      // Load user from database using injected client
      const user = await database.user.findUnique({
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

      // Create session user
      req.user = createSessionUser(user);
      next();

    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  };
}

/**
 * Legacy authentication middleware (for backward compatibility)
 * Uses hard dependencies - will be deprecated
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Import here to avoid circular dependencies
  const { prisma } = await import('@suara/database');
  
  const middleware = createAuthMiddleware(prisma, { verify: verifyJWT });
  return middleware(req, res, next);
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