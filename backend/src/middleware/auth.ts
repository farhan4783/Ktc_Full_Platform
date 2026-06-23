import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { UserRole } from '@prisma/client';

// ============================================================
// JWT Authentication Middleware
// Per Doc 10: RS256 JWT, payload { userId, role, collegeId }
// Per Doc 09: Access token 15 min, extracted from Authorization header
// ============================================================

export interface JwtPayload {
  userId: string;
  role: UserRole;
  collegeId?: string;
  iat: number;
  exp: number;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authenticate request by verifying JWT access token
 * Token is extracted from Authorization: Bearer <token> header
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Authorization token required', 401, 'UNAUTHORIZED');
    }

    const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');

    if (!publicKey) {
      throw new AppError('JWT configuration error', 500, 'CONFIG_ERROR');
    }

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload;

    // Attach user payload to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Access token expired', 401, 'TOKEN_EXPIRED'));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid access token', 401, 'TOKEN_INVALID'));
      return;
    }

    next(new AppError('Authentication failed', 401, 'AUTH_FAILED'));
  }
}

/**
 * Optional authentication — doesn't fail if no token present
 * Used for public endpoints that optionally show user-specific data
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    if (!publicKey) return next();

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload;

    req.user = decoded;
    next();
  } catch {
    // Silently continue without auth for optional routes
    next();
  }
}
