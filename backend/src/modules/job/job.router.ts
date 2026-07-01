import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { createJobSchema, updateJobSchema, trackInterestSchema } from './job.schema';
import * as jobController from './job.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('JobOpportunity'),
  validateBody(createJobSchema),
  jobController.createJob
);

router.get(
  '/',
  jobController.getJobs
);

router.get(
  '/my-interests',
  requireRole('STUDENT'),
  jobController.getMyInterests
);

router.get(
  '/:id',
  jobController.getJob
);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('JobOpportunity'),
  validateBody(updateJobSchema),
  jobController.updateJob
);

router.delete(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('JobOpportunity'),
  jobController.deleteJob
);

router.post(
  '/:id/interest',
  requireRole('STUDENT'),
  validateBody(trackInterestSchema),
  jobController.trackInterest
);

router.patch(
  '/:id/interests/:studentId',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'RECRUITER'),
  validateBody(trackInterestSchema),
  jobController.updateInterestStatus
);

export default router;
