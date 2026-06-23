import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import {
  createCourseSchema,
  updateCourseSchema,
  publishCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
} from './course.schema';
import * as courseController from './course.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// Require login for all routes
router.use(authenticate);

// =================== COURSE ROUTES ===================
router.post(
  '/',
  requireRole('SUPER_ADMIN'),
  auditLog('Course'),
  validateBody(createCourseSchema),
  courseController.createCourse
);

router.get(
  '/',
  courseController.getCourses
);

router.get(
  '/:id',
  courseController.getCourse
);

router.put(
  '/:id',
  requireRole('SUPER_ADMIN'),
  auditLog('Course'),
  validateBody(updateCourseSchema),
  courseController.updateCourse
);

router.post(
  '/:id/publish',
  requireRole('SUPER_ADMIN'),
  auditLog('Course'),
  validateBody(publishCourseSchema),
  courseController.publishCourse
);

router.delete(
  '/:id',
  requireRole('SUPER_ADMIN'),
  auditLog('Course'),
  courseController.deleteCourse
);

// =================== MODULE ROUTES ===================
router.post(
  '/:courseId/modules',
  requireRole('SUPER_ADMIN'),
  auditLog('Module'),
  validateBody(createModuleSchema),
  courseController.createModule
);

router.patch(
  '/modules/:moduleId',
  requireRole('SUPER_ADMIN'),
  auditLog('Module'),
  validateBody(updateModuleSchema),
  courseController.updateModule
);

router.delete(
  '/modules/:moduleId',
  requireRole('SUPER_ADMIN'),
  auditLog('Module'),
  courseController.deleteModule
);

// =================== LESSON ROUTES ===================
router.post(
  '/modules/:moduleId/lessons',
  requireRole('SUPER_ADMIN'),
  auditLog('Lesson'),
  validateBody(createLessonSchema),
  courseController.createLesson
);

router.patch(
  '/lessons/:lessonId',
  requireRole('SUPER_ADMIN'),
  auditLog('Lesson'),
  validateBody(updateLessonSchema),
  courseController.updateLesson
);

router.delete(
  '/lessons/:lessonId',
  requireRole('SUPER_ADMIN'),
  auditLog('Lesson'),
  courseController.deleteLesson
);

export default router;
