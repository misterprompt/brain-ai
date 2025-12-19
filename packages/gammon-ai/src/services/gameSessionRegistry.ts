import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import {
  gameSessionDbDurationSeconds,
  gameSessionDbErrorsTotal,
  gameSessionCacheHitsTotal,
  gameSessionCacheMissesTotal,
  gameSessionCacheErrorsTotal
} from '../metrics/gameSessionMetrics';
import { logger } from '../utils/logger';
import { getRedisClient } from './redisClient';

const db: any = prisma;

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const now = () => new Date();

// Defensive defaults in case config.session is unexpectedly undefined at runtime
const SESSION_TTL_SECONDS = config.session?.ttlSeconds ?? 30 * 60; // 30 minutes
const SESSION_TOKEN_SECRET = config.session?.tokenSecret ?? 'dev-session-secret';
const SESSION_REDIS_ENABLED = config.session?.redisReadThroughEnabled ?? false;
const SESSION_REDIS_NAMESPACE = config.session?.redisNamespace ?? 'gsr';
const DEFAULT_REPLAY_LIMIT = config.session?.replayRetention ?? 50;

const CACHE_OPERATIONS = {
  sessionByGameUser: 'session_by_game_user',
  sessionById: 'session_by_id',
  sessionSnapshot: 'session_snapshot',
  replayAppend: 'replay_append',
  replayHydrate: 'replay_hydrate',
  replayPrune: 'replay_prune',
  replayFetch: 'replay_fetch'
} as const;

type CacheOperation = (typeof CACHE_OPERATIONS)[keyof typeof CACHE_OPERATIONS];

const recordCacheHit = (operation: CacheOperation) => {
  gameSessionCacheHitsTotal.labels(operation).inc();
};

const recordCacheMiss = (operation: CacheOperation) => {
  gameSessionCacheMissesTotal.labels(operation).inc();
};

const recordCacheError = (operation: CacheOperation) => {
  gameSessionCacheErrorsTotal.labels(operation).inc();
};

export interface ResumeTokenPayload {
  sid: string;
  gid: string;
  uid: string;
  iat: number;
  exp: number;
}

const serializeEvent = (event: RecordedEvent) =>
  JSON.stringify({
    id: event.id,
    gameId: event.gameId,
    sequence: event.sequence,
    type: event.type,
    payload: event.payload,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt
  });

async function appendReplayEventToCache(event: RecordedEvent) {
  if (!SESSION_REDIS_ENABLED) {
    return;
  }

  const client = getRedisClient();
  if (!client) {
    return;
  }

  const key = replayCacheKey(event.gameId);
  const ttlSeconds = Math.max(1, SESSION_TTL_SECONDS);

  try {
    await client
      .pipeline()
      .rpush(key, serializeEvent(event))
      .ltrim(key, -DEFAULT_REPLAY_LIMIT, -1)
      .expire(key, ttlSeconds)
      .exec();
    recordCacheHit(CACHE_OPERATIONS.replayAppend);
  } catch (error) {
    recordCacheError(CACHE_OPERATIONS.replayAppend);
    logger.warn('Failed to append event to replay cache', {
      context: 'GameSessionRegistryRedis',
      gameId: event.gameId,
      sequence: event.sequence,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function replaceReplayCache(gameId: string, events: RecordedEvent[]) {
  if (!SESSION_REDIS_ENABLED) {
    return;
  }

  const client = getRedisClient();
  if (!client) {
    return;
  }

  const key = replayCacheKey(gameId);
  const ttlSeconds = Math.max(1, SESSION_TTL_SECONDS);

  try {
    const pipeline = client.pipeline().del(key);
    if (events.length > 0) {
      pipeline.rpush(key, ...events.map(serializeEvent)).expire(key, ttlSeconds);
    }

    await pipeline.exec();
    recordCacheHit(CACHE_OPERATIONS.replayHydrate);
  } catch (error) {
    recordCacheError(CACHE_OPERATIONS.replayHydrate);
    logger.warn('Failed to hydrate replay cache', {
      context: 'GameSessionRegistryRedis',
      gameId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function pruneReplayCache(gameId: string, minimumSequence: number) {
  if (!SESSION_REDIS_ENABLED) {
    return;
  }

  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const rawEvents = await client.lrange(replayCacheKey(gameId), 0, -1);
    if (rawEvents.length === 0) {
      return;
    }

    const filtered: RecordedEvent[] = [];
    for (const entry of rawEvents) {
      try {
        const event = mapEvent(JSON.parse(entry));
        if (event.sequence > minimumSequence) {
          filtered.push(event);
        }
      } catch {
        continue;
      }
    }

    const remaining = filtered.slice(-DEFAULT_REPLAY_LIMIT);

    await replaceReplayCache(gameId, remaining);
    recordCacheHit(CACHE_OPERATIONS.replayPrune);
  } catch (error) {
    recordCacheError(CACHE_OPERATIONS.replayPrune);
    logger.warn('Failed to prune replay cache', {
      context: 'GameSessionRegistryRedis',
      gameId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function readReplayEventsFromCache(gameId: string): Promise<ReplayCacheResult> {
  if (!SESSION_REDIS_ENABLED) {
    return { status: 'unavailable' };
  }

  const client = getRedisClient();
  if (!client) {
    return { status: 'unavailable' };
  }

  try {
    const rawEvents = await client.lrange(replayCacheKey(gameId), 0, -1);
    if (rawEvents.length === 0) {
      recordCacheMiss(CACHE_OPERATIONS.replayFetch);
      return { status: 'miss' };
    }

    const events = rawEvents
      .map((entry) => {
        try {
          return mapEvent(JSON.parse(entry));
        } catch {
          return null;
        }
      })
      .filter((event): event is RecordedEvent => Boolean(event));

    recordCacheHit(CACHE_OPERATIONS.replayFetch);
    return { status: 'hit', events };
  } catch (error) {
    recordCacheError(CACHE_OPERATIONS.replayFetch);
    logger.warn('Failed to read replay events from cache', {
      context: 'GameSessionRegistryRedis',
      gameId,
      error: error instanceof Error ? error.message : String(error)
    });
    return { status: 'error' };
  }
}

type SessionRecord = {
  id: string;
  gameId: string;
  userId: string;
  resumeTokenHash: string;
  lastAckSequence: number;
  lastHeartbeatAt: Date | null;
  issuedAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
};

type RecordedEvent = {
  id: string;
  gameId: string;
  sequence: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

type ReplayCacheResult =
  | { status: 'hit'; events: RecordedEvent[] }
  | { status: 'miss' }
  | { status: 'error' }
  | { status: 'unavailable' };

export interface ValidatedSession {
  session: SessionRecord;
  payload: ResumeTokenPayload;
  token: string;
}

export interface IssueSessionOptions {
  metadata?: Record<string, unknown>;
  lastAckSequence?: number;
}

export interface RecordEventParams {
  gameId: string;
  type: string;
  payload: Record<string, unknown>;
}

const toJsonValue = (value: Record<string, unknown> | undefined): Record<string, unknown> | undefined =>
  typeof value === 'undefined' ? undefined : value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const extractMetadata = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

const getDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const getString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const getNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const mapSession = (session: unknown): SessionRecord => {
  const record = asRecord(session);
  return {
    id: getString(record.id),
    gameId: getString(record.gameId),
    userId: getString(record.userId),
    resumeTokenHash: getString(record.resumeTokenHash),
    lastAckSequence: getNumber(record.lastAckSequence),
    lastHeartbeatAt: getDate(record.lastHeartbeatAt),
    issuedAt: getDate(record.issuedAt) ?? now(),
    expiresAt: getDate(record.expiresAt),
    metadata: extractMetadata(record.metadata) ?? null
  } satisfies SessionRecord;
};

const mapEvent = (event: unknown): RecordedEvent => {
  const record = asRecord(event);
  return {
    id: getString(record.id),
    gameId: getString(record.gameId),
    sequence: getNumber(record.sequence),
    type: getString(record.type, 'unknown'),
    payload: asRecord(record.payload),
    createdAt: getDate(record.createdAt) ?? now()
  } satisfies RecordedEvent;
};

async function measureDbCall<T>(operation: string, task: () => Promise<T>): Promise<T> {
  const endTimer = gameSessionDbDurationSeconds.startTimer({ operation });
  try {
    const result = await task();
    endTimer({ status: 'success' });
    return result;
  } catch (error) {
    endTimer({ status: 'error' });
    gameSessionDbErrorsTotal.labels(operation).inc();
    throw error;
  }
}

const sessionCacheKey = (gameId: string, userId: string) => `${SESSION_REDIS_NAMESPACE}:session:${gameId}:${userId}`;
const sessionCacheIdKey = (sessionId: string) => `${SESSION_REDIS_NAMESPACE}:sessionId:${sessionId}`;
const replayCacheKey = (gameId: string) => `${SESSION_REDIS_NAMESPACE}:events:${gameId}`;

async function cacheSessionSnapshot(session: SessionRecord) {
  if (!SESSION_REDIS_ENABLED) {
    return;
  }

  const client = getRedisClient();
  if (!client) {
    return;
  }

  const ttlSeconds = Math.max(1, SESSION_TTL_SECONDS);
  const encoded = JSON.stringify(session);

  try {
    await client
      .pipeline()
      .setex(sessionCacheKey(session.gameId, session.userId), ttlSeconds, encoded)
      .setex(sessionCacheIdKey(session.id), ttlSeconds, encoded)
      .exec();
    recordCacheHit(CACHE_OPERATIONS.sessionSnapshot);
  } catch (error) {
    recordCacheError(CACHE_OPERATIONS.sessionSnapshot);
    logger.warn('Failed to cache session snapshot', {
      context: 'GameSessionRegistryRedis',
      gameId: session.gameId,
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function readSessionFromCacheByGameUser(gameId: string, userId: string): Promise<SessionRecord | null> {
  if (!SESSION_REDIS_ENABLED) {
    return null;
  }

  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const raw = await client.get(sessionCacheKey(gameId, userId));
    if (!raw) {
      recordCacheMiss(CACHE_OPERATIONS.sessionByGameUser);
      return null;
    }

    const parsed = mapSession(JSON.parse(raw));
    recordCacheHit(CACHE_OPERATIONS.sessionByGameUser);
    return parsed;
  } catch (error) {
    recordCacheError(CACHE_OPERATIONS.sessionByGameUser);
    logger.warn('Failed to read session from cache', {
      context: 'GameSessionRegistryRedis',
      gameId,
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function readSessionFromCacheById(sessionId: string): Promise<SessionRecord | null> {
  if (!SESSION_REDIS_ENABLED) {
    return null;
  }

  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const raw = await client.get(sessionCacheIdKey(sessionId));
    if (!raw) {
      recordCacheMiss(CACHE_OPERATIONS.sessionById);
      return null;
    }

    const parsed = mapSession(JSON.parse(raw));
    recordCacheHit(CACHE_OPERATIONS.sessionById);
    return parsed;
  } catch (error) {
    recordCacheError(CACHE_OPERATIONS.sessionById);
    logger.warn('Failed to read session by id from cache', {
      context: 'GameSessionRegistryRedis',
      sessionId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function upsertSession(
  gameId: string,
  userId: string,
  update: Record<string, unknown>,
  create: Record<string, unknown>
) {
  return measureDbCall('upsert_session', () =>
    db.gameSession.upsert({
      where: { gameId_userId: { gameId, userId } },
      update,
      create
    })
  );
}

export const GameSessionRegistry = {
  async issueSession(gameId: string, userId: string, options: IssueSessionOptions = {}) {
    const cached = await readSessionFromCacheByGameUser(gameId, userId);
    const existingRaw = cached
      ? null
      : await measureDbCall('find_session_by_game_user', () =>
          db.gameSession.findUnique({
            where: { gameId_userId: { gameId, userId } }
          })
        );
    const existing = cached ?? (existingRaw ? mapSession(existingRaw) : null);

    const sessionId = existing?.id ?? crypto.randomUUID();
    const issuedAt = now();
    const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000);

    const payload: ResumeTokenPayload = {
      sid: sessionId,
      gid: gameId,
      uid: userId,
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };

    const token = jwt.sign(payload, SESSION_TOKEN_SECRET, {
      expiresIn: SESSION_TTL_SECONDS
    });

    const resumeTokenHash = hashToken(token);
    const metadata = options.metadata ?? existing?.metadata ?? undefined;
    const lastAckSequence = options.lastAckSequence ?? existing?.lastAckSequence ?? 0;

    const session = await upsertSession(
      gameId,
      userId,
      {
        resumeTokenHash,
        lastAckSequence,
        lastHeartbeatAt: issuedAt,
        issuedAt,
        expiresAt,
        metadata: toJsonValue(metadata)
      },
      {
        id: sessionId,
        gameId,
        userId,
        resumeTokenHash,
        lastAckSequence,
        lastHeartbeatAt: issuedAt,
        issuedAt,
        expiresAt,
        metadata: toJsonValue(metadata)
      }
    );

    const normalized = mapSession(session);
    await cacheSessionSnapshot(normalized);
    return { token, session: normalized } satisfies { token: string; session: SessionRecord };
  },

  async validateToken(token: string): Promise<ValidatedSession | null> {
    try {
      const payload = jwt.verify(token, SESSION_TOKEN_SECRET) as ResumeTokenPayload;
      const cached = await readSessionFromCacheById(payload.sid);
      const sessionRaw = cached
        ? null
        : await measureDbCall('find_session_by_id', () => db.gameSession.findUnique({ where: { id: payload.sid } }));
      const normalized = cached ?? (sessionRaw ? mapSession(sessionRaw) : null);
      if (!normalized) {
        return null;
      }

      const session = normalized;

      if (session.gameId !== payload.gid || session.userId !== payload.uid) {
        return null;
      }

      if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
        return null;
      }

      const hashed = hashToken(token);
      if (session.resumeTokenHash !== hashed) {
        return null;
      }

      await cacheSessionSnapshot(session);
      return { session, payload, token } satisfies ValidatedSession;
    } catch {
      return null;
    }
  },

  async acknowledge(sessionId: string, sequence: number): Promise<void> {
    await measureDbCall('acknowledge_session', () =>
      db.gameSession.update({
        where: { id: sessionId },
        data: {
          lastAckSequence: {
            set: sequence
          }
        }
      })
    );
  },

  async getMinimumAckSequence(gameId: string): Promise<number | null> {
    const aggregateResult = await measureDbCall('min_ack_sequence', () =>
      db.gameSession.aggregate({
        where: { gameId },
        _min: { lastAckSequence: true }
      })
    );

    const resultRecord = asRecord(aggregateResult);
    const minRecord = asRecord(resultRecord._min);
    const value = minRecord.lastAckSequence;
    return typeof value === 'number' ? value : null;
  },

  async updateHeartbeat(sessionId: string): Promise<void> {
    await measureDbCall('update_heartbeat', () =>
      db.gameSession.update({
        where: { id: sessionId },
        data: { lastHeartbeatAt: now() }
      })
    );
  },

  async revoke(sessionId: string): Promise<void> {
    await measureDbCall('revoke_session', () => db.gameSession.delete({ where: { id: sessionId } })).catch(() => undefined);
  },

  async recordEvent({ gameId, type, payload }: RecordEventParams): Promise<number> {
    const createdEvent = (await measureDbCall('record_event', () =>
      db.$transaction(async (tx: any) => {
        const last = await tx.gameEvent.findFirst({
          where: { gameId },
          orderBy: { sequence: 'desc' },
          select: { sequence: true }
        });

        const sequence = (last?.sequence ?? 0) + 1;

        return tx.gameEvent.create({
          data: {
            gameId,
            sequence,
            type,
            payload
          }
        });
      })
    )) as Record<string, unknown>;

    const normalized = mapEvent(createdEvent);
    await appendReplayEventToCache(normalized);

    return normalized.sequence;
  },

  async fetchEventsSince(gameId: string, afterSequence: number, limit = DEFAULT_REPLAY_LIMIT): Promise<RecordedEvent[]> {
    const cached = await readReplayEventsFromCache(gameId);
    if (Array.isArray(cached)) {
      const filtered = cached.filter((event) => event.sequence > afterSequence).slice(0, limit);
      const cacheExhausted = cached.length < DEFAULT_REPLAY_LIMIT || filtered.length >= limit;
      if (cacheExhausted) {
        return filtered;
      }
    }

    const events = (await measureDbCall('fetch_events_since', () =>
      db.gameEvent.findMany({
        where: {
          gameId,
          sequence: {
            gt: afterSequence
          }
        },
        orderBy: { sequence: 'asc' },
        take: limit
      })
    )) as unknown[];

    const normalized = events.map(mapEvent);
    await replaceReplayCache(gameId, normalized.slice(-DEFAULT_REPLAY_LIMIT));
    return normalized;
  },

  async purgeEventsThrough(gameId: string, sequence: number): Promise<number> {
    const result = (await measureDbCall('purge_events_through', () =>
      db.gameEvent.deleteMany({
        where: {
          gameId,
          sequence: {
            lte: sequence
          }
        }
      })
    )) as Record<string, unknown>;

    await pruneReplayCache(gameId, sequence);
    return getNumber(result.count, 0);
  },

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const rows = (await measureDbCall('find_expired_sessions', () =>
        db.gameSession.findMany({
          where: {
            expiresAt: {
              lt: now()
            }
          },
          select: {
            id: true
          }
        })
      )) as unknown;

      if (!Array.isArray(rows)) {
        logger.warn(
          'cleanupExpiredSessions: unexpected non-array result',
          {
            context: 'GameSessionRegistryScheduler',
            rows
          }
        );
        return 0;
      }

      let deleted = 0;

      for (const row of rows) {
        if (!row || typeof row !== 'object') {
          logger.warn('Skipping invalid row during cleanup', {
            context: 'GameSessionRegistryScheduler',
            row
          });
          continue;
        }

        const sessionId = typeof (row as { id?: unknown }).id === 'string' ? (row as { id: string }).id : null;
        if (!sessionId) {
          logger.warn('Skipping row with missing session id', {
            context: 'GameSessionRegistryScheduler',
            row
          });
          continue;
        }

        try {
          await measureDbCall('delete_expired_session', () =>
            db.gameSession.delete({
              where: { id: sessionId }
            })
          );
          deleted += 1;
        } catch (innerError) {
          logger.error('Error cleaning expired session', {
            context: 'GameSessionRegistryScheduler',
            sessionId,
            error: innerError
          });
        }
      }

      return deleted;
    } catch (error) {
      logger.error('cleanupExpiredSessions top-level failure', {
        context: 'GameSessionRegistryScheduler',
        error
      });
      return 0;
    }
  }
};

const DEFAULT_CLEANUP_INTERVAL_MS = 60_000; // 1 minute baseline; override via env
const CLEANUP_ENABLED = process.env.GAMESESSION_CLEANUP_ENABLED !== 'false';

let cleanupIntervalHandle: NodeJS.Timeout | null = null;

export const GameSessionRegistryScheduler = {
  start(intervalMs = DEFAULT_CLEANUP_INTERVAL_MS) {
    if (cleanupIntervalHandle) {
      return cleanupIntervalHandle;
    }

    if (!CLEANUP_ENABLED) {
      logger.info('cleanup disabled via env', {
        context: 'GameSessionRegistryScheduler'
      });
      return null;
    }

    cleanupIntervalHandle = setInterval(async () => {
      try {
        const deleted = await GameSessionRegistry.cleanupExpiredSessions();
        if (deleted > 0) {
          logger.info('Pruned expired sessions', {
            context: 'GameSessionRegistryScheduler',
            deleted
          });
        }
      } catch (error) {
        logger.error('Failed to prune expired sessions', {
          context: 'GameSessionRegistryScheduler',
          error
        });
      }
    }, Math.max(intervalMs, 5_000));

    if (cleanupIntervalHandle.unref) {
      cleanupIntervalHandle.unref();
    }

    return cleanupIntervalHandle;
  },

  stop() {
    if (!cleanupIntervalHandle) {
      return;
    }

    clearInterval(cleanupIntervalHandle);
    cleanupIntervalHandle = null;
  }
};
