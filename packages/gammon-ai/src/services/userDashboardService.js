"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDashboard = getUserDashboard;
const prisma_1 = require("../lib/prisma");
const aiService_1 = require("./aiService");
const subscriptionService_1 = require("./subscriptionService");
const asNumber = (value) => (typeof value === 'number' ? value : 0);
function deriveResult(game, userId) {
    if (!game) {
        return 'pending';
    }
    if (game.status !== 'COMPLETED' && game.status !== 'FINISHED') {
        return 'pending';
    }
    if (!game.winner) {
        return 'draw';
    }
    const userIsWhite = game.whitePlayerId === userId;
    if (game.winner === 'WHITE') {
        return userIsWhite ? 'win' : 'loss';
    }
    if (game.winner === 'BLACK') {
        return userIsWhite ? 'loss' : 'win';
    }
    return 'draw';
}
function scoreFor(game, userId) {
    const userIsWhite = game.whitePlayerId === userId;
    const userScore = userIsWhite ? game.whiteScore : game.blackScore;
    const opponentScore = userIsWhite ? game.blackScore : game.whiteScore;
    return {
        user: typeof userScore === 'number' ? userScore : null,
        opponent: typeof opponentScore === 'number' ? opponentScore : null
    };
}
const db = prisma_1.prisma;
async function getUserDashboard(userId) {
    if (!userId) {
        throw new Error('User identifier is required');
    }
    const userRecordRaw = await db.users.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            country: true,
            eloRating: true,
            gamesPlayed: true,
            gamesWon: true,
            winRate: true,
            currentStreak: true,
            bestStreak: true
        }
    });
    const userRecord = userRecordRaw;
    if (!userRecord) {
        throw new Error('User not found');
    }
    const [plan, quotaStatus, quotaHistoryRaw, recentGamesRaw, recentAnalysesRaw, currentSeasonRaw] = await Promise.all([
        subscriptionService_1.SubscriptionService.getUserPlan(userId),
        aiService_1.AIService.getQuotaStatus(userId),
        db.user_quota_history.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 10,
            select: {
                id: true,
                seasonId: true,
                quotaUsed: true,
                timestamp: true
            }
        }),
        db.games.findMany({
            where: {
                OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }]
            },
            orderBy: [{ finishedAt: 'desc' }, { createdAt: 'desc' }],
            take: 10,
            select: {
                id: true,
                finishedAt: true,
                status: true,
                winner: true,
                resignationType: true,
                whiteScore: true,
                blackScore: true,
                whitePlayerId: true,
                blackPlayerId: true,
                whitePlayer: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                blackPlayer: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        }),
        db.game_analyses.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 5,
            select: {
                id: true,
                game_id: true,
                ai_services_used: true,
                created_at: true
            }
        }),
        db.seasons.findFirst({
            orderBy: { startDate: 'desc' }
        })
    ]);
    const quotaHistory = quotaHistoryRaw;
    const recentGamesRows = recentGamesRaw;
    const recentAnalysesRows = recentAnalysesRaw;
    const currentSeason = currentSeasonRaw;
    let seasonInfo = null;
    if (currentSeason) {
        const [seasonStatsRaw, seasonRankRaw] = await Promise.all([
            db.user_season_stats.findFirst({
                where: { userId, seasonId: currentSeason.id }
            }),
            db.season_leaderboard.findFirst({
                where: { userId, seasonId: currentSeason.id },
                select: {
                    rankGlobal: true,
                    rankCountry: true
                }
            })
        ]);
        const seasonStats = seasonStatsRaw;
        const seasonRank = seasonRankRaw;
        if (seasonStats) {
            seasonInfo = {
                seasonId: currentSeason.id,
                name: currentSeason.name,
                rankGlobal: seasonRank?.rankGlobal ?? null,
                rankCountry: seasonRank?.rankCountry ?? null,
                elo: seasonStats.elo,
                winrate: seasonStats.winrate,
                gamesPlayed: seasonStats.gamesPlayed
            };
        }
    }
    const recentGames = recentGamesRows.map((game) => {
        const userIsWhite = game.whitePlayerId === userId;
        const opponent = userIsWhite ? game.blackPlayer : game.whitePlayer;
        return {
            id: game.id,
            finishedAt: game.finishedAt ? game.finishedAt.toISOString() : null,
            opponent: opponent
                ? {
                    id: opponent.id ?? null,
                    username: opponent.username ?? null
                }
                : null,
            role: userIsWhite ? 'white' : 'black',
            result: deriveResult(game, userId),
            score: scoreFor(game, userId)
        };
    });
    const recentAnalyses = recentAnalysesRows.map((analysis) => ({
        id: analysis.id,
        gameId: analysis.game_id,
        createdAt: analysis.created_at.toISOString(),
        servicesUsed: Array.isArray(analysis.ai_services_used) ? analysis.ai_services_used : []
    }));
    const quota = {
        plan: quotaStatus.plan,
        used: quotaStatus.used,
        limit: quotaStatus.limit,
        extra: quotaStatus.extra,
        history: quotaHistory.map((entry) => ({
            seasonId: entry.seasonId ?? null,
            quotaUsed: asNumber(entry.quotaUsed),
            timestamp: entry.timestamp.toISOString()
        }))
    };
    return {
        profile: {
            id: userRecord.id,
            username: userRecord.username,
            country: userRecord.country,
            eloRating: userRecord.eloRating,
            gamesPlayed: userRecord.gamesPlayed,
            gamesWon: userRecord.gamesWon,
            winRate: userRecord.winRate,
            currentStreak: userRecord.currentStreak,
            bestStreak: userRecord.bestStreak,
            plan
        },
        season: seasonInfo,
        quota,
        recentGames,
        recentAnalyses
    };
}
//# sourceMappingURL=userDashboardService.js.map