import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { updateStudentProfileSchema, importStudentsSchema, evaluateMockInterviewSchema } from './student.schema';
import * as studentController from './student.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER'),
  studentController.getStudents
);

router.get(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  studentController.getStudent
);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT'),
  auditLog('Student'),
  validateBody(updateStudentProfileSchema),
  studentController.updateStudent
);

router.post(
  '/:id/progress',
  requireRole('STUDENT'),
  studentController.saveLessonProgress
);

router.post(
  '/import',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('Student'),
  validateBody(importStudentsSchema),
  studentController.importStudents
);

router.post(
  '/:id/mock-interview',
  requireRole('STUDENT'),
  validateBody(evaluateMockInterviewSchema),
  studentController.evaluateStudentMockInterview
);

export default router;
