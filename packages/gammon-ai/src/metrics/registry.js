"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentRounds = exports.coachCallsTotal = exports.moveTimeHistogram = exports.activeGames = exports.metricsRegistry = void 0;
const prom_client_1 = require("prom-client");
exports.metricsRegistry = new prom_client_1.Registry();
exports.metricsRegistry.setDefaultLabels({
    service: 'gammon-guru-backend'
});
(0, prom_client_1.collectDefaultMetrics)({
    register: exports.metricsRegistry
});
exports.activeGames = new prom_client_1.Gauge({
    name: 'active_games',
    help: 'Number of currently active games',
    registers: [exports.metricsRegistry]
});
exports.moveTimeHistogram = new prom_client_1.Histogram({
    name: 'move_time_seconds',
    help: 'Time taken to process a move',
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [exports.metricsRegistry]
});
exports.coachCallsTotal = new prom_client_1.Counter({
    name: 'coach_calls_total',
    help: 'Total number of calls to the Coach API',
    registers: [exports.metricsRegistry]
});
exports.tournamentRounds = new prom_client_1.Gauge({
    name: 'tournament_rounds',
    help: 'Current round number of active tournaments',
    labelNames: ['tournament_id'],
    registers: [exports.metricsRegistry]
});
//# sourceMappingURL=registry.js.map