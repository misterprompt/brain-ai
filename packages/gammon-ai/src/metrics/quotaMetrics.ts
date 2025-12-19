// src/metrics/quotaMetrics.ts
import { Counter } from 'prom-client';
import { metricsRegistry } from './registry';

export const quotaConsumptionTotal = new Counter({
  name: 'gnubg_quota_consumption_total',
  help: 'Total number of GNUBG quota consumption events',
  labelNames: ['plan', 'source'] as const,
  registers: [metricsRegistry]
});

export const quotaExhaustedTotal = new Counter({
  name: 'gnubg_quota_exhausted_total',
  help: 'Total number of GNUBG quota exhaustion events',
  labelNames: ['plan'] as const,
  registers: [metricsRegistry]
});
