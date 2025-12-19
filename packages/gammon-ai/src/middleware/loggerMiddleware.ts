// src/middleware/loggerMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const REQUEST_ID_HEADER = 'x-request-id';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Log la requête entrante
  logger.info(`➡◾ ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId
  });

  // Hook sur la fin de la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`⬅◾ ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      requestId: req.requestId,
      durationMs: duration
    });
  });

  if (req.requestId) {
    res.setHeader(REQUEST_ID_HEADER, req.requestId);
  }

  next();
}
