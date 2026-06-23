import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from './errorHandler';

// ============================================================
// Role-Based Access Control Middleware
// Per Doc 10: SUPER_ADMIN > COLLEGE_ADMIN > TRAINER > STUDENT
// ============================================================

/**
 * Require specific roles to access a route
 * Usage: requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN')
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          'You do not have permission to perform this action',
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
      return;
    }

    next();
  };
}

/**
 * Require user to be at least a specific role level
 * Hierarchy: SUPER_ADMIN > COLLEGE_ADMIN > TRAINER > STUDENT
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 4,
  COLLEGE_ADMIN: 3,
  TRAINER: 2,
  STUDENT: 1,
};

export function requireMinRole(minRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
      return;
    }

    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY[minRole]) {
      next(
        new AppError(
          'You do not have permission to perform this action',
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
      return;
    }

    next();
  };
}

/**
 * Ensure college admin can only access their own college's data
 */
export function requireCollegeScope(collegeIdParam: string = 'collegeId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
      return;
    }

    // Super admin can access everything
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // College admin must match their college
    if (req.user.role === 'COLLEGE_ADMIN') {
      const requestedCollegeId =
        req.params[collegeIdParam] || req.body[collegeIdParam] || req.query[collegeIdParam];

      if (requestedCollegeId && requestedCollegeId !== req.user.collegeId) {
        next(
          new AppError(
            'You can only access data for your own college',
            403,
            'COLLEGE_SCOPE_VIOLATION'
          )
        );
        return;
      }
    }

    next();
  };
}
