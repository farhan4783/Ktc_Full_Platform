import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { validationErrorResponse } from '../utils/response';

// ============================================================
// Zod Validation Middleware
// Per Dev Spec (Doc 09): All API inputs validated with Zod
// before controller logic
// ============================================================

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          validationErrorResponse(
            error.errors.map((e) => ({
              path: e.path,
              message: e.message,
            }))
          )
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request query params against a Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          validationErrorResponse(
            error.errors.map((e) => ({
              path: e.path,
              message: e.message,
            }))
          )
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          validationErrorResponse(
            error.errors.map((e) => ({
              path: e.path,
              message: e.message,
            }))
          )
        );
        return;
      }
      next(error);
    }
  };
}
