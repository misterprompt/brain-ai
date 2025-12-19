"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsReplayBacklogGauge = exports.wsResumeInvalidTokenTotal = exports.wsResumeAttemptsTotal = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
exports.wsResumeAttemptsTotal = new prom_client_1.Counter({
    name: 'ws_resume_attempts_total',
    help: 'Count of WebSocket resume attempts segmented by outcome',
    labelNames: ['outcome'],
    registers: [registry_1.metricsRegistry]
});
exports.wsResumeInvalidTokenTotal = new prom_client_1.Counter({
    name: 'ws_resume_invalid_token_total',
    help: 'Count of WebSocket resume attempts rejected due to invalid or mismatched tokens',
    registers: [registry_1.metricsRegistry]
});
exports.wsReplayBacklogGauge = new prom_client_1.Gauge({
    name: 'ws_replay_backlog_size',
    help: 'Current number of pending replay events for a reconnecting session',
    labelNames: ['gameId'],
    registers: [registry_1.metricsRegistry]
});
//# sourceMappingURL=wsReconnectMetrics.js.map