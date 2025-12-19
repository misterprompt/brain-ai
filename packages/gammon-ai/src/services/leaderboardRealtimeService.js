"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEloLeaderboardUpdates = publishEloLeaderboardUpdates;
const logger_1 = require("../utils/logger");
const leaderboardService_1 = require("./leaderboardService");
const server_1 = require("../websocket/server");
const DEFAULT_SORTS = ['elo', 'winrate', 'games'];
const mapEntries = (entries) => entries.map((entry) => {
    const mapped = {
        id: entry.id,
        username: entry.username,
        country: entry.country,
        elo: entry.elo,
        winrate: entry.winrate,
        gamesPlayed: entry.gamesPlayed,
        rankGlobal: entry.rankGlobal ?? null,
        rankCountry: entry.rankCountry ?? null
    };
    if (typeof entry.gamesWon === 'number') {
        mapped.gamesWon = entry.gamesWon;
    }
    return mapped;
});
async function emitForScope(scope) {
    try {
        const channel = (0, leaderboardService_1.deriveLeaderboardChannel)(scope);
        const timestamp = new Date().toISOString();
        let result;
        if (scope.type === 'global') {
            result = await (0, leaderboardService_1.getGlobalLeaderboard)({ sort: scope.sort });
        }
        else if (scope.type === 'country') {
            result = await (0, leaderboardService_1.getCountryLeaderboard)(scope.country, { sort: scope.sort });
        }
        else {
            result = await (0, leaderboardService_1.getSeasonLeaderboard)(scope.seasonId, { sort: scope.sort });
        }
        const payload = {
            scope,
            timestamp,
            entries: mapEntries(result.data),
            total: result.meta.total
        };
        (0, server_1.broadcastLeaderboardUpdate)(channel, payload);
    }
    catch (error) {
        logger_1.logger.error('Failed to broadcast leaderboard update', { scope, error });
    }
}
async function publishEloLeaderboardUpdates(result) {
    const scopes = [];
    for (const sort of DEFAULT_SORTS) {
        scopes.push({ type: 'global', sort });
    }
    if (result.scope.type === 'global+season' && result.scope.seasonId) {
        for (const sort of DEFAULT_SORTS) {
            scopes.push({ type: 'season', seasonId: result.scope.seasonId, sort });
        }
    }
    for (const scope of scopes) {
        await emitForScope(scope);
    }
}
//# sourceMappingURL=leaderboardRealtimeService.js.map