import { Response } from 'express';

// ============================================================
// Standard API Response Helpers
// Per TRD: { success: boolean, data?: any, error?: { code, message, details } }
// ============================================================

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Success response with data
 */
export function successResponse<T>(data: T, meta?: PaginationMeta) {
  return {
    success: true as const,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Error response
 */
export function errorResponse(
  message: string,
  code: string = 'INTERNAL_ERROR',
  details?: Array<{ field?: string; message: string }>
) {
  return {
    success: false as const,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Validation error response from Zod
 */
export function validationErrorResponse(
  errors: Array<{ path: (string | number)[]; message: string }>
) {
  return {
    success: false as const,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    },
  };
}

/**
 * Send success response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200, meta?: PaginationMeta) {
  return res.status(statusCode).json(successResponse(data, meta));
}

/**
 * Send error response
 */
export function sendError(res: Response, message: string, statusCode: number = 500, code?: string) {
  return res.status(statusCode).json(errorResponse(message, code));
}
