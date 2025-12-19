"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveResignation = resolveResignation;
const matchEngine_1 = require("./matchEngine");
const RESIGNATION_POINTS = {
    SINGLE: 1,
    GAMMON: 2,
    BACKGAMMON: 3
};
const PLAYER_ENUM_MAP = {
    white: 'WHITE',
    black: 'BLACK'
};
function normalizeGame(game) {
    return game;
}
function effectiveResignationType(context) {
    const { match, rules, game, resignationType } = context;
    if (!match && rules.jacoby) {
        const cubeAware = normalizeGame(game);
        const cubeLevel = cubeAware.cubeLevel ?? 1;
        const cubeOwner = cubeAware.cubeOwner ?? null;
        const cubeUnturned = cubeLevel === 1 && cubeOwner === null;
        if (cubeUnturned) {
            return 'SINGLE';
        }
    }
    return resignationType;
}
function validateContext(context) {
    const cubeAware = normalizeGame(context.game);
    if (cubeAware.status !== 'PLAYING') {
        throw new Error('Cannot resolve resignation when game is not active');
    }
    if (cubeAware.doublePending) {
        throw new Error('Cannot resolve resignation while a double is pending');
    }
}
function resolveResignation(context) {
    validateContext(context);
    const { game, match, resigningPlayer } = context;
    const cubeAware = normalizeGame(game);
    const winner = resigningPlayer === 'white' ? 'black' : 'white';
    const resolvedType = effectiveResignationType(context);
    const basePoints = RESIGNATION_POINTS[resolvedType] ?? 1;
    const cubeLevel = cubeAware.cubeLevel ?? 1;
    const pointsAwarded = basePoints * cubeLevel;
    const matchUpdate = (0, matchEngine_1.applyPointResult)(game, match, pointsAwarded, winner);
    const now = new Date();
    const updatedGame = {
        ...matchUpdate.game,
        status: 'FINISHED',
        winner: PLAYER_ENUM_MAP[winner],
        finishedAt: now,
        updatedAt: now
    };
    return {
        game: updatedGame,
        match: matchUpdate.match,
        finished: matchUpdate.finished,
        winner,
        resignationType: resolvedType,
        pointsAwarded
    };
}
//# sourceMappingURL=resignationService.js.map