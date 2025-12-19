import { Registry, Gauge, Counter, Histogram } from 'prom-client';
export declare const metricsRegistry: Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const activeGames: Gauge<string>;
export declare const moveTimeHistogram: Histogram<string>;
export declare const coachCallsTotal: Counter<string>;
export declare const tournamentRounds: Gauge<"tournament_id">;
//# sourceMappingURL=registry.d.ts.map