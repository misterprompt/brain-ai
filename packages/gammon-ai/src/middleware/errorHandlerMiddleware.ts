// src/middleware/errorHandlerMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

type KnownError = {
  message?: string;
  status?: number;
  code?: string;
  stack?: string;
};

export function errorHandlerMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const err = (error ?? {}) as KnownError;
  const message = err.message ?? 'Internal Server Error';
  const status = err.status ?? 500;

  logger.error(`🚨 ${message}`, error);
  logger.info('Error details', {
    url: req.originalUrl,
    method: req.method,
    stack: err.stack
  });

  res.status(status).json({
    error: {
      message,
      code: err.code ?? 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    }
  });
}
