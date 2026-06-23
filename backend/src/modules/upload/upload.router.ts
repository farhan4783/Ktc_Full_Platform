import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { getPresignedUrlSchema } from './upload.schema';
import * as uploadController from './upload.controller';

const router = Router();

// Endpoint protected by authentication so only logged-in users can generate upload URLs
router.post(
  '/presigned',
  authenticate,
  validateBody(getPresignedUrlSchema),
  uploadController.getPresignedUrl
);

export default router;
