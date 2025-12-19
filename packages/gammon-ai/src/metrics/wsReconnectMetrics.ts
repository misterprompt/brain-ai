import { Counter, Gauge } from 'prom-client';
import { metricsRegistry } from './registry';

export const wsResumeAttemptsTotal = new Counter({
  name: 'ws_resume_attempts_total',
  help: 'Count of WebSocket resume attempts segmented by outcome',
  labelNames: ['outcome'] as const,
  registers: [metricsRegistry]
});

export const wsResumeInvalidTokenTotal = new Counter({
  name: 'ws_resume_invalid_token_total',
  help: 'Count of WebSocket resume attempts rejected due to invalid or mismatched tokens',
  registers: [metricsRegistry]
});

export const wsReplayBacklogGauge = new Gauge({
  name: 'ws_replay_backlog_size',
  help: 'Current number of pending replay events for a reconnecting session',
  labelNames: ['gameId'] as const,
  registers: [metricsRegistry]
});
