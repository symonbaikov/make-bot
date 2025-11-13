import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { sendError } from './response';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        sendError(
          res,
          firstError?.message || 'Validation error',
          'VALIDATION_ERROR',
          400
        );
        return;
      }
      sendError(res, 'Validation error', 'VALIDATION_ERROR', 400);
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as unknown as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        sendError(
          res,
          firstError?.message || 'Validation error',
          'VALIDATION_ERROR',
          400
        );
        return;
      }
      sendError(res, 'Validation error', 'VALIDATION_ERROR', 400);
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        sendError(
          res,
          firstError?.message || 'Validation error',
          'VALIDATION_ERROR',
          400
        );
        return;
      }
      sendError(res, 'Validation error', 'VALIDATION_ERROR', 400);
    }
  };
}

