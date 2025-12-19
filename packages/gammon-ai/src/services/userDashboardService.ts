import { prisma } from '../lib/prisma';
import { AIService } from './aiService';
import { SubscriptionService } from './subscriptionService';

export type DashboardGame = {
  id: string;
  finishedAt: string | null;
  opponent: {
    id: string | null;
    username: string | null;
  } | null;
  role: 'white' | 'black';
  result: 'win' | 'loss' | 'draw' | 'pending';
  score: {
    user: number | null;
    opponent: number | null;
  };
};

export type DashboardQuota = {
  plan: 'free' | 'premium';
  used: number;
  limit: number;
  extra: number;
  history: {
    seasonId: string | null;
    quotaUsed: number;
    timestamp: string;
  }[];
};

export type DashboardSeason = {
  seasonId: string;
  name: string;
  rankGlobal: number | null;
  rankCountry: number | null;
  elo: number;
  winrate: number;
  gamesPlayed: number;
};

export type DashboardAnalysis = {
  id: string;
  gameId: string;
  createdAt: string;
  servicesUsed: string[];
};

export type UserDashboard = {
  profile: {
    id: string;
    username: string | null;
    country: string | null;
    eloRating: number;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    plan: 'free' | 'premium';
  };
  season: DashboardSeason | null;
  quota: DashboardQuota;
  recentGames: DashboardGame[];
  recentAnalyses: DashboardAnalysis[];
};

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

function deriveResult(game: {
  status: string;
  winner: string | null;
  whitePlayerId: string;
  blackPlayerId: string | null;
}, userId: string): 'win' | 'loss' | 'draw' | 'pending' {
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

function scoreFor(game: {
  whiteScore: number;
  blackScore: number;
  whitePlayerId: string;
  blackPlayerId: string | null;
}, userId: string): { user: number | null; opponent: number | null } {
  const userIsWhite = game.whitePlayerId === userId;
  const userScore = userIsWhite ? game.whiteScore : game.blackScore;
  const opponentScore = userIsWhite ? game.blackScore : game.whiteScore;
  return {
    user: typeof userScore === 'number' ? userScore : null,
    opponent: typeof opponentScore === 'number' ? opponentScore : null
  };
}

type PrismaDashboardClient = {
  users: {
    findUnique: (args: Record<string, unknown>) => Promise<unknown>;
  };
  user_quota_history: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  games: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  game_analyses: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  seasons: {
    findFirst: (args: Record<string, unknown>) => Promise<unknown>;
  };
  user_season_stats: {
    findFirst: (args: Record<string, unknown>) => Promise<unknown>;
  };
  season_leaderboard: {
    findFirst: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

const db = prisma as unknown as PrismaDashboardClient;

type UserRow = {
  id: string;
  username: string | null;
  country: string | null;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
};

type QuotaHistoryRow = {
  id: string;
  seasonId: string | null;
  quotaUsed: number;
  timestamp: Date;
};

type GameRow = {
  id: string;
  finishedAt: Date | null;
  status: string;
  winner: string | null;
  resignationType: string | null;
  whiteScore: number;
  blackScore: number;
  whitePlayerId: string;
  blackPlayerId: string | null;
  whitePlayer: { id: string | null; username: string | null } | null;
  blackPlayer: { id: string | null; username: string | null } | null;
};

type AnalysisRow = {
  id: string;
  game_id: string;
  ai_services_used: unknown;
  created_at: Date;
};

type SeasonRow = {
  id: string;
  name: string;
};

type SeasonStatsRow = {
  elo: number;
  winrate: number;
  gamesPlayed: number;
};

type SeasonRankRow = {
  rankGlobal: number | null;
  rankCountry: number | null;
};

export async function getUserDashboard(userId: string): Promise<UserDashboard> {
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

  const userRecord = userRecordRaw as UserRow | null;

  if (!userRecord) {
    throw new Error('User not found');
  }

  const [plan, quotaStatus, quotaHistoryRaw, recentGamesRaw, recentAnalysesRaw, currentSeasonRaw] = await Promise.all([
    SubscriptionService.getUserPlan(userId),
    AIService.getQuotaStatus(userId),
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

  const quotaHistory = quotaHistoryRaw as QuotaHistoryRow[];
  const recentGamesRows = recentGamesRaw as GameRow[];
  const recentAnalysesRows = recentAnalysesRaw as AnalysisRow[];
  const currentSeason = currentSeasonRaw as SeasonRow | null;

  let seasonInfo: DashboardSeason | null = null;

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

    const seasonStats = seasonStatsRaw as (SeasonStatsRow & { gamesPlayed: number }) | null;
    const seasonRank = seasonRankRaw as SeasonRankRow | null;

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

  const recentGames: DashboardGame[] = recentGamesRows.map((game) => {
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
    } satisfies DashboardGame;
  });

  const recentAnalyses: DashboardAnalysis[] = recentAnalysesRows.map((analysis) => ({
    id: analysis.id,
    gameId: analysis.game_id,
    createdAt: analysis.created_at.toISOString(),
    servicesUsed: Array.isArray(analysis.ai_services_used) ? analysis.ai_services_used : []
  }));

  const quota: DashboardQuota = {
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
  } satisfies UserDashboard;
}
