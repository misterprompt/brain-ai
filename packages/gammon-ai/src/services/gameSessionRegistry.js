"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSessionRegistryScheduler = exports.GameSessionRegistry = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
const gameSessionMetrics_1 = require("../metrics/gameSessionMetrics");
const logger_1 = require("../utils/logger");
const redisClient_1 = require("./redisClient");
const db = prisma_1.prisma;
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
const now = () => new Date();
// Defensive defaults in case config.session is unexpectedly undefined at runtime
const SESSION_TTL_SECONDS = config_1.config.session?.ttlSeconds ?? 30 * 60; // 30 minutes
const SESSION_TOKEN_SECRET = config_1.config.session?.tokenSecret ?? 'dev-session-secret';
const SESSION_REDIS_ENABLED = config_1.config.session?.redisReadThroughEnabled ?? false;
const SESSION_REDIS_NAMESPACE = config_1.config.session?.redisNamespace ?? 'gsr';
const DEFAULT_REPLAY_LIMIT = config_1.config.session?.replayRetention ?? 50;
const CACHE_OPERATIONS = {
    sessionByGameUser: 'session_by_game_user',
    sessionById: 'session_by_id',
    sessionSnapshot: 'session_snapshot',
    replayAppend: 'replay_append',
    replayHydrate: 'replay_hydrate',
    replayPrune: 'replay_prune',
    replayFetch: 'replay_fetch'
};
const recordCacheHit = (operation) => {
    gameSessionMetrics_1.gameSessionCacheHitsTotal.labels(operation).inc();
};
const recordCacheMiss = (operation) => {
    gameSessionMetrics_1.gameSessionCacheMissesTotal.labels(operation).inc();
};
const recordCacheError = (operation) => {
    gameSessionMetrics_1.gameSessionCacheErrorsTotal.labels(operation).inc();
};
const serializeEvent = (event) => JSON.stringify({
    id: event.id,
    gameId: event.gameId,
    sequence: event.sequence,
    type: event.type,
    payload: event.payload,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt
});
async function appendReplayEventToCache(event) {
    if (!SESSION_REDIS_ENABLED) {
        return;
    }
    const client = (0, redisClient_1.getRedisClient)();
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
    }
    catch (error) {
        recordCacheError(CACHE_OPERATIONS.replayAppend);
        logger_1.logger.warn('Failed to append event to replay cache', {
            context: 'GameSessionRegistryRedis',
            gameId: event.gameId,
            sequence: event.sequence,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
async function replaceReplayCache(gameId, events) {
    if (!SESSION_REDIS_ENABLED) {
        return;
    }
    const client = (0, redisClient_1.getRedisClient)();
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
    }
    catch (error) {
        recordCacheError(CACHE_OPERATIONS.replayHydrate);
        logger_1.logger.warn('Failed to hydrate replay cache', {
            context: 'GameSessionRegistryRedis',
            gameId,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
async function pruneReplayCache(gameId, minimumSequence) {
    if (!SESSION_REDIS_ENABLED) {
        return;
    }
    const client = (0, redisClient_1.getRedisClient)();
    if (!client) {
        return;
    }
    try {
        const rawEvents = await client.lrange(replayCacheKey(gameId), 0, -1);
        if (rawEvents.length === 0) {
            return;
        }
        const filtered = [];
        for (const entry of rawEvents) {
            try {
                const event = mapEvent(JSON.parse(entry));
                if (event.sequence > minimumSequence) {
                    filtered.push(event);
                }
            }
            catch {
                continue;
            }
        }
        const remaining = filtered.slice(-DEFAULT_REPLAY_LIMIT);
        await replaceReplayCache(gameId, remaining);
        recordCacheHit(CACHE_OPERATIONS.replayPrune);
    }
    catch (error) {
        recordCacheError(CACHE_OPERATIONS.replayPrune);
        logger_1.logger.warn('Failed to prune replay cache', {
            context: 'GameSessionRegistryRedis',
            gameId,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
async function readReplayEventsFromCache(gameId) {
    if (!SESSION_REDIS_ENABLED) {
        return { status: 'unavailable' };
    }
    const client = (0, redisClient_1.getRedisClient)();
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
            }
            catch {
                return null;
            }
        })
            .filter((event) => Boolean(event));
        recordCacheHit(CACHE_OPERATIONS.replayFetch);
        return { status: 'hit', events };
    }
    catch (error) {
        recordCacheError(CACHE_OPERATIONS.replayFetch);
        logger_1.logger.warn('Failed to read replay events from cache', {
            context: 'GameSessionRegistryRedis',
            gameId,
            error: error instanceof Error ? error.message : String(error)
        });
        return { status: 'error' };
    }
}
const toJsonValue = (value) => typeof value === 'undefined' ? undefined : value;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const asRecord = (value) => (isRecord(value) ? value : {});
const extractMetadata = (value) => isRecord(value) ? value : undefined;
const getDate = (value) => {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};
const getString = (value, fallback = '') => typeof value === 'string' && value.length > 0 ? value : fallback;
const getNumber = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const mapSession = (session) => {
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
    };
};
const mapEvent = (event) => {
    const record = asRecord(event);
    return {
        id: getString(record.id),
        gameId: getString(record.gameId),
        sequence: getNumber(record.sequence),
        type: getString(record.type, 'unknown'),
        payload: asRecord(record.payload),
        createdAt: getDate(record.createdAt) ?? now()
    };
};
async function measureDbCall(operation, task) {
    const endTimer = gameSessionMetrics_1.gameSessionDbDurationSeconds.startTimer({ operation });
    try {
        const result = await task();
        endTimer({ status: 'success' });
        return result;
    }
    catch (error) {
        endTimer({ status: 'error' });
        gameSessionMetrics_1.gameSessionDbErrorsTotal.labels(operation).inc();
        throw error;
    }
}
const sessionCacheKey = (gameId, userId) => `${SESSION_REDIS_NAMESPACE}:session:${gameId}:${userId}`;
const sessionCacheIdKey = (sessionId) => `${SESSION_REDIS_NAMESPACE}:sessionId:${sessionId}`;
const replayCacheKey = (gameId) => `${SESSION_REDIS_NAMESPACE}:events:${gameId}`;
async function cacheSessionSnapshot(session) {
    if (!SESSION_REDIS_ENABLED) {
        return;
    }
    const client = (0, redisClient_1.getRedisClient)();
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
    }
    catch (error) {
        recordCacheError(CACHE_OPERATIONS.sessionSnapshot);
        logger_1.logger.warn('Failed to cache session snapshot', {
            context: 'GameSessionRegistryRedis',
            gameId: session.gameId,
            userId: session.userId,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
async function readSessionFromCacheByGameUser(gameId, userId) {
    if (!SESSION_REDIS_ENABLED) {
        return null;
    }
    const client = (0, redisClient_1.getRedisClient)();
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
    }
    catch (error) {
        recordCacheError(CACHE_OPERATIONS.sessionByGameUser);
        logger_1.logger.warn('Failed to read session from cache', {
            context: 'GameSessionRegistryRedis',
            gameId,
            userId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
async function readSessionFromCacheById(sessionId) {
    if (!SESSION_REDIS_ENABLED) {
        return null;
    }
    const client = (0, redisClient_1.getRedisClient)();
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
    }
    catch (error) {
        recordCacheError(CACHE_OPERATIONS.sessionById);
        logger_1.logger.warn('Failed to read session by id from cache', {
            context: 'GameSessionRegistryRedis',
            sessionId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
async function upsertSession(gameId, userId, update, create) {
    return measureDbCall('upsert_session', () => db.gameSession.upsert({
        where: { gameId_userId: { gameId, userId } },
        update,
        create
    }));
}
exports.GameSessionRegistry = {
    async issueSession(gameId, userId, options = {}) {
        const cached = await readSessionFromCacheByGameUser(gameId, userId);
        const existingRaw = cached
            ? null
            : await measureDbCall('find_session_by_game_user', () => db.gameSession.findUnique({
                where: { gameId_userId: { gameId, userId } }
            }));
        const existing = cached ?? (existingRaw ? mapSession(existingRaw) : null);
        const sessionId = existing?.id ?? crypto_1.default.randomUUID();
        const issuedAt = now();
        const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000);
        const payload = {
            sid: sessionId,
            gid: gameId,
            uid: userId,
            iat: Math.floor(issuedAt.getTime() / 1000),
            exp: Math.floor(expiresAt.getTime() / 1000)
        };
        const token = jsonwebtoken_1.default.sign(payload, SESSION_TOKEN_SECRET, {
            expiresIn: SESSION_TTL_SECONDS
        });
        const resumeTokenHash = hashToken(token);
        const metadata = options.metadata ?? existing?.metadata ?? undefined;
        const lastAckSequence = options.lastAckSequence ?? existing?.lastAckSequence ?? 0;
        const session = await upsertSession(gameId, userId, {
            resumeTokenHash,
            lastAckSequence,
            lastHeartbeatAt: issuedAt,
            issuedAt,
            expiresAt,
            metadata: toJsonValue(metadata)
        }, {
            id: sessionId,
            gameId,
            userId,
            resumeTokenHash,
            lastAckSequence,
            lastHeartbeatAt: issuedAt,
            issuedAt,
            expiresAt,
            metadata: toJsonValue(metadata)
        });
        const normalized = mapSession(session);
        await cacheSessionSnapshot(normalized);
        return { token, session: normalized };
    },
    async validateToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, SESSION_TOKEN_SECRET);
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
            return { session, payload, token };
        }
        catch {
            return null;
        }
    },
    async acknowledge(sessionId, sequence) {
        await measureDbCall('acknowledge_session', () => db.gameSession.update({
            where: { id: sessionId },
            data: {
                lastAckSequence: {
                    set: sequence
                }
            }
        }));
    },
    async getMinimumAckSequence(gameId) {
        const aggregateResult = await measureDbCall('min_ack_sequence', () => db.gameSession.aggregate({
            where: { gameId },
            _min: { lastAckSequence: true }
        }));
        const resultRecord = asRecord(aggregateResult);
        const minRecord = asRecord(resultRecord._min);
        const value = minRecord.lastAckSequence;
        return typeof value === 'number' ? value : null;
    },
    async updateHeartbeat(sessionId) {
        await measureDbCall('update_heartbeat', () => db.gameSession.update({
            where: { id: sessionId },
            data: { lastHeartbeatAt: now() }
        }));
    },
    async revoke(sessionId) {
        await measureDbCall('revoke_session', () => db.gameSession.delete({ where: { id: sessionId } })).catch(() => undefined);
    },
    async recordEvent({ gameId, type, payload }) {
        const createdEvent = (await measureDbCall('record_event', () => db.$transaction(async (tx) => {
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
        })));
        const normalized = mapEvent(createdEvent);
        await appendReplayEventToCache(normalized);
        return normalized.sequence;
    },
    async fetchEventsSince(gameId, afterSequence, limit = DEFAULT_REPLAY_LIMIT) {
        const cached = await readReplayEventsFromCache(gameId);
        if (Array.isArray(cached)) {
            const filtered = cached.filter((event) => event.sequence > afterSequence).slice(0, limit);
            const cacheExhausted = cached.length < DEFAULT_REPLAY_LIMIT || filtered.length >= limit;
            if (cacheExhausted) {
                return filtered;
            }
        }
        const events = (await measureDbCall('fetch_events_since', () => db.gameEvent.findMany({
            where: {
                gameId,
                sequence: {
                    gt: afterSequence
                }
            },
            orderBy: { sequence: 'asc' },
            take: limit
        })));
        const normalized = events.map(mapEvent);
        await replaceReplayCache(gameId, normalized.slice(-DEFAULT_REPLAY_LIMIT));
        return normalized;
    },
    async purgeEventsThrough(gameId, sequence) {
        const result = (await measureDbCall('purge_events_through', () => db.gameEvent.deleteMany({
            where: {
                gameId,
                sequence: {
                    lte: sequence
                }
            }
        })));
        await pruneReplayCache(gameId, sequence);
        return getNumber(result.count, 0);
    },
    async cleanupExpiredSessions() {
        try {
            const rows = (await measureDbCall('find_expired_sessions', () => db.gameSession.findMany({
                where: {
                    expiresAt: {
                        lt: now()
                    }
                },
                select: {
                    id: true
                }
            })));
            if (!Array.isArray(rows)) {
                logger_1.logger.warn('cleanupExpiredSessions: unexpected non-array result', {
                    context: 'GameSessionRegistryScheduler',
                    rows
                });
                return 0;
            }
            let deleted = 0;
            for (const row of rows) {
                if (!row || typeof row !== 'object') {
                    logger_1.logger.warn('Skipping invalid row during cleanup', {
                        context: 'GameSessionRegistryScheduler',
                        row
                    });
                    continue;
                }
                const sessionId = typeof row.id === 'string' ? row.id : null;
                if (!sessionId) {
                    logger_1.logger.warn('Skipping row with missing session id', {
                        context: 'GameSessionRegistryScheduler',
                        row
                    });
                    continue;
                }
                try {
                    await measureDbCall('delete_expired_session', () => db.gameSession.delete({
                        where: { id: sessionId }
                    }));
                    deleted += 1;
                }
                catch (innerError) {
                    logger_1.logger.error('Error cleaning expired session', {
                        context: 'GameSessionRegistryScheduler',
                        sessionId,
                        error: innerError
                    });
                }
            }
            return deleted;
        }
        catch (error) {
            logger_1.logger.error('cleanupExpiredSessions top-level failure', {
                context: 'GameSessionRegistryScheduler',
                error
            });
            return 0;
        }
    }
};
const DEFAULT_CLEANUP_INTERVAL_MS = 60_000; // 1 minute baseline; override via env
const CLEANUP_ENABLED = process.env.GAMESESSION_CLEANUP_ENABLED !== 'false';
let cleanupIntervalHandle = null;
exports.GameSessionRegistryScheduler = {
    start(intervalMs = DEFAULT_CLEANUP_INTERVAL_MS) {
        if (cleanupIntervalHandle) {
            return cleanupIntervalHandle;
        }
        if (!CLEANUP_ENABLED) {
            logger_1.logger.info('cleanup disabled via env', {
                context: 'GameSessionRegistryScheduler'
            });
            return null;
        }
        cleanupIntervalHandle = setInterval(async () => {
            try {
                const deleted = await exports.GameSessionRegistry.cleanupExpiredSessions();
                if (deleted > 0) {
                    logger_1.logger.info('Pruned expired sessions', {
                        context: 'GameSessionRegistryScheduler',
                        deleted
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Failed to prune expired sessions', {
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
//# sourceMappingURL=gameSessionRegistry.js.map