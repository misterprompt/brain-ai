"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GNUBGProvider = void 0;
// src/providers/gnubgProvider.ts
const promises_1 = require("node:timers/promises");
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const moveSchema = zod_1.z.object({
    from: zod_1.z.number(),
    to: zod_1.z.number(),
    player: zod_1.z.enum(['white', 'black']),
    diceUsed: zod_1.z.number()
});
const analyzeResponseSchema = zod_1.z.object({
    bestMove: moveSchema.nullable(),
    equity: zod_1.z.number(),
    explanation: zod_1.z.string().optional()
});
const evaluateResponseSchema = zod_1.z.object({
    equity: zod_1.z.number(),
    pr: zod_1.z.number(),
    winrate: zod_1.z.number(),
    explanation: zod_1.z.string().optional()
});
const analyzeGameResponseSchema = zod_1.z.object({
    totalError: zod_1.z.number(),
    errorRate: zod_1.z.number(),
    criticalMoves: zod_1.z.number(),
    avgErrorPerMove: zod_1.z.number().optional()
});
class GNUBGProvider {
    baseUrl;
    timeoutMs;
    maxRetries;
    circuitThreshold;
    circuitCooldownMs;
    fetchImpl;
    sleep;
    logger;
    failureCount = 0;
    circuitOpenUntil = null;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl ?? process.env.GNUBG_SERVICE_URL ?? 'https://gnubg-service.gammonguru.com';
        this.timeoutMs = options.timeoutMs ?? Number(process.env.GNUBG_TIMEOUT_MS ?? 8000);
        this.maxRetries = options.maxRetries ?? Number(process.env.GNUBG_MAX_RETRIES ?? 2);
        this.circuitThreshold = options.circuitBreakerThreshold ?? Number(process.env.GNUBG_CIRCUIT_THRESHOLD ?? 3);
        this.circuitCooldownMs = options.circuitBreakerCooldownMs ?? Number(process.env.GNUBG_CIRCUIT_COOLDOWN_MS ?? 60_000);
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.sleep = options.sleepFn ?? promises_1.setTimeout;
        this.logger = options.logger ?? new logger_1.Logger('GNUBGProvider');
    }
    cache = new Map();
    CACHE_SIZE = 10000;
    CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    getCacheKey(path, payload) {
        return `${path}:${JSON.stringify(payload)}`;
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }
        // Move to end (LRU)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    setCache(key, value) {
        if (this.cache.size >= this.CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey)
                this.cache.delete(firstKey);
        }
        this.cache.set(key, { value, timestamp: Date.now() });
    }
    async getBestMove(input) {
        const payload = this.buildAnalyzePayload(input);
        const cacheKey = this.getCacheKey('/analyze', payload);
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const result = await this.executeRequest({
            path: '/analyze',
            payload,
            schema: analyzeResponseSchema,
            map: (raw) => ({
                move: raw.bestMove,
                equity: raw.equity,
                explanation: raw.explanation ?? 'GNUBG did not provide an explanation.'
            })
        });
        this.setCache(cacheKey, result);
        return result;
    }
    async evaluatePosition(input) {
        const payload = this.buildAnalyzePayload(input);
        const cacheKey = this.getCacheKey('/evaluate', payload);
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const result = await this.executeRequest({
            path: '/evaluate',
            payload,
            schema: evaluateResponseSchema,
            map: (raw) => ({
                equity: raw.equity,
                pr: raw.pr,
                winrate: raw.winrate,
                explanation: raw.explanation ?? 'GNUBG did not provide an explanation.'
            })
        });
        this.setCache(cacheKey, result);
        return result;
    }
    async analyzeGame(moves) {
        return this.executeRequest({
            path: '/analyze-game',
            payload: { moves },
            schema: analyzeGameResponseSchema,
            map: (raw) => raw
        });
    }
    get isCircuitOpen() {
        return Boolean(this.circuitOpenUntil && Date.now() < this.circuitOpenUntil);
    }
    buildAnalyzePayload(input) {
        return {
            board: input.boardState,
            dice: input.dice,
            move: input.move ?? null,
            gameId: input.gameId ?? null,
            userId: input.userId ?? null
        };
    }
    ensureCircuitClosed() {
        if (this.circuitOpenUntil && Date.now() < this.circuitOpenUntil) {
            this.logger.warn('GNUBG circuit breaker is open', {
                retryAt: this.circuitOpenUntil
            });
            throw new Error('GNUBG provider temporarily unavailable (circuit open)');
        }
        if (this.circuitOpenUntil && Date.now() >= this.circuitOpenUntil) {
            this.logger.info('GNUBG circuit breaker reset');
            this.circuitOpenUntil = null;
            this.failureCount = 0;
        }
    }
    handleFailure(error) {
        this.failureCount += 1;
        this.logger.error('GNUBG request failed', error);
        if (this.failureCount >= this.circuitThreshold) {
            this.circuitOpenUntil = Date.now() + this.circuitCooldownMs;
            this.logger.warn('GNUBG circuit breaker opened', {
                cooldownMs: this.circuitCooldownMs,
                failureCount: this.failureCount
            });
        }
    }
    handleSuccess() {
        if (this.failureCount > 0) {
            this.logger.info('GNUBG request succeeded, resetting failure count');
        }
        this.failureCount = 0;
        this.circuitOpenUntil = null;
    }
    computeBackoff(attempt) {
        return 500 * Math.pow(2, attempt);
    }
    async executeRequest({ path, payload, schema, map }) {
        this.ensureCircuitClosed();
        let attempt = 0;
        let lastError;
        while (attempt <= this.maxRetries) {
            const controller = new AbortController();
            const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);
            const startedAt = Date.now();
            try {
                this.logger.info('GNUBG request started', { path, attempt });
                const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeoutHandle);
                if (!response.ok) {
                    const error = new Error(`GNUBG request failed: ${response.status} ${response.statusText}`);
                    throw error;
                }
                const raw = await response.json();
                const parsed = schema.parse(raw);
                const duration = Date.now() - startedAt;
                this.logger.info('GNUBG request succeeded', { path, attempt, duration });
                this.handleSuccess();
                return map(parsed);
            }
            catch (error) {
                clearTimeout(timeoutHandle);
                lastError = error;
                const duration = Date.now() - startedAt;
                this.logger.warn('GNUBG request failed', {
                    path,
                    attempt,
                    duration,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                this.handleFailure(error);
                if (attempt >= this.maxRetries) {
                    break;
                }
                const backoff = this.computeBackoff(attempt);
                this.logger.info('GNUBG retry scheduled', { path, attempt, backoff });
                await this.sleep(backoff);
                attempt += 1;
            }
        }
        throw lastError instanceof Error ? lastError : new Error('GNUBG request failed');
    }
}
exports.GNUBGProvider = GNUBGProvider;
//# sourceMappingURL=gnubgProvider.js.map