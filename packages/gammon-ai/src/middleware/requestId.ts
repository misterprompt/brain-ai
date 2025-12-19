// src/middleware/requestId.ts
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id']?.toString() ?? randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};
