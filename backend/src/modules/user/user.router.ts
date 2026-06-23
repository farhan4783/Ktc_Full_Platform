import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { updateProfileSchema, registerFcmTokenSchema } from './user.schema';
import * as userController from './user.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);

router.patch(
  '/profile',
  auditLog('User'),
  validateBody(updateProfileSchema),
  userController.updateProfile
);

router.post(
  '/fcm-token',
  validateBody(registerFcmTokenSchema),
  userController.registerFcm
);

export default router;
