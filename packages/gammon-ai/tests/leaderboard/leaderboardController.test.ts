import request from 'supertest';
import express from 'express';
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
import {
  getLeaderboardGlobal,
  getLeaderboardCountry,
  getLeaderboardSeason
} from '../../src/controllers/leaderboardController';
import * as leaderboardService from '../../src/services/leaderboardService';

describe('leaderboardController', () => {
  const app = express();
  app.get('/api/leaderboard/global', getLeaderboardGlobal);
  app.get('/api/leaderboard/country/:countryCode', getLeaderboardCountry);
  app.get('/api/leaderboard/season/:seasonId', getLeaderboardSeason);

  const serviceMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard');
  const countryMock = jest.spyOn(leaderboardService, 'getCountryLeaderboard');
  const seasonMock = jest.spyOn(leaderboardService, 'getSeasonLeaderboard');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns global leaderboard', async () => {
    serviceMock.mockResolvedValueOnce({
      data: [{ id: 'u1', username: 'Alice', country: 'FR', elo: 1600, winrate: 0.6, gamesPlayed: 40, rankGlobal: 1 }],
      meta: { page: 1, perPage: 25, total: 1, totalPages: 1 }
    });

    const response = await request(app).get('/api/leaderboard/global?sort=winrate&page=1');

    expect(response.status).toBe(200);
    expect(serviceMock).toHaveBeenCalledWith({ sort: 'winrate', page: 1, perPage: undefined });
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
  });

  it('validates pagination parameters', async () => {
    const response = await request(app).get('/api/leaderboard/global?page=0');

    expect(response.status).toBe(400);
    expect(serviceMock).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
  });

  it('returns country leaderboard', async () => {
    countryMock.mockResolvedValueOnce({
      data: [{ id: 'u2', username: 'Bob', country: 'US', elo: 1500, winrate: 0.55, gamesPlayed: 30, rankCountry: 1 }],
      meta: { page: 1, perPage: 25, total: 1, totalPages: 1 }
    });

    const response = await request(app).get('/api/leaderboard/country/us');

    expect(response.status).toBe(200);
    expect(countryMock).toHaveBeenCalledWith('us', { page: undefined, perPage: undefined, sort: undefined });
    expect(response.body.data[0].country).toBe('US');
  });

  it('rejects invalid country code', async () => {
    const response = await request(app).get('/api/leaderboard/country/usa');

    expect(response.status).toBe(400);
    expect(countryMock).not.toHaveBeenCalled();
  });

  it('returns season leaderboard and handles UUID validation', async () => {
    seasonMock.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, perPage: 25, total: 0, totalPages: 1 }
    });

    const response = await request(app).get('/api/leaderboard/season/1bec6564-d110-4e6e-9d02-2de7ba588d04');

    expect(response.status).toBe(200);
    expect(seasonMock).toHaveBeenCalled();
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
  });

  it('rejects invalid season id', async () => {
    const response = await request(app).get('/api/leaderboard/season/not-a-uuid');

    expect(response.status).toBe(400);
    expect(seasonMock).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    serviceMock.mockRejectedValueOnce(new Error('DB error'));

    const response = await request(app).get('/api/leaderboard/global');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Failed to fetch global leaderboard');
  });
});
