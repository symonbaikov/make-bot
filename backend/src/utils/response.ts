import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  code?: string,
  statusCode: number = 500
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
    },
  };
  res.status(statusCode).json(response);
}

