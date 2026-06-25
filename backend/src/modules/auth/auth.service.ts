import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { generateOtp, generateRandomToken, hashToken, generateStudentCode } from '../../utils/codeGenerator';
import { addJob, JOBS } from '../../services/queue.service';
import { logger } from '../../utils/logger';
import type {
  RegisterInput,
  VerifyEmailInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './auth.schema';

// ============================================================
// Auth Service — Business Logic
// Per Doc 09: Service layer has business logic only
// Per Doc 10: Complete auth flow specs
// ============================================================

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = Number(process.env.JWT_REFRESH_TOKEN_EXPIRY_DAYS) || 30;
const OTP_EXPIRY_MINUTES = 10;

// ===================== TOKEN GENERATION =====================

/**
 * Generate RS256 JWT access token
 * Payload: { userId, role, collegeId }
 */
function generateAccessToken(userId: string, role: string, collegeId?: string): string {
  const privateKey = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!privateKey) {
    throw new AppError('JWT configuration error', 500, 'CONFIG_ERROR');
  }

  const payload: Record<string, unknown> = {
    userId,
    role,
  };

  if (collegeId) {
    payload.collegeId = collegeId;
  }

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRY as any,
  });
}

/**
 * Generate and store refresh token
 * Per Doc 10: 64-byte random hex, stored as SHA256 hash, 30-day expiry
 */
async function generateRefreshToken(
  userId: string,
  deviceInfo?: Record<string, unknown>
): Promise<string> {
  const rawToken = generateRandomToken(64);
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      deviceInfo: deviceInfo ? (deviceInfo as any) : Prisma.DbNull,
      expiresAt,
    },
  });

  return rawToken;
}

/**
 * Build the token response object
 */
async function buildTokenResponse(userId: string, role: string, collegeId?: string) {
  const accessToken = generateAccessToken(userId, role, collegeId);
  const refreshToken = await generateRefreshToken(userId);

  return { accessToken, refreshToken };
}

// ===================== REGISTER =====================

/**
 * Register a new student
 * Per Doc 10: Hash password (bcrypt 12), create user (role: STUDENT),
 * generate OTP, send verification email
 */
export async function register(data: RegisterInput) {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Create user + student record in transaction
  const user = await prisma.$transaction(async (tx) => {
    // Create the user
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'STUDENT',
        firstName: data.firstName,
        lastName: data.lastName,
        isEmailVerified: false,
      },
    });

    // Create the student profile
    const studentCode = generateStudentCode();
    await tx.student.create({
      data: {
        userId: newUser.id,
        studentCode,
      },
    });

    return newUser;
  });

  // Generate and send OTP
  const otp = generateOtp();
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      otp,
      type: 'EMAIL_VERIFY',
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  // Send verification email (async, don't block registration)
  addJob(JOBS.SEND_VERIFICATION_EMAIL, {
    email: data.email,
    otp,
    firstName: data.firstName,
  }).catch((err) => {
    logger.error('Failed to enqueue verification email:', err);
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    message: 'Registration successful. Please check your email for the verification code.',
  };
}

// ===================== VERIFY EMAIL =====================

/**
 * Verify email with OTP
 * Per Doc 10: Find unexpired unused OTP, mark used, set isEmailVerified=true
 */
export async function verifyEmail(data: VerifyEmailInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError('No account found with this email', 404, 'USER_NOT_FOUND');
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400, 'ALREADY_VERIFIED');
  }

  // Find valid, unused OTP
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      otp: data.otp,
      type: 'EMAIL_VERIFY',
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
  }

  // Mark OTP as used and verify user
  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    }),
  ]);

  return {
    message: 'Email verified successfully. You can now log in.',
  };
}

// ===================== LOGIN =====================

/**
 * Login for all roles
 * Per Doc 10: Find user (active, not soft-deleted), compare password,
 * generate JWT access + refresh token
 */
export async function login(data: LoginInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      collegeAdmins: {
        select: { collegeId: true },
        take: 1,
      },
    },
  });

  if (!user || user.deletedAt) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError(
      'Your account has been deactivated. Please contact support.',
      403,
      'ACCOUNT_DEACTIVATED'
    );
  }

  // Students must verify email before login
  if (user.role === 'STUDENT' && !user.isEmailVerified) {
    throw new AppError(
      'Please verify your email before logging in.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Get college ID for college admins
  const collegeId = user.collegeAdmins?.[0]?.collegeId;

  // Generate tokens
  const tokens = await buildTokenResponse(user.id, user.role, collegeId);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      requiresPasswordChange: user.requiresPasswordChange,
      ...(collegeId && { collegeId }),
    },
  };
}

// ===================== REFRESH TOKEN =====================

/**
 * Rotate refresh token
 * Per Doc 10: Find valid unexpired token by hash, verify not revoked,
 * generate new access + refresh, revoke old
 */
export async function refreshAccessToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  // Find the refresh token
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          collegeAdmins: {
            select: { collegeId: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (storedToken.revokedAt) {
    // Token reuse detected — potential theft, revoke all tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(
      'Refresh token has been revoked. Please login again.',
      401,
      'TOKEN_REVOKED'
    );
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token expired. Please login again.', 401, 'TOKEN_EXPIRED');
  }

  if (!storedToken.user.isActive || storedToken.user.deletedAt) {
    throw new AppError('Account is inactive', 403, 'ACCOUNT_DEACTIVATED');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // Generate new token pair
  const collegeId = storedToken.user.collegeAdmins?.[0]?.collegeId;
  const tokens = await buildTokenResponse(
    storedToken.userId,
    storedToken.user.role,
    collegeId
  );

  return {
    ...tokens,
    user: {
      id: storedToken.user.id,
      email: storedToken.user.email,
      firstName: storedToken.user.firstName,
      lastName: storedToken.user.lastName,
      role: storedToken.user.role,
      avatarUrl: storedToken.user.avatarUrl,
    },
  };
}

// ===================== FORGOT PASSWORD =====================

/**
 * Send password reset OTP
 * Per Doc 10: Find user, generate OTP (PASSWORD_RESET), send email
 * Always return success (don't reveal if email exists)
 */
export async function forgotPassword(data: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.isActive || user.deletedAt) {
    return {
      message: 'If an account exists with this email, you will receive a password reset code.',
    };
  }

  // Generate OTP
  const otp = generateOtp();
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      otp,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  // Send email
  addJob(JOBS.SEND_RESET_EMAIL, {
    email: data.email,
    otp,
    firstName: user.firstName,
  }).catch((err) => {
    logger.error('Failed to enqueue password reset email:', err);
  });

  return {
    message: 'If an account exists with this email, you will receive a password reset code.',
  };
}

// ===================== RESET PASSWORD =====================

/**
 * Reset password with OTP
 * Per Doc 10: Validate OTP, hash new password, update user,
 * invalidate all existing refresh tokens
 */
export async function resetPassword(data: ResetPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError('Invalid reset request', 400, 'INVALID_RESET');
  }

  // Find valid OTP
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      otp: data.otp,
      type: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);

  // Update password, mark OTP used, revoke all refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        requiresPasswordChange: false,
      },
    }),
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return {
    message: 'Password reset successfully. Please log in with your new password.',
  };
}

// ===================== CHANGE PASSWORD =====================

/**
 * Change password (for logged-in users)
 */
export async function changePassword(userId: string, data: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }

  // Hash and update
  const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      requiresPasswordChange: false,
    },
  });

  return {
    message: 'Password changed successfully.',
  };
}

// ===================== LOGOUT =====================

/**
 * Logout — revoke current refresh token
 */
export async function logout(rawToken: string) {
  if (!rawToken) {
    return { message: 'Logged out successfully.' };
  }

  const tokenHash = hashToken(rawToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { message: 'Logged out successfully.' };
}

// ===================== RESEND OTP =====================

/**
 * Resend verification OTP
 */
export async function resendVerificationOtp(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('No account found with this email', 404, 'USER_NOT_FOUND');
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400, 'ALREADY_VERIFIED');
  }

  // Generate new OTP
  const otp = generateOtp();
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      otp,
      type: 'EMAIL_VERIFY',
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  addJob(JOBS.SEND_VERIFICATION_EMAIL, {
    email,
    otp,
    firstName: user.firstName,
  }).catch((err) => {
    logger.error('Failed to enqueue verification email:', err);
  });

  return {
    message: 'Verification code sent. Please check your email.',
  };
}

// ===================== GET CURRENT USER =====================

/**
 * Get authenticated user's profile
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isEmailVerified: true,
      requiresPasswordChange: true,
      lastLoginAt: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          studentCode: true,
          collegeId: true,
          enrollmentNumber: true,
          branch: true,
          graduationYear: true,
          skills: true,
          placementStatus: true,
          profileCompleted: true,
          cgpa: true,
          resumeUrl: true,
          linkedinUrl: true,
          githubUrl: true,
        },
      },
      trainer: {
        select: {
          id: true,
          bio: true,
          specialisations: true,
          experienceYears: true,
        },
      },
      collegeAdmins: {
        select: {
          collegeId: true,
          college: {
            select: { name: true, code: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
}
