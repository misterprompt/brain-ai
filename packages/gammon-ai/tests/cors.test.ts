import express from 'express';
import request from 'supertest';
import cors from 'cors';

import { config } from '../src/config';

const createApp = () => {
  const app = express();
  const allowedOrigins = new Set(config.cors.origins);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
    credentials: config.cors.allowCredentials,
    methods: config.cors.allowMethods,
    allowedHeaders: config.cors.allowHeaders,
    optionsSuccessStatus: 204
  }));

  app.get('/test', (_req, res) => {
    res.json({ success: true });
  });

  return app;
};

describe('CORS configuration', () => {
  describe('allowed origins', () => {
    it('accepts requests from whitelisted origins', async () => {
      const app = createApp();

      const existingOrigin = config.cors.origins[0];

      const response = await request(app)
        .get('/test')
        .set('Origin', existingOrigin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(existingOrigin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('blocked origins', () => {
    it('rejects requests from unknown origins', async () => {
      const app = createApp();

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://malicious.example.com');

      expect(response.status).toBe(500);
    });
  });

  describe('preflight', () => {
    it('allows preflight requests for allowed origins', async () => {
      const app = createApp();

      const existingOrigin = config.cors.origins[0];

      const response = await request(app)
        .options('/test')
        .set('Origin', existingOrigin)
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toBe(config.cors.allowMethods);
      expect(response.headers['access-control-allow-headers']).toBe(config.cors.allowHeaders);
    });
  });
});
