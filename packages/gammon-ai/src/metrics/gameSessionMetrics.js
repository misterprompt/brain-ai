"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameSessionCacheErrorsTotal = exports.gameSessionCacheMissesTotal = exports.gameSessionCacheHitsTotal = exports.gameSessionDbErrorsTotal = exports.gameSessionDbDurationSeconds = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
exports.gameSessionDbDurationSeconds = new prom_client_1.Histogram({
    name: 'game_session_db_duration_seconds',
    help: 'Duration of GameSessionRegistry database operations',
    labelNames: ['operation', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry_1.metricsRegistry]
});
exports.gameSessionDbErrorsTotal = new prom_client_1.Counter({
    name: 'game_session_db_errors_total',
    help: 'Total number of GameSessionRegistry database errors',
    labelNames: ['operation'],
    registers: [registry_1.metricsRegistry]
});
exports.gameSessionCacheHitsTotal = new prom_client_1.Counter({
    name: 'game_session_cache_hits_total',
    help: 'Total number of GameSessionRegistry cache hits',
    labelNames: ['operation'],
    registers: [registry_1.metricsRegistry]
});
exports.gameSessionCacheMissesTotal = new prom_client_1.Counter({
    name: 'game_session_cache_misses_total',
    help: 'Total number of GameSessionRegistry cache misses',
    labelNames: ['operation'],
    registers: [registry_1.metricsRegistry]
});
exports.gameSessionCacheErrorsTotal = new prom_client_1.Counter({
    name: 'game_session_cache_errors_total',
    help: 'Total number of GameSessionRegistry cache errors',
    labelNames: ['operation'],
    registers: [registry_1.metricsRegistry]
});
//# sourceMappingURL=gameSessionMetrics.js.map