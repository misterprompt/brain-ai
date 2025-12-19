import express from 'express';
import request from 'supertest';

type SetupOptions = {
  max?: number;
  windowMs?: number;
  user?: { id: string; role?: string };
  bypassUserIds?: string[];
};

const setupApp = async (scope: 'auth' | 'gnubg', options: SetupOptions = {}) => {
  jest.resetModules();

  process.env.NODE_ENV = 'test';
  process.env.RATE_LIMIT_ENABLED = 'true';
  process.env.RATE_LIMIT_TEST_MODE = 'true';

  const maxKey = `RATE_LIMIT_${scope.toUpperCase()}_MAX`;
  const windowKey = `RATE_LIMIT_${scope.toUpperCase()}_WINDOW_MS`;

  process.env[maxKey] = String(options.max ?? 2);
  process.env[windowKey] = String(options.windowMs ?? 1000);

  if (options.bypassUserIds?.length) {
    process.env.RATE_LIMIT_BYPASS_USER_IDS = options.bypassUserIds.join(',');
  } else {
    delete process.env.RATE_LIMIT_BYPASS_USER_IDS;
  }

  let createRateLimiter: typeof import('../src/middleware/rateLimiter')['createRateLimiter'] | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    ({ createRateLimiter } = require('../src/middleware/rateLimiter'));
  });

  if (!createRateLimiter) {
    throw new Error('Failed to load rate limiter');
  }

  const app = express();

  if (options.user) {
    const user = options.user;
    app.use((req, _res, next) => {
      (req as unknown as { user: { id: string; role?: string } }).user = { ...user };
      next();
    });
  }

  const limiter = createRateLimiter(scope);
  app.use(limiter);
  app.get('/test', (_req, res) => {
    res.json({ success: true });
  });

  return { app, limiter };
};

const clearEnv = () => {
  delete process.env.RATE_LIMIT_TEST_MODE;
  delete process.env.RATE_LIMIT_ENABLED;
  delete process.env.RATE_LIMIT_AUTH_MAX;
  delete process.env.RATE_LIMIT_AUTH_WINDOW_MS;
  delete process.env.RATE_LIMIT_GNUBG_MAX;
  delete process.env.RATE_LIMIT_GNUBG_WINDOW_MS;
  delete process.env.RATE_LIMIT_BYPASS_USER_IDS;
};

describe('rateLimiter middleware', () => {
  afterEach(() => {
    clearEnv();
  });

  it('limits repeated requests from the same IP address', async () => {
    const { app } = await setupApp('auth', { max: 2, windowMs: 1000 });
    const agent = request(app);

    const first = await agent.get('/test');
    const second = await agent.get('/test');
    const third = await agent.get('/test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toMatchObject({ success: false });
  });

  it('limits authenticated users individually', async () => {
    const { app } = await setupApp('gnubg', { max: 1, windowMs: 1000, user: { id: 'user-123' } });
    const agent = request(app);

    const first = await agent.get('/test');
    const second = await agent.get('/test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it('allows requests again after the window resets', async () => {
    const windowMs = 100;
    const { app } = await setupApp('auth', { max: 1, windowMs });
    const agent = request(app);

    const first = await agent.get('/test');
    const second = await agent.get('/test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));

    const third = await agent.get('/test');
    expect(third.status).toBe(200);
  });

  it('bypasses limits for admin users', async () => {
    const { app } = await setupApp('gnubg', { max: 1, windowMs: 1000, user: { id: 'admin-user', role: 'admin' } });
    const agent = request(app);

    const first = await agent.get('/test');
    const second = await agent.get('/test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('bypasses limits for users listed in bypass configuration', async () => {
    const { app } = await setupApp('auth', {
      max: 1,
      windowMs: 1000,
      user: { id: 'special-user' },
      bypassUserIds: ['special-user']
    });
    const agent = request(app);

    const first = await agent.get('/test');
    const second = await agent.get('/test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });
});
