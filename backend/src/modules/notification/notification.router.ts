import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { createNotificationSchema } from './notification.schema';
import * as notificationController from './notification.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER'),
  auditLog('Notification'),
  validateBody(createNotificationSchema),
  notificationController.createNotification
);

router.get(
  '/my',
  notificationController.getMyNotifications
);

router.patch(
  '/read-all',
  notificationController.markAllAsRead
);

router.patch(
  '/:id/read',
  notificationController.markAsRead
);

export default router;
