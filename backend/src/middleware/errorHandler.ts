import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { errorResponse, validationErrorResponse } from '../utils/response';

// ============================================================
// AppError — Custom error class per Dev Spec (Doc 09)
// ============================================================

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================
// Global Error Handler Middleware
// Per Dev Spec: Never expose raw error messages to client
// ============================================================

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle our custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code));
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json(
      validationErrorResponse(
        err.errors.map((e) => ({
          path: e.path,
          message: e.message,
        }))
      )
    );
    return;
  }

  // Handle Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;

    if (prismaErr.code === 'P2002') {
      const target = prismaErr.meta?.target?.join(', ') || 'field';
      res.status(409).json(
        errorResponse(
          `A record with this ${target} already exists`,
          'DUPLICATE_ENTRY'
        )
      );
      return;
    }

    if (prismaErr.code === 'P2025') {
      res.status(404).json(errorResponse('Record not found', 'NOT_FOUND'));
      return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(errorResponse('Invalid token', 'TOKEN_INVALID'));
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json(errorResponse('Token expired', 'TOKEN_EXPIRED'));
    return;
  }

  // Unhandled error — log and return generic message
  logger.error('Unhandled error:', err);
  res.status(500).json(errorResponse('Something went wrong'));
}
