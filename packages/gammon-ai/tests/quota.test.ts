import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

jest.mock('../src/server', () => require('./utils/prismaMock'));
jest.mock('../src/lib/prisma', () => require('./utils/prismaMock'));
jest.mock('../src/middleware/rateLimiter', () => ({
  createRateLimiter: () => (_req: Request, _res: Response, next: NextFunction) => next()
}));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user');
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    (req as AuthRequest).user = {
      id: userId,
      email: `${userId}@example.com`,
      username: userId
    };

    next();
  }
}));
jest.mock('../src/providers/gnubgProvider', () => {
  const providerMocks = {
    getBestMove: jest.fn(async () => ({ move: null, explanation: '', equity: 0 })),
    evaluatePosition: jest.fn(async () => ({ equity: 0, pr: 0 })),
    analyzeGame: jest.fn(async () => ({ moves: [] }))
  };

  return {
    GNUBGProvider: jest.fn(() => providerMocks),
    providerMocks
  };
});
jest.mock('../src/services/aiService', () => {
  const actual = jest.requireActual('../src/services/aiService');
  const { prisma } = require('./utils/prismaMock');

  const resolvePlan = (userId: string) => (userId?.startsWith('premium') ? 'premium' : 'free');

  const calculateUsed = (plan: 'free' | 'premium', quota: { dailyQuota: number; premiumQuota: number }): number => {
    if (plan === 'premium') {
      return 10 - quota.premiumQuota;
    }
    return Math.max(5 - quota.dailyQuota, 0);
  };

  return {
    ...actual,
    AIService: {
      ...actual.AIService,
      getQuotaStatus: jest.fn(async (userId: string) => {
        const plan = resolvePlan(userId);
        const record = await prisma.iAQuota.findUnique({ where: { userId } });

        if (!record) {
          return {
            plan,
            used: 0,
            limit: plan === 'premium' ? 10 : 0,
            extra: 0
          };
        }

        return {
          plan,
          used: calculateUsed(plan, record),
          limit: plan === 'premium' ? 10 : 0,
          extra: record.extrasUsed
        };
      }),
      addExtraQuota: jest.fn(async (userId: string, amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Invalid amount provided for quota purchase');
        }

        const existing = await prisma.iAQuota.findUnique({ where: { userId } });

        if (!existing) {
          const created = await prisma.iAQuota.create({
            data: {
              userId,
              dailyQuota: 5,
              premiumQuota: resolvePlan(userId) === 'premium' ? 10 : 0,
              extrasUsed: Math.trunc(amount),
              resetAt: new Date()
            }
          });

          return created.extrasUsed;
        }

        const updated = await prisma.iAQuota.update({
          where: { userId },
          data: {
            extrasUsed: { increment: Math.trunc(amount) }
          }
        });

        return updated.extrasUsed;
      })
    }
  };
});
jest.mock('../src/services/subscriptionService', () => {
  const original = jest.requireActual('../src/services/subscriptionService');
  return {
    SubscriptionService: {
      ...original.SubscriptionService,
      getUserPlan: jest.fn(async (userId: string) => {
        return userId.startsWith('premium') ? 'premium' : 'free';
      })
    }
  };
});

import gnubgRouter from '../src/routes/gnubg';
import { setupTestDatabase, seedUser, seedAnalysisQuota, seedIAQuota } from './utils/db';
import type { AuthRequest } from '../src/middleware/authMiddleware';

const appFactory = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/gnubg', gnubgRouter);
  return app;
};

describe('AI quotas', () => {
  setupTestDatabase();

  let app: express.Express;

  beforeEach(async () => {
    app = appFactory();
    await seedUser({ email: 'free@example.com', password: 'hashed', id: 'free-user' });
    await seedUser({ email: 'premium@example.com', password: 'hashed', id: 'premium-user' });
    await seedUser({ email: 'extra@example.com', password: 'hashed', id: 'extra-user' });

    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1));
    await seedIAQuota({ userId: 'free-user', dailyQuota: 5, premiumQuota: 0, extrasUsed: 0, resetAt: today });
    await seedIAQuota({ userId: 'premium-user', dailyQuota: 0, premiumQuota: 10, extrasUsed: 0, resetAt: today });
    await seedIAQuota({ userId: 'extra-user', dailyQuota: 0, premiumQuota: 0, extrasUsed: 3, resetAt: today });
  });

  const analyzePayload = {
    board: { positions: [] },
    dice: [1, 2]
  } as const;

  const analyze = (userId: string, endpoint: '/hint' | '/evaluate' = '/hint') =>
    request(app)
      .post(`/api/gnubg${endpoint}`)
      .set('x-test-user', userId)
      .send(analyzePayload);

  const purchase = (userId: string, amount: number) =>
    request(app)
      .post('/api/gnubg/purchase')
      .set('x-test-user', userId)
      .send({ amount });

  const quotaStatus = (userId: string) =>
    request(app)
      .get('/api/gnubg/quota')
      .set('x-test-user', userId);

  it('allows 5 analyses for free user then blocks the 6th', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await analyze('free-user');
      expect(res.status).toBe(200);
    }

    const res = await analyze('free-user');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('QuotaExceeded');

    const status = await quotaStatus('free-user');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ success: true, data: { plan: 'free', used: 5, limit: 0, extra: 0 } });
  });

  it('allows 10 analyses for premium user then blocks the 11th', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await analyze('premium-user');
      expect(res.status).toBe(200);
    }

    const res = await analyze('premium-user');
    expect(res.status).toBe(429);

    const status = await quotaStatus('premium-user');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ success: true, data: { plan: 'premium', used: 10, limit: 10, extra: 0 } });
  });

  it('consumes extra quota before blocking', async () => {
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    await seedAnalysisQuota({ userId: 'extra-user', date: today, count: 5, extraQuota: 3, initialFree: false });

    for (let i = 0; i < 3; i++) {
      const res = await analyze('extra-user');
      expect(res.status).toBe(200);
    }

    const res = await analyze('extra-user');
    expect(res.status).toBe(429);

    const status = await quotaStatus('extra-user');
    expect(status.body).toMatchObject({ success: true, data: { plan: 'free', used: 5, limit: 0, extra: 0 } });
  });

  it('increments extra quota with purchase', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await analyze('free-user');
      expect(res.status).toBe(200);
    }

    const exhausted = await analyze('free-user');
    expect(exhausted.status).toBe(429);

    const purchaseRes = await purchase('free-user', 2);
    expect(purchaseRes.status).toBe(200);
    expect(purchaseRes.body.data.extraQuota).toBe(2);

    for (let i = 0; i < 2; i++) {
      const res = await analyze('free-user');
      expect(res.status).toBe(200);
    }

    const res = await analyze('free-user');
    expect(res.status).toBe(429);

    const status = await quotaStatus('free-user');
    expect(status.body).toMatchObject({ success: true, data: { plan: 'free', used: 5, limit: 0, extra: 0 } });
  });
});
