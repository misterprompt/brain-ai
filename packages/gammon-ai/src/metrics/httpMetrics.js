"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestDurationSeconds = exports.httpRequestsTotal = void 0;
// src/metrics/httpMetrics.ts
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
exports.httpRequestsTotal = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status'],
    registers: [registry_1.metricsRegistry]
});
exports.httpRequestDurationSeconds = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
    registers: [registry_1.metricsRegistry]
});
//# sourceMappingURL=httpMetrics.js.map