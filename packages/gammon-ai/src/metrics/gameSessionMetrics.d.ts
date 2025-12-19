import { Counter, Histogram } from 'prom-client';
export declare const gameSessionDbDurationSeconds: Histogram<"status" | "operation">;
export declare const gameSessionDbErrorsTotal: Counter<"operation">;
export declare const gameSessionCacheHitsTotal: Counter<"operation">;
export declare const gameSessionCacheMissesTotal: Counter<"operation">;
export declare const gameSessionCacheErrorsTotal: Counter<"operation">;
//# sourceMappingURL=gameSessionMetrics.d.ts.map