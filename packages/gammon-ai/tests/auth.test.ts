import express from 'express';
import request from 'supertest';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';
process.env.NODE_ENV = 'test';

jest.mock('../src/server', () => {
  const { prisma } = require('./utils/prismaMock');
  return { prisma };
});
jest.mock('../src/lib/prisma', () => {
  const { prisma } = require('./utils/prismaMock');
  return { prisma };
});

import authRouter from '../src/routes/auth';
import { prisma, setupTestDatabase } from './utils/db';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

describe('Auth routes', () => {
  setupTestDatabase();

  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  it('registers a user and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.accessToken).toBeDefined();
    expect(res.body.data?.refreshToken).toBeDefined();
  });

  it('rejects duplicate registration', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('rejects login with invalid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('refreshes access token with valid refresh token and rotates session', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    const refreshToken: string = registerRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data?.accessToken).toBeDefined();
    expect(refreshRes.body.data?.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.success).toBe(false);
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-refresh-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('revokes refresh token on logout', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    const refreshToken: string = registerRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.success).toBe(false);
  });
});
