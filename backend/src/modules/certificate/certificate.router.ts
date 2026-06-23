import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { generateCertificateSchema } from './certificate.schema';
import * as certificateController from './certificate.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// Public route for verifying certificate
router.get(
  '/verify/:code',
  certificateController.verifyCertificate
);

// All other routes require authentication
router.use(authenticate);

router.get(
  '/eligibility',
  certificateController.checkEligibility
);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER'),
  auditLog('Certificate'),
  validateBody(generateCertificateSchema),
  certificateController.generateCertificate
);

router.get(
  '/student/:studentId',
  certificateController.getStudentCertificates
);

export default router;
