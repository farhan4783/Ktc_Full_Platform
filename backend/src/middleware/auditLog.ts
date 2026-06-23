import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// ============================================================
// Audit Log Middleware
// Per Doc 09: All write operations auto-logged in audit_logs
// Captures: who, what, when, old/new values, IP
// ============================================================

/**
 * Middleware to auto-log write operations to the audit_logs table
 * Applied to POST, PUT, PATCH, DELETE routes
 */
export function auditLog(entityType: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only audit write operations
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!writeMethods.includes(req.method)) {
      return next();
    }

    // Capture original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Log async — don't block the response
      setImmediate(async () => {
        try {
          const action = `${req.method} ${req.originalUrl}`;
          const entityId = req.params.id || (body as any)?.data?.id || null;

          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId || null,
              action,
              entityType,
              entityId: entityId ? String(entityId) : null,
              newValues: req.method !== 'DELETE' ? (req.body || null) : null,
              ipAddress: req.ip || req.socket.remoteAddress || null,
              userAgent: req.headers['user-agent'] || null,
            },
          });
        } catch (error) {
          // Never let audit logging failure affect the response
          logger.error('Audit log failed:', error);
        }
      });

      return originalJson(body);
    } as typeof res.json;

    next();
  };
}
