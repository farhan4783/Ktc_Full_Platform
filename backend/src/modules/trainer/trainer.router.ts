import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { updateTrainerProfileSchema } from './trainer.schema';
import * as trainerController from './trainer.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  trainerController.getTrainers
);

router.get(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  trainerController.getTrainer
);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER'),
  auditLog('Trainer'),
  validateBody(updateTrainerProfileSchema),
  trainerController.updateTrainer
);

export default router;
