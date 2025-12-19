import { prisma } from '../lib/prisma';
import type { LeaderboardScopePayload } from './socketService';

export type LeaderboardSort = 'elo' | 'winrate' | 'games';

export interface PaginationParams {
  page?: number | string;
  perPage?: number | string;
}

export interface LeaderboardQuery extends PaginationParams {
  sort?: LeaderboardSort | string;
}

export interface LeaderboardMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string | null;
  country: string | null;
  elo: number;
  winrate: number;
  gamesPlayed: number;
  gamesWon?: number;
  rankGlobal?: number | null;
  rankCountry?: number | null;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

export function deriveLeaderboardChannel(scope: LeaderboardScopePayload): string {
  switch (scope.type) {
    case 'country':
      return `country:${scope.country}:${scope.sort}`;
    case 'season':
      return `season:${scope.seasonId}:${scope.sort}`;
    default:
      return `global:${scope.sort}`;
  }
}

function parsePage(value?: number | string): number {
  const numeric = Number(value ?? DEFAULT_PAGE);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return DEFAULT_PAGE;
  }
  return Math.floor(numeric);
}

function parsePerPage(value?: number | string): number {
  const numeric = Number(value ?? DEFAULT_PER_PAGE);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return DEFAULT_PER_PAGE;
  }
  return Math.min(Math.floor(numeric), MAX_PER_PAGE);
}

function resolveSort(sort?: string): LeaderboardSort {
  switch (sort) {
    case 'winrate':
      return 'winrate';
    case 'games':
      return 'games';
    default:
      return 'elo';
  }
}

type UserRow = {
  id: string;
  username: string | null;
  country: string | null;
  eloRating: number;
  winRate: number;
  gamesPlayed: number;
  gamesWon: number;
};

type PrismaLeaderboardClient = {
  users: {
    count: (args?: Record<string, unknown>) => Promise<number>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  user_season_stats: {
    count: (args: Record<string, unknown>) => Promise<number>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  season_leaderboard: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
};

const db = prisma as unknown as PrismaLeaderboardClient;

export async function getGlobalLeaderboard(query: LeaderboardQuery) {
  const page = parsePage(query.page);
  const perPage = parsePerPage(query.perPage);
  const sort = resolveSort(query.sort);
  const skip = (page - 1) * perPage;
  const orderBy =
    sort === 'winrate'
      ? { winRate: 'desc' as const }
      : sort === 'games'
        ? { gamesPlayed: 'desc' as const }
        : { eloRating: 'desc' as const };

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

  const users = usersRaw as UserRow[];

  const data: LeaderboardEntry[] = users.map((user, index) => ({
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
    } satisfies LeaderboardMeta
  };
}

export async function getCountryLeaderboard(countryCode: string, query: LeaderboardQuery) {
  const normalizedCode = countryCode.trim().toUpperCase();
  const page = parsePage(query.page);
  const perPage = parsePerPage(query.perPage);
  const sort = resolveSort(query.sort);
  const skip = (page - 1) * perPage;
  const orderBy =
    sort === 'winrate'
      ? { winRate: 'desc' as const }
      : sort === 'games'
        ? { gamesPlayed: 'desc' as const }
        : { eloRating: 'desc' as const };

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

  const users = usersRaw as UserRow[];

  const data: LeaderboardEntry[] = users.map((user, index) => ({
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
    } satisfies LeaderboardMeta
  };
}

type SeasonStatsRow = {
  id: string;
  userId: string;
  elo: number;
  winrate: number;
  gamesPlayed: number;
  user: {
    id: string;
    username: string | null;
    country: string | null;
  } | null;
};

type SeasonRankRow = {
  userId: string;
  rankGlobal: number | null;
  rankCountry: number | null;
};

export async function getSeasonLeaderboard(seasonId: string, query: LeaderboardQuery) {
  const page = parsePage(query.page);
  const perPage = parsePerPage(query.perPage);
  const sort = resolveSort(query.sort);
  const skip = (page - 1) * perPage;

  const statsOrderBy =
    sort === 'winrate'
      ? { winrate: 'desc' as const }
      : sort === 'games'
        ? { gamesPlayed: 'desc' as const }
        : { elo: 'desc' as const };

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

  const stats = statsRaw as SeasonStatsRow[];
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

  const ranks = rankRows as SeasonRankRow[];
  const rankMap = new Map<string, { rankGlobal: number | null; rankCountry: number | null }>();
  for (const rank of ranks) {
    rankMap.set(rank.userId, {
      rankGlobal: rank.rankGlobal,
      rankCountry: rank.rankCountry
    });
  }

  const data: LeaderboardEntry[] = stats.map((entry) => {
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
    } satisfies LeaderboardMeta
  };
}
