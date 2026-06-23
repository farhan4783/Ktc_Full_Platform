import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import {
  createPlacementSchema,
  updatePlacementSchema,
  verifyPlacementSchema,
  createDocumentSchema,
} from './placement.schema';
import * as placementController from './placement.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Placement Records
router.post(
  '/',
  auditLog('PlacementRecord'),
  validateBody(createPlacementSchema),
  placementController.createPlacementRecord
);

router.get(
  '/',
  placementController.getPlacementRecords
);

router.get(
  '/:id',
  placementController.getPlacementRecord
);

router.patch(
  '/:id',
  auditLog('PlacementRecord'),
  validateBody(updatePlacementSchema),
  placementController.updatePlacementRecord
);

router.delete(
  '/:id',
  auditLog('PlacementRecord'),
  placementController.deletePlacementRecord
);

router.post(
  '/:id/verify',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'),
  auditLog('PlacementRecord'),
  validateBody(verifyPlacementSchema),
  placementController.verifyPlacementRecord
);

// Student Documents
router.post(
  '/documents',
  auditLog('StudentDocument'),
  validateBody(createDocumentSchema),
  placementController.createStudentDocument
);

router.get(
  '/documents/student/:studentId',
  placementController.getStudentDocuments
);

router.delete(
  '/documents/:id',
  auditLog('StudentDocument'),
  placementController.deleteStudentDocument
);

export default router;
