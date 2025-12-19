import {
  getGlobalLeaderboard,
  getCountryLeaderboard,
  getSeasonLeaderboard
} from '../../src/services/leaderboardService';

const mockUsersCount = jest.fn();
const mockUsersFindMany = jest.fn();
const mockSeasonStatsCount = jest.fn();
const mockSeasonStatsFindMany = jest.fn();
const mockSeasonLeaderboardFindMany = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    users: {
      count: (...args: unknown[]) => mockUsersCount(...args),
      findMany: (...args: unknown[]) => mockUsersFindMany(...args)
    },
    user_season_stats: {
      count: (...args: unknown[]) => mockSeasonStatsCount(...args),
      findMany: (...args: unknown[]) => mockSeasonStatsFindMany(...args)
    },
    season_leaderboard: {
      findMany: (...args: unknown[]) => mockSeasonLeaderboardFindMany(...args)
    }
  }
}));

describe('leaderboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGlobalLeaderboard', () => {
    it('returns paginated leaderboard ordered by elo', async () => {
      mockUsersCount.mockResolvedValueOnce(2);
      mockUsersFindMany.mockResolvedValueOnce([
        {
          id: 'u1',
          username: 'Alice',
          country: 'FR',
          eloRating: 1650,
          winRate: 0.62,
          gamesPlayed: 40,
          gamesWon: 25
        },
        {
          id: 'u2',
          username: 'Bob',
          country: 'US',
          eloRating: 1580,
          winRate: 0.58,
          gamesPlayed: 38,
          gamesWon: 22
        }
      ]);

      const result = await getGlobalLeaderboard({ page: 1, perPage: 10 });

      expect(mockUsersFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { eloRating: 'desc' },
          skip: 0,
          take: 10
        })
      );
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({ id: 'u1', rankGlobal: 1 });
      expect(result.data[1]).toMatchObject({ id: 'u2', rankGlobal: 2 });
      expect(result.meta).toEqual({ page: 1, perPage: 10, total: 2, totalPages: 1 });
    });

    it('applies pagination and alternate sorting', async () => {
      mockUsersCount.mockResolvedValueOnce(12);
      mockUsersFindMany.mockResolvedValueOnce([]);

      await getGlobalLeaderboard({ page: 3, perPage: 5, sort: 'games' });

      expect(mockUsersFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { gamesPlayed: 'desc' },
          skip: 10,
          take: 5
        })
      );
    });
  });

  describe('getCountryLeaderboard', () => {
    it('normalizes country code and returns rankings', async () => {
      mockUsersCount.mockResolvedValueOnce(1);
      mockUsersFindMany.mockResolvedValueOnce([
        {
          id: 'u3',
          username: 'Chloe',
          country: 'FR',
          eloRating: 1720,
          winRate: 0.7,
          gamesPlayed: 50,
          gamesWon: 35
        }
      ]);

      const result = await getCountryLeaderboard('fr', { page: 1, perPage: 25 });

      expect(mockUsersCount).toHaveBeenCalledWith({ where: { country: 'FR' } });
      expect(mockUsersFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { country: 'FR' } })
      );
      expect(result.data[0]).toMatchObject({ id: 'u3', rankCountry: 1, country: 'FR' });
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getSeasonLeaderboard', () => {
    it('combines stats and ranks for a season', async () => {
      mockSeasonStatsCount.mockResolvedValueOnce(2);
      mockSeasonStatsFindMany.mockResolvedValueOnce([
        {
          id: 's1',
          userId: 'u1',
          elo: 1800,
          winrate: 0.75,
          gamesPlayed: 60,
          user: {
            id: 'u1',
            username: 'Alice',
            country: 'FR'
          }
        },
        {
          id: 's2',
          userId: 'u2',
          elo: 1700,
          winrate: 0.65,
          gamesPlayed: 55,
          user: {
            id: 'u2',
            username: 'Bob',
            country: 'US'
          }
        }
      ]);
      mockSeasonLeaderboardFindMany.mockResolvedValueOnce([
        {
          userId: 'u1',
          rankGlobal: 1,
          rankCountry: 1
        },
        {
          userId: 'u2',
          rankGlobal: 2,
          rankCountry: 1
        }
      ]);

      const result = await getSeasonLeaderboard('a55d9c18-7c37-4f3d-8662-6c3dfc7cd1dc', {
        page: 1,
        perPage: 10,
        sort: 'winrate'
      });

      expect(mockSeasonStatsFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { winrate: 'desc' },
          skip: 0,
          take: 10
        })
      );
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({ id: 'u1', rankGlobal: 1, elo: 1800 });
      expect(result.data[1]).toMatchObject({ id: 'u2', rankGlobal: 2, elo: 1700 });
      expect(result.meta.total).toBe(2);
    });

    it('handles empty seasons gracefully', async () => {
      mockSeasonStatsCount.mockResolvedValueOnce(0);
      mockSeasonStatsFindMany.mockResolvedValueOnce([]);
      mockSeasonLeaderboardFindMany.mockResolvedValueOnce([]);

      const result = await getSeasonLeaderboard('2733f922-40a2-4f47-82b3-4a16dd1cc999', {
        page: 2,
        perPage: 20
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta).toEqual({ page: 2, perPage: 20, total: 0, totalPages: 1 });
    });
  });
});
