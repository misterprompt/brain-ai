import { getUserDashboard, type UserDashboard } from '../../src/services/userDashboardService';
const mockUsersFindUnique = jest.fn();
const mockQuotaHistoryFindMany = jest.fn();
const mockGamesFindMany = jest.fn();
const mockAnalysesFindMany = jest.fn();
const mockSeasonsFindFirst = jest.fn();
const mockSeasonStatsFindFirst = jest.fn();
const mockSeasonLeaderboardFindFirst = jest.fn();

const mockGetUserPlan = jest.fn();
const mockGetQuotaStatus = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    users: {
      findUnique: (...args: unknown[]) => mockUsersFindUnique(...args)
    },
    user_quota_history: {
      findMany: (...args: unknown[]) => mockQuotaHistoryFindMany(...args)
    },
    games: {
      findMany: (...args: unknown[]) => mockGamesFindMany(...args)
    },
    game_analyses: {
      findMany: (...args: unknown[]) => mockAnalysesFindMany(...args)
    },
    seasons: {
      findFirst: (...args: unknown[]) => mockSeasonsFindFirst(...args)
    },
    user_season_stats: {
      findFirst: (...args: unknown[]) => mockSeasonStatsFindFirst(...args)
    },
    season_leaderboard: {
      findFirst: (...args: unknown[]) => mockSeasonLeaderboardFindFirst(...args)
    }
  }
}));

jest.mock('../../src/services/subscriptionService', () => ({
  SubscriptionService: {
    getUserPlan: (...args: unknown[]) => mockGetUserPlan(...args)
  }
}));

jest.mock('../../src/services/aiService', () => ({
  AIService: {
    getQuotaStatus: (...args: unknown[]) => mockGetQuotaStatus(...args)
  }
}));

describe('userDashboardService', () => {
  const userId = 'user-123';

  const baseUserRecord = {
    id: userId,
    username: 'BackgammonPro',
    country: 'FR',
    eloRating: 1720,
    gamesPlayed: 128,
    gamesWon: 82,
    winRate: 0.64,
    currentStreak: 6,
    bestStreak: 12
  };

  const quotaHistoryEntry = {
    id: 'qh-1',
    seasonId: 'season-1',
    quotaUsed: 3,
    timestamp: new Date('2025-11-10T08:00:00Z')
  };

  const finishedGame = {
    id: 'game-1',
    finishedAt: new Date('2025-11-11T20:00:00Z'),
    status: 'COMPLETED',
    winner: 'WHITE',
    resignationType: null,
    whiteScore: 5,
    blackScore: 3,
    whitePlayerId: userId,
    blackPlayerId: 'opponent-1',
    whitePlayer: { id: userId, username: 'BackgammonPro' },
    blackPlayer: { id: 'opponent-1', username: 'LuckyRoller' }
  };

  const analysisRow = {
    id: 'analysis-1',
    game_id: 'game-1',
    ai_services_used: ['evaluate', 'suggest'],
    created_at: new Date('2025-11-11T21:00:00Z')
  };

  const seasonRow = {
    id: 'season-1',
    name: 'Winter Championship'
  };

  const seasonStatsRow = {
    elo: 1805,
    winrate: 0.72,
    gamesPlayed: 45
  };

  const seasonRankRow = {
    rankGlobal: 4,
    rankCountry: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a full dashboard with season stats and history', async () => {
    mockUsersFindUnique.mockResolvedValueOnce(baseUserRecord);
    mockGetUserPlan.mockResolvedValueOnce('premium');
    mockGetQuotaStatus.mockResolvedValueOnce({ plan: 'premium', used: 7, limit: 10, extra: 2 });
    mockQuotaHistoryFindMany.mockResolvedValueOnce([quotaHistoryEntry]);
    mockGamesFindMany.mockResolvedValueOnce([finishedGame]);
    mockAnalysesFindMany.mockResolvedValueOnce([analysisRow]);
    mockSeasonsFindFirst.mockResolvedValueOnce(seasonRow);
    mockSeasonStatsFindFirst.mockResolvedValueOnce(seasonStatsRow);
    mockSeasonLeaderboardFindFirst.mockResolvedValueOnce(seasonRankRow);

    const dashboard = await getUserDashboard(userId);

    expect(dashboard.profile).toMatchObject({
      id: userId,
      username: 'BackgammonPro',
      plan: 'premium',
      eloRating: 1720
    });

    expect(dashboard.season).toEqual({
      seasonId: 'season-1',
      name: 'Winter Championship',
      elo: 1805,
      winrate: 0.72,
      gamesPlayed: 45,
      rankGlobal: 4,
      rankCountry: 1
    });

    expect(dashboard.quota).toEqual({
      plan: 'premium',
      used: 7,
      limit: 10,
      extra: 2,
      history: [
        {
          seasonId: 'season-1',
          quotaUsed: 3,
          timestamp: quotaHistoryEntry.timestamp.toISOString()
        }
      ]
    });

    expect(dashboard.recentGames[0]).toMatchObject({
      id: 'game-1',
      role: 'white',
      result: 'win',
      score: { user: 5, opponent: 3 }
    });

    expect(dashboard.recentAnalyses[0]).toEqual({
      id: 'analysis-1',
      gameId: 'game-1',
      servicesUsed: ['evaluate', 'suggest'],
      createdAt: analysisRow.created_at.toISOString()
    });
  });

  it('throws when user is not found', async () => {
    mockUsersFindUnique.mockResolvedValueOnce(null);

    await expect(getUserDashboard(userId)).rejects.toThrow('User not found');

    expect(mockGetUserPlan).not.toHaveBeenCalled();
    expect(mockGetQuotaStatus).not.toHaveBeenCalled();
  });

  it('handles empty quotas and missing season gracefully', async () => {
    mockUsersFindUnique.mockResolvedValueOnce(baseUserRecord);
    mockGetUserPlan.mockResolvedValueOnce('free');
    mockGetQuotaStatus.mockResolvedValueOnce({ plan: 'free', used: 0, limit: 5, extra: 0 });
    mockQuotaHistoryFindMany.mockResolvedValueOnce([]);
    mockGamesFindMany.mockResolvedValueOnce([]);
    mockAnalysesFindMany.mockResolvedValueOnce([]);
    mockSeasonsFindFirst.mockResolvedValueOnce(null);

    const dashboard = (await getUserDashboard(userId)) as UserDashboard;

    expect(dashboard.season).toBeNull();
    expect(dashboard.quota.history).toHaveLength(0);
    expect(dashboard.recentGames).toHaveLength(0);
    expect(dashboard.recentAnalyses).toHaveLength(0);

    expect(mockSeasonStatsFindFirst).not.toHaveBeenCalled();
    expect(mockSeasonLeaderboardFindFirst).not.toHaveBeenCalled();
  });
});
