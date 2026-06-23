import { Router } from 'express';
import * as authController from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schema';

const router = Router();

// Public routes (no auth required)
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  authController.register
);

router.post(
  '/verify-email',
  authLimiter,
  validateBody(verifyEmailSchema),
  authController.verifyEmail
);

router.post(
  '/resend-otp',
  otpLimiter,
  authController.resendOtp
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login
);

router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  authController.refresh
);

router.post(
  '/forgot-password',
  otpLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  '/logout',
  authController.logout
);

// Protected routes (requires auth)
router.get(
  '/me',
  authenticate,
  authController.me
);

router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

export default router;
