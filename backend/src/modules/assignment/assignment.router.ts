import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { createAssignmentSchema, submitAssignmentSchema, gradeSubmissionSchema } from './assignment.schema';
import * as assignmentController from './assignment.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// Require login for all routes
router.use(authenticate);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'TRAINER'),
  auditLog('Assignment'),
  validateBody(createAssignmentSchema),
  assignmentController.createAssignment
);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  assignmentController.getAssignments
);

router.get(
  '/submissions',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER'),
  assignmentController.getSubmissions
);

router.post(
  '/:id/submit',
  requireRole('STUDENT'),
  auditLog('AssignmentSubmission'),
  validateBody(submitAssignmentSchema),
  assignmentController.submitAssignment
);

router.post(
  '/submissions/:subId/grade',
  requireRole('SUPER_ADMIN', 'TRAINER'),
  auditLog('AssignmentSubmission'),
  validateBody(gradeSubmissionSchema),
  assignmentController.gradeSubmission
);


export default router;
