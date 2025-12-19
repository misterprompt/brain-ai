"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EloService = void 0;
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
const db = prisma_1.prisma;
const roundRating = (value) => Math.max(0, Math.round(value));
const roundRatio = (value) => Number(value.toFixed(4));
const computeExpectedScore = (playerRating, opponentRating) => {
    const exponent = (opponentRating - playerRating) / 400;
    return 1 / (1 + 10 ** exponent);
};
const deriveSeasonWins = (stats) => {
    if (!stats) {
        return 0;
    }
    return stats.winrate * stats.gamesPlayed;
};
class EloService {
    static expectedScore(playerRating, opponentRating) {
        return computeExpectedScore(playerRating, opponentRating);
    }
    static async applyMatchResult(options) {
        const { winnerUserId, loserUserId } = options;
        if (!winnerUserId || !loserUserId) {
            throw new Error('Winner and loser user identifiers are required');
        }
        if (winnerUserId === loserUserId) {
            throw new Error('Winner and loser cannot be the same user');
        }
        const isDraw = options.isDraw === true;
        const seasonId = options.seasonId ?? null;
        const kFactor = config_1.config.elo?.kFactor ?? 32;
        const result = await db.$transaction(async (tx) => {
            const userSelect = {
                id: true,
                eloRating: true,
                gamesPlayed: true,
                gamesWon: true,
                winRate: true
            };
            if (seasonId) {
                userSelect.seasonStats = {
                    where: { seasonId },
                    select: {
                        gamesPlayed: true,
                        winrate: true,
                        elo: true
                    }
                };
            }
            const users = await tx.users.findMany({
                where: { id: { in: [winnerUserId, loserUserId] } },
                select: userSelect
            });
            const winner = users.find((user) => user.id === winnerUserId);
            const loser = users.find((user) => user.id === loserUserId);
            if (!winner || !loser) {
                throw new Error('Unable to locate users for ELO update');
            }
            const expectedWinner = computeExpectedScore(winner.eloRating, loser.eloRating);
            const expectedLoser = computeExpectedScore(loser.eloRating, winner.eloRating);
            const winnerActualScore = isDraw ? 0.5 : 1;
            const loserActualScore = isDraw ? 0.5 : 0;
            const winnerDelta = kFactor * (winnerActualScore - expectedWinner);
            const loserDelta = kFactor * (loserActualScore - expectedLoser);
            const updatedWinnerRating = roundRating(winner.eloRating + winnerDelta);
            const updatedLoserRating = roundRating(loser.eloRating + loserDelta);
            const winnerGamesPlayed = winner.gamesPlayed + 1;
            const loserGamesPlayed = loser.gamesPlayed + 1;
            const winnerWins = winner.gamesWon + (isDraw ? 0 : 1);
            const loserWins = loser.gamesWon + (isDraw ? 0 : 0);
            const winnerWinRate = winnerGamesPlayed === 0 ? 0 : roundRatio(winnerWins / winnerGamesPlayed);
            const loserWinRate = loserGamesPlayed === 0 ? 0 : roundRatio(loserWins / loserGamesPlayed);
            await tx.users.update({
                where: { id: winnerUserId },
                data: {
                    eloRating: updatedWinnerRating,
                    gamesPlayed: winnerGamesPlayed,
                    gamesWon: winnerWins,
                    winRate: winnerWinRate
                }
            });
            await tx.users.update({
                where: { id: loserUserId },
                data: {
                    eloRating: updatedLoserRating,
                    gamesPlayed: loserGamesPlayed,
                    gamesWon: loserWins,
                    winRate: loserWinRate
                }
            });
            if (seasonId) {
                const winnerSeasonStats = winner.seasonStats?.[0];
                const loserSeasonStats = loser.seasonStats?.[0];
                const winnerSeasonGamesPlayed = (winnerSeasonStats?.gamesPlayed ?? 0) + 1;
                const loserSeasonGamesPlayed = (loserSeasonStats?.gamesPlayed ?? 0) + 1;
                const winnerSeasonWins = deriveSeasonWins(winnerSeasonStats) + (isDraw ? 0.5 : 1);
                const loserSeasonWins = deriveSeasonWins(loserSeasonStats) + (isDraw ? 0.5 : 0);
                const winnerSeasonWinRate = winnerSeasonGamesPlayed === 0 ? 0 : roundRatio(winnerSeasonWins / winnerSeasonGamesPlayed);
                const loserSeasonWinRate = loserSeasonGamesPlayed === 0 ? 0 : roundRatio(loserSeasonWins / loserSeasonGamesPlayed);
                await tx.user_season_stats.upsert({
                    where: {
                        userId_seasonId: {
                            userId: winnerUserId,
                            seasonId
                        }
                    },
                    create: {
                        userId: winnerUserId,
                        seasonId,
                        elo: updatedWinnerRating,
                        winrate: winnerSeasonWinRate,
                        gamesPlayed: winnerSeasonGamesPlayed
                    },
                    update: {
                        elo: updatedWinnerRating,
                        winrate: winnerSeasonWinRate,
                        gamesPlayed: winnerSeasonGamesPlayed
                    }
                });
                await tx.user_season_stats.upsert({
                    where: {
                        userId_seasonId: {
                            userId: loserUserId,
                            seasonId
                        }
                    },
                    create: {
                        userId: loserUserId,
                        seasonId,
                        elo: updatedLoserRating,
                        winrate: loserSeasonWinRate,
                        gamesPlayed: loserSeasonGamesPlayed
                    },
                    update: {
                        elo: updatedLoserRating,
                        winrate: loserSeasonWinRate,
                        gamesPlayed: loserSeasonGamesPlayed
                    }
                });
            }
            return {
                winner: {
                    userId: winnerUserId,
                    rating: updatedWinnerRating
                },
                loser: {
                    userId: loserUserId,
                    rating: updatedLoserRating
                },
                scope: {
                    type: seasonId ? 'global+season' : 'global',
                    seasonId
                }
            };
        });
        return result;
    }
}
exports.EloService = EloService;
//# sourceMappingURL=eloService.js.map