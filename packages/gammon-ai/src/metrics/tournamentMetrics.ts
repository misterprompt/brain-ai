import { Counter } from 'prom-client';
import { metricsRegistry } from './registry';

export const tournamentParticipantsTotal = new Counter({
  name: 'tournament_participants_total',
  help: 'Total tournament participant events',
  labelNames: ['action'] as const,
  registers: [metricsRegistry]
});

export const tournamentsStartedTotal = new Counter({
  name: 'tournaments_started_total',
  help: 'Total tournaments started',
  registers: [metricsRegistry]
});

export const tournamentMatchesTotal = new Counter({
  name: 'tournament_matches_total',
  help: 'Total tournament match lifecycle events',
  labelNames: ['event'] as const,
  registers: [metricsRegistry]
});
