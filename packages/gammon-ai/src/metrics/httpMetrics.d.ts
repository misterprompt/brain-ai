import { Counter, Histogram } from 'prom-client';
export declare const httpRequestsTotal: Counter<"route" | "method" | "status">;
export declare const httpRequestDurationSeconds: Histogram<"route" | "method" | "status">;
//# sourceMappingURL=httpMetrics.d.ts.map