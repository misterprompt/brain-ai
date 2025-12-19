// src/middleware/rateLimiter.ts
import type { Request, Response, NextFunction } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

import { config } from '../config';
import { Logger } from '../utils/logger';

const logger = new Logger('RateLimiter');

// Defensive wrapper around config.rateLimit so we don't crash if it's undefined at runtime
const rateLimitConfig = config.rateLimit ?? {
  enabled: false,
  bypassUserIds: [],
  defaultMessage: 'Too many requests. Please try again later.',
  auth: undefined as unknown,
  gnubg: undefined as unknown
} as const;

type RateLimiterScope = 'auth' | 'gnubg';

type RequestWithUser = Request & {
  user?: {
    id?: string;
    role?: string;
  };
};

const forwardedIp = (req: Request) => {
  const header = req.headers['x-forwarded-for'];
  if (!header) {
    return null;
  }

  if (Array.isArray(header)) {
    return header[0];
  }

  return header.split(',')[0]?.trim() ?? null;
};

const resolveKey = (req: RequestWithUser) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  const ip = req.ip || forwardedIp(req) || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
};

const shouldBypass = (req: RequestWithUser) => {
  if (!rateLimitConfig.enabled) {
    return true;
  }

  if (config.nodeEnv === 'test' && process.env.RATE_LIMIT_TEST_MODE !== 'true') {
    return true;
  }

  if (req.user?.role && req.user.role.toLowerCase() === 'admin') {
    return true;
  }

  if (req.user?.id && rateLimitConfig.bypassUserIds.includes(req.user.id)) {
    return true;
  }

  return false;
};

export const createRateLimiter = (scope: RateLimiterScope): RateLimitRequestHandler => {
  const settings = (rateLimitConfig as Record<string, any>)[scope];

  if (!settings || !rateLimitConfig.enabled) {
    const noop = (( _req: Request, _res: Response, next: NextFunction) => next()) as RateLimitRequestHandler;
    noop.resetKey = () => {};
    noop.getKey = async () => undefined;
    return noop;
  }

  const message = settings.message ?? config.rateLimit.defaultMessage;

  return rateLimit({
    windowMs: settings.windowMs,
    max: settings.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: message
    },
    keyGenerator: (req) => resolveKey(req as RequestWithUser),
    skip: (req) => shouldBypass(req as RequestWithUser),
    handler: (req, res, _next, options) => {
      const key = resolveKey(req as RequestWithUser);
      logger.warn('Rate limit exceeded', {
        scope,
        key,
        limit: options.limit,
        windowMs: settings.windowMs
      });

      res.status(options.statusCode).json({
        success: false,
        error: message
      });
    }
  });
};
