import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { createCollegeSchema, updateCollegeSchema } from './college.schema';
import * as collegeController from './college.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  requireRole('SUPER_ADMIN'),
  auditLog('College'),
  validateBody(createCollegeSchema),
  collegeController.createCollege
);

router.get(
  '/',
  requireRole('SUPER_ADMIN'),
  collegeController.getColleges
);

router.get(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  collegeController.getCollege
);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('College'),
  validateBody(updateCollegeSchema),
  collegeController.updateCollege
);

router.delete(
  '/:id',
  requireRole('SUPER_ADMIN'),
  auditLog('College'),
  collegeController.deleteCollege
);

router.get(
  '/:id/analytics',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  collegeController.getAnalytics
);

export default router;
