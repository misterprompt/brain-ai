import express from 'express';
import request from 'supertest';

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret';

jest.mock('../../src/server', () => ({
  prisma: {
    users: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    user_season_stats: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    season_leaderboard: {
      findMany: jest.fn()
    }
  }
}));

jest.mock('../../src/services/leaderboardService');

import leaderboardRouter from '../../src/routes/leaderboards';
import * as leaderboardService from '../../src/services/leaderboardService';

const mockedService = leaderboardService as jest.Mocked<typeof leaderboardService>;

describe('Leaderboard routes', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/leaderboards', leaderboardRouter);
  });

  it('returns global leaderboard payload', async () => {
    mockedService.getGlobalLeaderboard.mockResolvedValueOnce({
      data: [
        {
          id: 'u1',
          username: 'Alice',
          country: 'FR',
          elo: 1650,
          winrate: 0.62,
          gamesPlayed: 40,
          gamesWon: 25,
          rankGlobal: 1
        }
      ],
      meta: { page: 1, perPage: 25, total: 1, totalPages: 1 }
    });

    const response = await request(app).get('/api/leaderboards/global?sort=winrate&page=1&perPage=25');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(mockedService.getGlobalLeaderboard).toHaveBeenCalledWith({
      sort: 'winrate',
      page: 1,
      perPage: 25
    });
  });

  it('validates country parameter', async () => {
    const response = await request(app).get('/api/leaderboards/country/usa');

    expect(response.status).toBe(400);
    expect(mockedService.getCountryLeaderboard).not.toHaveBeenCalled();
  });

  it('returns country leaderboard payload', async () => {
    mockedService.getCountryLeaderboard.mockResolvedValueOnce({
      data: [
        {
          id: 'u2',
          username: 'Bob',
          country: 'US',
          elo: 1500,
          winrate: 0.55,
          gamesPlayed: 32,
          gamesWon: 18,
          rankCountry: 1
        }
      ],
      meta: { page: 1, perPage: 25, total: 1, totalPages: 1 }
    });

    const response = await request(app).get('/api/leaderboards/country/us');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({ country: 'US', rankCountry: 1 });
    expect(mockedService.getCountryLeaderboard).toHaveBeenCalledWith('us', {
      page: undefined,
      perPage: undefined,
      sort: undefined
    });
  });

  it('validates season id', async () => {
    const response = await request(app).get('/api/leaderboards/season/not-a-uuid');

    expect(response.status).toBe(400);
    expect(mockedService.getSeasonLeaderboard).not.toHaveBeenCalled();
  });

  it('returns season leaderboard payload', async () => {
    mockedService.getSeasonLeaderboard.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, perPage: 25, total: 0, totalPages: 1 }
    });

    const response = await request(app).get('/api/leaderboards/season/1bec6564-d110-4e6e-9d02-2de7ba588d04');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(mockedService.getSeasonLeaderboard).toHaveBeenCalledWith(
      '1bec6564-d110-4e6e-9d02-2de7ba588d04',
      {
        page: undefined,
        perPage: undefined,
        sort: undefined
      }
    );
  });

  it('handles service errors with 500', async () => {
    mockedService.getGlobalLeaderboard.mockRejectedValueOnce(new Error('DB down'));

    const response = await request(app).get('/api/leaderboards/global');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Failed to fetch global leaderboard');
  });
});
