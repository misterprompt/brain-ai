import { Counter, Histogram } from 'prom-client';
import { metricsRegistry } from './registry';

export const gameSessionDbDurationSeconds = new Histogram({
  name: 'game_session_db_duration_seconds',
  help: 'Duration of GameSessionRegistry database operations',
  labelNames: ['operation', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

export const gameSessionDbErrorsTotal = new Counter({
  name: 'game_session_db_errors_total',
  help: 'Total number of GameSessionRegistry database errors',
  labelNames: ['operation'] as const,
  registers: [metricsRegistry]
});

export const gameSessionCacheHitsTotal = new Counter({
  name: 'game_session_cache_hits_total',
  help: 'Total number of GameSessionRegistry cache hits',
  labelNames: ['operation'] as const,
  registers: [metricsRegistry]
});

export const gameSessionCacheMissesTotal = new Counter({
  name: 'game_session_cache_misses_total',
  help: 'Total number of GameSessionRegistry cache misses',
  labelNames: ['operation'] as const,
  registers: [metricsRegistry]
});

export const gameSessionCacheErrorsTotal = new Counter({
  name: 'game_session_cache_errors_total',
  help: 'Total number of GameSessionRegistry cache errors',
  labelNames: ['operation'] as const,
  registers: [metricsRegistry]
});
