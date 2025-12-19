"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentMatchesTotal = exports.tournamentsStartedTotal = exports.tournamentParticipantsTotal = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
exports.tournamentParticipantsTotal = new prom_client_1.Counter({
    name: 'tournament_participants_total',
    help: 'Total tournament participant events',
    labelNames: ['action'],
    registers: [registry_1.metricsRegistry]
});
exports.tournamentsStartedTotal = new prom_client_1.Counter({
    name: 'tournaments_started_total',
    help: 'Total tournaments started',
    registers: [registry_1.metricsRegistry]
});
exports.tournamentMatchesTotal = new prom_client_1.Counter({
    name: 'tournament_matches_total',
    help: 'Total tournament match lifecycle events',
    labelNames: ['event'],
    registers: [registry_1.metricsRegistry]
});
//# sourceMappingURL=tournamentMetrics.js.map