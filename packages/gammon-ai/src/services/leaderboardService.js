"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveLeaderboardChannel = deriveLeaderboardChannel;
exports.getGlobalLeaderboard = getGlobalLeaderboard;
exports.getCountryLeaderboard = getCountryLeaderboard;
exports.getSeasonLeaderboard = getSeasonLeaderboard;
const prisma_1 = require("../lib/prisma");
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;
function deriveLeaderboardChannel(scope) {
    switch (scope.type) {
        case 'country':
            return `country:${scope.country}:${scope.sort}`;
        case 'season':
            return `season:${scope.seasonId}:${scope.sort}`;
        default:
            return `global:${scope.sort}`;
    }
}
function parsePage(value) {
    const numeric = Number(value ?? DEFAULT_PAGE);
    if (!Number.isFinite(numeric) || numeric < 1) {
        return DEFAULT_PAGE;
    }
    return Math.floor(numeric);
}
function parsePerPage(value) {
    const numeric = Number(value ?? DEFAULT_PER_PAGE);
    if (!Number.isFinite(numeric) || numeric < 1) {
        return DEFAULT_PER_PAGE;
    }
    return Math.min(Math.floor(numeric), MAX_PER_PAGE);
}
function resolveSort(sort) {
    switch (sort) {
        case 'winrate':
            return 'winrate';
        case 'games':
            return 'games';
        default:
            return 'elo';
    }
}
const db = prisma_1.prisma;
async function getGlobalLeaderboard(query) {
    const page = parsePage(query.page);
    const perPage = parsePerPage(query.perPage);
    const sort = resolveSort(query.sort);
    const skip = (page - 1) * perPage;
    const orderBy = sort === 'winrate'
        ? { winRate: 'desc' }
        : sort === 'games'
            ? { gamesPlayed: 'desc' }
            : { eloRating: 'desc' };
    const [total, usersRaw] = await Promise.all([
        db.users.count(),
        db.users.findMany({
            orderBy,
            skip,
            take: perPage,
            select: {
                id: true,
                username: true,
                country: true,
                eloRating: true,
                winRate: true,
                gamesPlayed: true,
                gamesWon: true
            }
        })
    ]);
    const users = usersRaw;
    const data = users.map((user, index) => ({
        id: user.id,
        username: user.username,
        country: user.country,
        elo: user.eloRating,
        winrate: user.winRate,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        rankGlobal: skip + index + 1
    }));
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
        data,
        meta: {
            page,
            perPage,
            total,
            totalPages
        }
    };
}
async function getCountryLeaderboard(countryCode, query) {
    const normalizedCode = countryCode.trim().toUpperCase();
    const page = parsePage(query.page);
    const perPage = parsePerPage(query.perPage);
    const sort = resolveSort(query.sort);
    const skip = (page - 1) * perPage;
    const orderBy = sort === 'winrate'
        ? { winRate: 'desc' }
        : sort === 'games'
            ? { gamesPlayed: 'desc' }
            : { eloRating: 'desc' };
    const [total, usersRaw] = await Promise.all([
        db.users.count({ where: { country: normalizedCode } }),
        db.users.findMany({
            where: { country: normalizedCode },
            orderBy,
            skip,
            take: perPage,
            select: {
                id: true,
                username: true,
                country: true,
                eloRating: true,
                winRate: true,
                gamesPlayed: true,
                gamesWon: true
            }
        })
    ]);
    const users = usersRaw;
    const data = users.map((user, index) => ({
        id: user.id,
        username: user.username,
        country: user.country,
        elo: user.eloRating,
        winrate: user.winRate,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        rankCountry: skip + index + 1
    }));
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
        data,
        meta: {
            page,
            perPage,
            total,
            totalPages
        }
    };
}
async function getSeasonLeaderboard(seasonId, query) {
    const page = parsePage(query.page);
    const perPage = parsePerPage(query.perPage);
    const sort = resolveSort(query.sort);
    const skip = (page - 1) * perPage;
    const statsOrderBy = sort === 'winrate'
        ? { winrate: 'desc' }
        : sort === 'games'
            ? { gamesPlayed: 'desc' }
            : { elo: 'desc' };
    const total = await db.user_season_stats.count({ where: { seasonId } });
    const statsRaw = await db.user_season_stats.findMany({
        where: { seasonId },
        orderBy: statsOrderBy,
        skip,
        take: perPage,
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    country: true
                }
            }
        }
    });
    const stats = statsRaw;
    const userIds = stats.map((entry) => entry.userId);
    const rankRows = await db.season_leaderboard.findMany({
        where: {
            seasonId,
            userId: { in: userIds }
        },
        select: {
            userId: true,
            rankGlobal: true,
            rankCountry: true
        }
    });
    const ranks = rankRows;
    const rankMap = new Map();
    for (const rank of ranks) {
        rankMap.set(rank.userId, {
            rankGlobal: rank.rankGlobal,
            rankCountry: rank.rankCountry
        });
    }
    const data = stats.map((entry) => {
        const rank = rankMap.get(entry.userId) ?? { rankGlobal: null, rankCountry: null };
        return {
            id: entry.userId,
            username: entry.user?.username ?? null,
            country: entry.user?.country ?? null,
            elo: entry.elo,
            winrate: entry.winrate,
            gamesPlayed: entry.gamesPlayed,
            rankGlobal: rank.rankGlobal,
            rankCountry: rank.rankCountry
        };
    });
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
        data,
        meta: {
            page,
            perPage,
            total,
            totalPages
        }
    };
}
//# sourceMappingURL=leaderboardService.js.map