"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processResignation = processResignation;
const matchEngine_1 = require("./rules/matchEngine");
const resignationService_1 = require("./rules/resignationService");
const prisma_1 = require("../lib/prisma");
function buildRules(json) {
    const defaults = (0, matchEngine_1.createDefaultRules)();
    if (typeof json !== 'object' || json === null) {
        return defaults;
    }
    const candidate = json;
    return {
        crawford: typeof candidate.crawford === 'boolean' ? candidate.crawford : defaults.crawford,
        jacoby: typeof candidate.jacoby === 'boolean' ? candidate.jacoby : defaults.jacoby,
        beaver: typeof candidate.beaver === 'boolean' ? candidate.beaver : defaults.beaver,
        raccoon: typeof candidate.raccoon === 'boolean' ? candidate.raccoon : defaults.raccoon
    };
}
function buildMatchRecord(match, rules) {
    return {
        id: match.id,
        gameId: match.gameId,
        length: match.length,
        rules,
        state: match.state,
        crawfordUsed: match.crawfordUsed,
        cubeHistory: match.cubeHistory
    };
}
async function processResignation(request) {
    const { gameId, userId, resignationType } = request;
    return prisma_1.prisma.$transaction(async (tx) => {
        const client = tx;
        const game = (await client.games.findUnique({ where: { id: gameId } }));
        if (!game) {
            throw new Error('Game not found');
        }
        if (game.status !== 'PLAYING') {
            throw new Error('Game is not active');
        }
        const isWhite = game.whitePlayerId === userId;
        const isBlack = game.blackPlayerId === userId;
        if (!isWhite && !isBlack) {
            throw new Error('Player is not part of this game');
        }
        const resigningPlayer = isWhite ? 'white' : 'black';
        const match = (await client.matches.findUnique({ where: { gameId } }));
        const rules = match ? buildRules(match.rules) : (0, matchEngine_1.createDefaultRules)();
        const matchRecord = match ? buildMatchRecord(match, rules) : null;
        const resignationResult = (0, resignationService_1.resolveResignation)({
            game: game,
            match: matchRecord,
            rules,
            resigningPlayer,
            resignationType: resignationType
        });
        await client.games.update({
            where: { id: gameId },
            data: {
                status: resignationResult.game.status,
                whiteScore: resignationResult.game.whiteScore,
                blackScore: resignationResult.game.blackScore,
                winner: resignationResult.game.winner,
                finishedAt: resignationResult.game.finishedAt,
                resignationType: resignationResult.resignationType
            }
        });
        if (resignationResult.match && match) {
            await client.matches.update({
                where: { id: match.id },
                data: {
                    state: resignationResult.match.state,
                    crawfordUsed: resignationResult.match.crawfordUsed
                }
            });
        }
        return {
            gameId,
            winner: resignationResult.winner,
            resignationType: resignationResult.resignationType,
            pointsAwarded: resignationResult.pointsAwarded,
            finished: resignationResult.finished,
            whiteScore: resignationResult.game.whiteScore,
            blackScore: resignationResult.game.blackScore,
            matchState: resignationResult.match?.state ?? null,
            crawfordUsed: resignationResult.match?.crawfordUsed ?? null
        };
    });
}
//# sourceMappingURL=resignationService.js.map