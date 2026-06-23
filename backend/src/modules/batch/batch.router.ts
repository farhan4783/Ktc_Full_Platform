import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { createBatchSchema, updateBatchSchema, enrollStudentsSchema } from './batch.schema';
import * as batchController from './batch.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// Require login for all routes
router.use(authenticate);

router.post(
  '/',
  requireRole('SUPER_ADMIN'),
  auditLog('Batch'),
  validateBody(createBatchSchema),
  batchController.createBatch
);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  batchController.getBatches
);

router.get(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  batchController.getBatch
);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN'),
  auditLog('Batch'),
  validateBody(updateBatchSchema),
  batchController.updateBatch
);

router.post(
  '/:id/enroll',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('Batch'),
  validateBody(enrollStudentsSchema),
  batchController.enrollStudents
);

router.delete(
  '/:id/enroll/:studentId',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('Batch'),
  batchController.unenrollStudent
);

export default router;
