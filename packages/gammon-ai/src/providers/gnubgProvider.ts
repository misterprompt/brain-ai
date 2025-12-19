// src/providers/gnubgProvider.ts
import { setTimeout as defaultSleep } from 'node:timers/promises';
import { z } from 'zod';
import type { EvaluationResult, SuggestedMove } from '../types/ai';
import type { Move } from '../types/game';
import type { AIProvider, AnalyzeInput } from '../services/aiService';
import { Logger } from '../utils/logger';

const moveSchema = z.object({
  from: z.number(),
  to: z.number(),
  player: z.enum(['white', 'black']),
  diceUsed: z.number()
});

const analyzeResponseSchema = z.object({
  bestMove: moveSchema.nullable(),
  equity: z.number(),
  explanation: z.string().optional()
});

const evaluateResponseSchema = z.object({
  equity: z.number(),
  pr: z.number(),
  winrate: z.number(),
  explanation: z.string().optional()
});

const analyzeGameResponseSchema = z.object({
  totalError: z.number(),
  errorRate: z.number(),
  criticalMoves: z.number(),
  avgErrorPerMove: z.number().optional()
});

type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
type EvaluateResponse = z.infer<typeof evaluateResponseSchema>;
type AnalyzeGameResponse = z.infer<typeof analyzeGameResponseSchema>;

type SleepFn = (ms: number) => Promise<void>;

interface RequestOptions<TResponse, TMapped> {
  path: string;
  payload: unknown;
  schema: z.ZodType<TResponse>;
  map: (raw: TResponse) => TMapped;
}

export interface GNUBGProviderOptions {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerCooldownMs?: number;
  fetchImpl?: typeof fetch;
  sleepFn?: SleepFn;
  logger?: Logger;
}

export class GNUBGProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly circuitThreshold: number;
  private readonly circuitCooldownMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: SleepFn;
  private readonly logger: Logger;

  private failureCount = 0;
  private circuitOpenUntil: number | null = null;

  constructor(options: GNUBGProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.GNUBG_SERVICE_URL ?? 'https://gnubg-service.gammonguru.com';
    this.timeoutMs = options.timeoutMs ?? Number(process.env.GNUBG_TIMEOUT_MS ?? 8000);
    this.maxRetries = options.maxRetries ?? Number(process.env.GNUBG_MAX_RETRIES ?? 2);
    this.circuitThreshold = options.circuitBreakerThreshold ?? Number(process.env.GNUBG_CIRCUIT_THRESHOLD ?? 3);
    this.circuitCooldownMs = options.circuitBreakerCooldownMs ?? Number(process.env.GNUBG_CIRCUIT_COOLDOWN_MS ?? 60_000);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleepFn ?? defaultSleep;
    this.logger = options.logger ?? new Logger('GNUBGProvider');
  }

  private readonly cache = new Map<string, { value: any; timestamp: number }>();
  private readonly CACHE_SIZE = 10000;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private getCacheKey(path: string, payload: any): string {
    return `${path}:${JSON.stringify(payload)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  private setCache(key: string, value: any) {
    if (this.cache.size >= this.CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  async getBestMove(input: AnalyzeInput): Promise<SuggestedMove> {
    const payload = this.buildAnalyzePayload(input);
    const cacheKey = this.getCacheKey('/analyze', payload);
    const cached = this.getFromCache<SuggestedMove>(cacheKey);
    if (cached) return cached;

    const result = await this.executeRequest<AnalyzeResponse, SuggestedMove>({
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

  async evaluatePosition(input: AnalyzeInput): Promise<EvaluationResult> {
    const payload = this.buildAnalyzePayload(input);
    const cacheKey = this.getCacheKey('/evaluate', payload);
    const cached = this.getFromCache<EvaluationResult>(cacheKey);
    if (cached) return cached;

    const result = await this.executeRequest<EvaluateResponse, EvaluationResult>({
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

  async analyzeGame(moves: Move[]): Promise<AnalyzeGameResponse> {
    return this.executeRequest<AnalyzeGameResponse, AnalyzeGameResponse>({
      path: '/analyze-game',
      payload: { moves },
      schema: analyzeGameResponseSchema,
      map: (raw) => raw
    });
  }

  get isCircuitOpen(): boolean {
    return Boolean(this.circuitOpenUntil && Date.now() < this.circuitOpenUntil);
  }

  private buildAnalyzePayload(input: AnalyzeInput) {
    return {
      board: input.boardState,
      dice: input.dice,
      move: input.move ?? null,
      gameId: input.gameId ?? null,
      userId: input.userId ?? null
    };
  }

  private ensureCircuitClosed() {
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

  private handleFailure(error: unknown) {
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

  private handleSuccess() {
    if (this.failureCount > 0) {
      this.logger.info('GNUBG request succeeded, resetting failure count');
    }
    this.failureCount = 0;
    this.circuitOpenUntil = null;
  }

  private computeBackoff(attempt: number) {
    return 500 * Math.pow(2, attempt);
  }

  private async executeRequest<TResponse, TMapped>({ path, payload, schema, map }: RequestOptions<TResponse, TMapped>) {
    this.ensureCircuitClosed();

    let attempt = 0;
    let lastError: unknown;

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
      } catch (error) {
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
