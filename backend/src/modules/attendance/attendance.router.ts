import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { createSessionSchema, markAttendanceSchema } from './attendance.schema';
import * as attendanceController from './attendance.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// Require login for all routes
router.use(authenticate);

router.post(
  '/sessions',
  requireRole('SUPER_ADMIN', 'TRAINER'),
  auditLog('ClassSession'),
  validateBody(createSessionSchema),
  attendanceController.createSession
);

router.post(
  '/sessions/:sessionId/mark',
  requireRole('SUPER_ADMIN', 'TRAINER'),
  auditLog('ClassSession'),
  validateBody(markAttendanceSchema),
  attendanceController.markAttendance
);

router.get(
  '/batches/:batchId',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  attendanceController.getBatchGrid
);

export default router;
