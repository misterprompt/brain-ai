"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaExhaustedTotal = exports.quotaConsumptionTotal = void 0;
// src/metrics/quotaMetrics.ts
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
exports.quotaConsumptionTotal = new prom_client_1.Counter({
    name: 'gnubg_quota_consumption_total',
    help: 'Total number of GNUBG quota consumption events',
    labelNames: ['plan', 'source'],
    registers: [registry_1.metricsRegistry]
});
exports.quotaExhaustedTotal = new prom_client_1.Counter({
    name: 'gnubg_quota_exhausted_total',
    help: 'Total number of GNUBG quota exhaustion events',
    labelNames: ['plan'],
    registers: [registry_1.metricsRegistry]
});
//# sourceMappingURL=quotaMetrics.js.map