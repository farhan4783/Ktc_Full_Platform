import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { auditLog } from '../../middleware/auditLog';
import {
  registerRecruiterSchema,
  updateRecruiterProfileSchema,
  updateJobInterestStatusSchema
} from './recruiter.schema';
import * as recruiterController from './recruiter.controller';
import * as recruiterService from './recruiter.service';
import { sendSuccess } from '../../utils/response';

const router = Router();

// Public route for Recruiter Registration
router.post(
  '/register',
  validateBody(registerRecruiterSchema),
  recruiterController.registerRecruiter
);

// Authenticated routes
router.use(authenticate);

// Profile management
router.get('/profile', requireRole('RECRUITER'), recruiterController.getProfile);
router.patch(
  '/profile',
  requireRole('RECRUITER'),
  validateBody(updateRecruiterProfileSchema),
  recruiterController.updateProfile
);

// Student searches and filters (Approved Recruiters, Admins, or Trainers)
router.get(
  '/students',
  requireRole('RECRUITER', 'SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER'),
  recruiterController.getStudents
);

// Bulk resume ZIP download
router.post(
  '/students/bulk-resume',
  requireRole('RECRUITER', 'SUPER_ADMIN', 'COLLEGE_ADMIN'),
  recruiterController.bulkDownloadResumes
);

// Job applicant status tracking (Only recruiters or admins)
router.get(
  '/jobs/:jobId/interests',
  requireRole('RECRUITER', 'SUPER_ADMIN'),
  recruiterController.getJobInterests
);

router.patch(
  '/jobs/:jobId/interests/:studentId',
  requireRole('RECRUITER', 'SUPER_ADMIN'),
  validateBody(updateJobInterestStatusSchema),
  recruiterController.updateJobInterest
);

// Super Admin Management for Recruiter Approvals
router.get(
  '/',
  requireRole('SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await recruiterService.getRecruiters(page, limit);
      sendSuccess(res, result.items, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:recruiterId/approve',
  requireRole('SUPER_ADMIN'),
  auditLog('Recruiter'),
  async (req, res, next) => {
    try {
      const { recruiterId } = req.params;
      const { isApproved } = req.body;
      const result = await recruiterService.updateRecruiterApproval(recruiterId, isApproved);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
