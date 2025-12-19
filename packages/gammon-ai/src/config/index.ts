// src/config/index.ts
import dotenv from 'dotenv';
import ms from 'ms';
import type { StringValue } from 'ms';

// Load environment variables
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const formatSecretSnapshot = () => {
  const entries = Object.entries(process.env)
    .filter(([key]) => key.toUpperCase().includes('SECRET'))
    .map(([key, value]) => ({ key, status: value ? `${value.length} chars` : 'missing' }));

  return entries.length > 0 ? entries : 'no SECRET-like environment variables detected';
};

const resolveSecret = (envKey: string, fallback: string) => {
  const secret = process.env[envKey];
  if (!secret) {
    console.error(`CRITICAL: ${envKey} missing in ${isProduction ? 'production' : 'development'} environment. Using fallback secret. Snapshot:`, formatSecretSnapshot());
    return fallback;
  }
  return secret;
};

const resolveDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    const message = 'DATABASE_URL is not set. Prisma will fail to connect.';
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`WARNING: ${message}`);
  }
  return url ?? 'postgresql://localhost:5432/gammon_dev';
};

const defaultAllowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const productionDefaultOrigins = [
  'https://gammon-guru.app',
  'https://app.gammonguru.com',
  'https://gurugammon.onrender.com'
];

const parseOrigins = (raw?: string | null) =>
  raw?.split(',').map(origin => origin.trim()).filter(Boolean) ?? [];

const resolveCorsConfig = () => {
  const allowCredentials = true;
  const commonHeaders = ['Authorization', 'Content-Type', 'X-Requested-With', 'X-CSRF-Token', 'X-Request-Id'].join(', ');
  const commonMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].join(',');
  const exposedHeaders = ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'].join(', ');

  const envOrigins = new Set<string>([
    ...parseOrigins(process.env.CORS_ORIGIN),
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : [])
  ]);

  const maxAge = 60 * 60 * 24; // 24h preflight cache

  if (isProduction) {
    if (envOrigins.size === 0) {
      console.warn('WARNING: Using default production CORS origins. Configure CORS_ORIGIN or FRONTEND_URL for stricter control.');
      productionDefaultOrigins.forEach(origin => envOrigins.add(origin));
    }

    return {
      origins: Array.from(envOrigins),
      allowCredentials,
      allowHeaders: commonHeaders,
      allowMethods: commonMethods,
      exposedHeaders,
      maxAge
    } as const;
  }

  const mergedOrigins = new Set<string>([...defaultAllowedOrigins, ...envOrigins]);

  return {
    origins: Array.from(mergedOrigins),
    allowCredentials,
    allowHeaders: commonHeaders,
    allowMethods: commonMethods,
    exposedHeaders,
    maxAge
  } as const;
};

const parsePositiveNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const splitCsv = (value: string | undefined) =>
  value?.split(',').map(entry => entry.trim()).filter(Boolean) ?? [];

const resolveEloConfig = () => {
  const kFactor = parsePositiveNumber(process.env.ELO_K_FACTOR, 32);
  const baseRating = parsePositiveNumber(process.env.ELO_BASE_RATING, 1500);
  return {
    kFactor,
    baseRating
  } as const;
};

const resolveTimeControlPreset = () => {
  const preset = (process.env.TIME_CONTROL_PRESET ?? 'NORMAL').toUpperCase();
  if (!['BLITZ', 'NORMAL', 'LONG', 'CUSTOM'].includes(preset)) {
    return 'NORMAL' as const;
  }
  return preset as 'BLITZ' | 'NORMAL' | 'LONG' | 'CUSTOM';
};

const resolveTimeControlConfig = () => {
  const preset = resolveTimeControlPreset();
  const totalMs = parsePositiveNumber(process.env.TIME_CONTROL_TOTAL_MS, 10 * 60 * 1000);
  const incrementMs = parsePositiveNumber(process.env.TIME_CONTROL_INCREMENT_MS, 1_000);
  const delayMs = parsePositiveNumber(process.env.TIME_CONTROL_DELAY_MS, 0);

  return {
    preset,
    totalTimeMs: totalMs,
    incrementMs,
    delayMs
  } as const;
};

const asDurationSeconds = (value: string | number, label: string): number => {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    throw new Error(`Invalid numeric duration for ${label}`);
  }

  const parsed = ms(value as StringValue);
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid duration string for ${label}: ${value}`);
  }

  return Math.max(1, Math.floor(parsed / 1000));
};

const resolveDurationSeconds = (envKey: string, fallback: string): number => {
  const raw = process.env[envKey];

  try {
    if (raw && raw.trim().length > 0) {
      return asDurationSeconds(raw.trim(), envKey);
    }

    return asDurationSeconds(fallback, `${envKey} (fallback)`);
  } catch (error) {
    if (!isProduction) {
      console.warn(`WARNING: ${String(error)}. Falling back to default duration.`);
      return asDurationSeconds(fallback, `${envKey} (fallback)`);
    }
    throw error;
  }
};

const resolveRateLimitConfig = () => {
  const enabled = process.env.RATE_LIMIT_ENABLED !== 'false';

  const buildLimiterConfig = (
    prefix: string,
    defaults: { windowMs: number; max: number; message: string }
  ) => ({
    windowMs: parsePositiveNumber(process.env[`${prefix}_WINDOW_MS`], defaults.windowMs),
    max: parsePositiveNumber(process.env[`${prefix}_MAX`], defaults.max),
    message: process.env[`${prefix}_MESSAGE`] ?? defaults.message
  });

  return {
    enabled,
    bypassUserIds: splitCsv(process.env.RATE_LIMIT_BYPASS_USER_IDS),
    defaultMessage: process.env.RATE_LIMIT_MESSAGE ?? 'Too many requests. Please try again later.',
    auth: buildLimiterConfig('RATE_LIMIT_AUTH', {
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many authentication attempts. Please slow down.'
    }),
    gnubg: buildLimiterConfig('RATE_LIMIT_GNUBG', {
      windowMs: 60 * 1000,
      max: 30,
      message: 'Too many AI analysis requests. Please slow down.'
    })
  } as const;
};

const resolveSessionConfig = () => {
  const ttlSeconds = parsePositiveNumber(process.env.SESSION_TOKEN_TTL_SECONDS, 30 * 60);
  const replayRetention = parsePositiveNumber(process.env.SESSION_REPLAY_RETENTION, 50);
  const secret = resolveSecret('SESSION_TOKEN_SECRET', 'dev-session-secret');
  const cleanupIntervalMs = parsePositiveNumber(process.env.SESSION_CLEANUP_INTERVAL_MS, 5 * 60 * 1000);
  const redisReadThroughFlag = process.env.SESSION_REDIS_READTHROUGH_ENABLED;
  const defaultRedisReadThrough = (process.env.NODE_ENV ?? '').toLowerCase() === 'staging';
  const redisReadThroughEnabled =
    typeof redisReadThroughFlag === 'string'
      ? redisReadThroughFlag === 'true'
      : defaultRedisReadThrough;
  const redisNamespace = process.env.SESSION_REDIS_NAMESPACE?.trim() || 'gsr';

  return {
    tokenSecret: secret,
    ttlSeconds,
    replayRetention,
    cleanupIntervalMs,
    redisReadThroughEnabled,
    redisNamespace
  } as const;
};

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: '/api',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  accessTokenSecret: resolveSecret('ACCESS_TOKEN_SECRET', 'dev-access-secret'),
  refreshTokenSecret: resolveSecret('REFRESH_TOKEN_SECRET', 'dev-refresh-secret'),
  accessTokenTtlSeconds: resolveDurationSeconds('ACCESS_TOKEN_TTL', '15m'),
  refreshTokenTtlSeconds: resolveDurationSeconds('REFRESH_TOKEN_TTL', '7d'),
  jwtSecret: resolveSecret('ACCESS_TOKEN_SECRET', 'dev-access-secret'),
  databaseUrl: resolveDatabaseUrl(),
  cors: resolveCorsConfig(),
  rateLimit: resolveRateLimitConfig(),
  elo: resolveEloConfig(),
  timeControl: resolveTimeControlConfig(),
  session: resolveSessionConfig()
} as const;
