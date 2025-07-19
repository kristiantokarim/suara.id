import jwt from 'jsonwebtoken';
import { authConfig } from '@suara/config';
import type { User, TrustLevel } from '@suara/database';

export interface JwtPayload {
  userId: string;
  phone: string;
  trustLevel: TrustLevel;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: {
  id: string;
  phone: string;
  trustLevel: TrustLevel;
}): string {
  const payload = {
    userId: user.id,
    phone: user.phone,
    trustLevel: user.trustLevel,
  };

  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn,
    issuer: 'suara.id',
    audience: 'suara.id-users',
  });
}

/**
 * Generate refresh token (longer expiry)
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    authConfig.jwtSecret,
    {
      expiresIn: '30d',
      issuer: 'suara.id',
      audience: 'suara.id-users',
    }
  );
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(user: {
  id: string;
  phone: string;
  trustLevel: TrustLevel;
}): TokenPair {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    expiresIn: authConfig.jwtExpiresIn,
  };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret, {
      issuer: 'suara.id',
      audience: 'suara.id-users',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Check if token is expired (without throwing)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded || !decoded.exp) return true;
    
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Get token expiry date
 */
export function getTokenExpiry(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  getUserById: (id: string) => Promise<User & { trustScore: { trustLevel: TrustLevel } } | null>
): Promise<string> {
  try {
    const decoded = jwt.verify(refreshToken, authConfig.jwtSecret) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return generateAccessToken({
      id: user.id,
      phone: user.phone,
      trustLevel: user.trustScore.trustLevel,
    });
  } catch (error) {
    throw new Error('Failed to refresh token');
  }
}