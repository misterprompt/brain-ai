import request from 'supertest';
import express from 'express';
import type { Response } from 'express';

jest.mock('../../src/server', () => ({
  prisma: {
    users: {
      findUnique: jest.fn()
    }
  }
}));

import { getDashboard } from '../../src/controllers/userDashboardController';
import * as dashboardService from '../../src/services/userDashboardService';
import type { UserDashboard } from '../../src/services/userDashboardService';
import type { AuthRequest } from '../../src/middleware/authMiddleware';

describe('userDashboardController', () => {
  const app = express();

  // Middleware pour injecter req.user pour les tests
  app.use((req: AuthRequest, res: Response, next) => {
    req.user = { id: 'user-123', email: 'user@example.com', username: 'tester' };
    next();
  });

  app.get('/api/user/dashboard', getDashboard);

  const getDashboardSpy = jest.spyOn(dashboardService, 'getUserDashboard');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns dashboard payload when service resolves', async () => {
    const mockDashboard: UserDashboard = {
      profile: {
        id: 'user-123',
        username: 'tester',
        country: 'FR',
        eloRating: 1700,
        gamesPlayed: 100,
        gamesWon: 60,
        winRate: 0.6,
        currentStreak: 3,
        bestStreak: 8,
        plan: 'premium'
      },
      season: null,
      quota: {
        plan: 'premium',
        used: 3,
        limit: 10,
        extra: 1,
        history: [] as { seasonId: string | null; quotaUsed: number; timestamp: string }[]
      },
      recentGames: [],
      recentAnalyses: []
    };

    getDashboardSpy.mockResolvedValueOnce(mockDashboard);

    const response = await request(app).get('/api/user/dashboard');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: mockDashboard });
    expect(getDashboardSpy).toHaveBeenCalledWith('user-123');
  });

  it('returns 404 when user not found', async () => {
    getDashboardSpy.mockRejectedValueOnce(new Error('User not found'));

    const response = await request(app).get('/api/user/dashboard');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: 'User not found' });
  });

  it('returns 401 when request unauthenticated', async () => {
    const unauthApp = express();
    unauthApp.get('/api/user/dashboard', getDashboard);

    const response = await request(unauthApp).get('/api/user/dashboard');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, error: 'Unauthorized' });
    expect(getDashboardSpy).not.toHaveBeenCalled();
  });

  it('maps unexpected errors to 500', async () => {
    getDashboardSpy.mockRejectedValueOnce(new Error('Database offline'));

    const response = await request(app).get('/api/user/dashboard');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, error: 'Database offline' });
  });
});
