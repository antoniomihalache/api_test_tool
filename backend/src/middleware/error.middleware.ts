import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  if (statusCode === 500) {
    console.error('Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export function notFoundMiddleware(_req: Request, res: Response<ApiResponse>): void {
  res.status(404).json({ success: false, error: 'Route not found' });
}

export function createError(message: string, statusCode = 400): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  return err;
}
