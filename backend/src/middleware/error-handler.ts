import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { captureException } from '../utils/sentry';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with context
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });

  // Send to Sentry with context
  if (!(err instanceof AppError) || err.statusCode >= 500) {
    // Only send unexpected errors or 5xx errors to Sentry
    captureException(err, {
      request: {
        path: req.path,
        method: req.method,
        query: req.query,
        // Don't include body to avoid sensitive data
      },
      user: {
        // Add user info if available from JWT
        id: (req as any).user?.id,
        email: (req as any).user?.email,
      },
    });
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }

  // Handle unknown errors - provide more details in development
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  
  sendError(res, errorMessage, 'INTERNAL_ERROR', 500);
}

