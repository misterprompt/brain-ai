const usersFindMany = jest.fn();
const usersUpdate = jest.fn();
const seasonStatsUpsert = jest.fn();
const transactionMock = jest.fn();

jest.mock('../../src/config', () => ({
  config: {
    elo: {
      kFactor: 32,
      baseRating: 1500
    }
  }
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args)
  }
}));

import { EloService } from '../../src/services/eloService';

const resetTransactionImplementation = () => {
  transactionMock.mockImplementation((callback: any) =>
    Promise.resolve(
      callback({
        users: {
          findMany: usersFindMany,
          update: usersUpdate
        },
        user_season_stats: {
          upsert: seasonStatsUpsert
        }
      })
    )
  );
};

describe('EloService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersFindMany.mockReset();
    usersUpdate.mockReset();
    seasonStatsUpsert.mockReset();
    transactionMock.mockReset();
    resetTransactionImplementation();
  });

  describe('applyMatchResult', () => {
    it('updates ratings and global stats for a decisive match', async () => {
      usersFindMany.mockResolvedValueOnce([
        {
          id: 'winner',
          eloRating: 1500,
          gamesPlayed: 10,
          gamesWon: 6,
          winRate: 0.6
        },
        {
          id: 'loser',
          eloRating: 1500,
          gamesPlayed: 10,
          gamesWon: 4,
          winRate: 0.4
        }
      ]);
      usersUpdate.mockResolvedValue(undefined);

      const result = await EloService.applyMatchResult({
        winnerUserId: 'winner',
        loserUserId: 'loser'
      });

      expect(usersFindMany).toHaveBeenCalledWith({
        where: { id: { in: ['winner', 'loser'] } },
        select: expect.objectContaining({ eloRating: true, gamesPlayed: true })
      });

      expect(usersUpdate).toHaveBeenNthCalledWith(1, {
        where: { id: 'winner' },
        data: {
          eloRating: 1516,
          gamesPlayed: 11,
          gamesWon: 7,
          winRate: 0.6364
        }
      });

      expect(usersUpdate).toHaveBeenNthCalledWith(2, {
        where: { id: 'loser' },
        data: {
          eloRating: 1484,
          gamesPlayed: 11,
          gamesWon: 4,
          winRate: 0.3636
        }
      });

      expect(seasonStatsUpsert).not.toHaveBeenCalled();
      expect(result).toEqual({
        winner: { userId: 'winner', rating: 1516 },
        loser: { userId: 'loser', rating: 1484 },
        scope: { type: 'global', seasonId: null }
      });
    });

    it('updates season stats and supports draws', async () => {
      usersFindMany.mockResolvedValueOnce([
        {
          id: 'winner',
          eloRating: 1500,
          gamesPlayed: 12,
          gamesWon: 7,
          winRate: 0.5833,
          seasonStats: [
            {
              gamesPlayed: 5,
              winrate: 0.6,
              elo: 1500
            }
          ]
        },
        {
          id: 'loser',
          eloRating: 1500,
          gamesPlayed: 12,
          gamesWon: 5,
          winRate: 0.4167,
          seasonStats: [
            {
              gamesPlayed: 5,
              winrate: 0.4,
              elo: 1500
            }
          ]
        }
      ]);
      usersUpdate.mockResolvedValue(undefined);
      seasonStatsUpsert.mockResolvedValue(undefined);

      const result = await EloService.applyMatchResult({
        winnerUserId: 'winner',
        loserUserId: 'loser',
        isDraw: true,
        seasonId: 'season-1'
      });

      expect(usersUpdate).toHaveBeenNthCalledWith(1, {
        where: { id: 'winner' },
        data: {
          eloRating: 1500,
          gamesPlayed: 13,
          gamesWon: 7,
          winRate: 0.5385
        }
      });

      expect(usersUpdate).toHaveBeenNthCalledWith(2, {
        where: { id: 'loser' },
        data: {
          eloRating: 1500,
          gamesPlayed: 13,
          gamesWon: 5,
          winRate: 0.3846
        }
      });

      expect(seasonStatsUpsert).toHaveBeenNthCalledWith(1, {
        where: {
          userId_seasonId: {
            userId: 'winner',
            seasonId: 'season-1'
          }
        },
        create: {
          userId: 'winner',
          seasonId: 'season-1',
          elo: 1500,
          winrate: 0.5833,
          gamesPlayed: 6
        },
        update: {
          elo: 1500,
          winrate: 0.5833,
          gamesPlayed: 6
        }
      });

      expect(seasonStatsUpsert).toHaveBeenNthCalledWith(2, {
        where: {
          userId_seasonId: {
            userId: 'loser',
            seasonId: 'season-1'
          }
        },
        create: {
          userId: 'loser',
          seasonId: 'season-1',
          elo: 1500,
          winrate: 0.4167,
          gamesPlayed: 6
        },
        update: {
          elo: 1500,
          winrate: 0.4167,
          gamesPlayed: 6
        }
      });

      expect(result).toEqual({
        winner: { userId: 'winner', rating: 1500 },
        loser: { userId: 'loser', rating: 1500 },
        scope: { type: 'global+season', seasonId: 'season-1' }
      });
    });
  });
});
