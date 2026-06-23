import rateLimit from 'express-rate-limit';

// ============================================================
// Rate Limiting Middleware
// Per Doc 10: Login max 5 attempts per IP per 15 minutes
// General: 100 requests per 15 minutes
// ============================================================

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
});

/**
 * Strict rate limiter for auth endpoints (login, register)
 * 5 attempts per IP per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});

/**
 * OTP request limiter — prevent OTP spamming
 * 3 OTP requests per email per 10 minutes
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'OTP_RATE_LIMIT',
      message: 'Too many OTP requests. Please try again after 10 minutes.',
    },
  },
});
