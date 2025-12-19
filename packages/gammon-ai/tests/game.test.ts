import express from 'express';
import request from 'supertest';

jest.mock('../src/server', () => {
  const express = require('express');
  const { prisma } = require('./utils/prismaMock');
  return {
    prisma,
    default: express()
  };
});

jest.mock('../src/lib/prisma', () => {
  const { prisma } = require('./utils/prismaMock');
  return { prisma };
});

import gamesRouter from '../src/routes/games';
import { AIService, QuotaExceededError } from '../src/services/aiService';
import { setTestUser } from './__mocks__/authMiddleware';
import { makeGameState } from './utils/fixtures';

const mockCreateGame = jest.fn();
const mockGetGame = jest.fn();

jest.mock('../src/middleware/authMiddleware', () => require('./__mocks__/authMiddleware'));

jest.mock('../src/services/gameService', () => ({
  GameService: {
    createGame: (...args: unknown[]) => mockCreateGame(...args),
    getGame: (...args: unknown[]) => mockGetGame(...args)
  }
}));

jest.mock('../src/services/aiService', () => require('./__mocks__/aiService'));

const mockedAIService = AIService as jest.Mocked<typeof AIService>;

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/games', gamesRouter);
  return app;
};

describe('POST /api/games', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    mockCreateGame.mockReset();
    mockGetGame.mockReset();
    jest.clearAllMocks();
    setTestUser('user-123');
  });

  it('should create a game and return 201', async () => {
    const mockGame = makeGameState({
      player2: null,
      status: 'waiting',
      gameType: 'match',
      stake: 0,
      whiteScore: 0,
      blackScore: 0,
      winner: null,
      startedAt: null,
      finishedAt: null
    });

    mockCreateGame.mockResolvedValue(mockGame);

    const res = await request(app)
      .post('/api/games')
      .send({ game_mode: 'AI_VS_PLAYER', stake: 0 });

    expect(mockCreateGame).toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('game-1');
  });
});

describe('POST /api/games/:id/suggestions', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    mockCreateGame.mockReset();
    mockGetGame.mockReset();
    mockedAIService.getBestMove.mockReset();
    setTestUser('user-123');
  });

  it('returns 200 with suggestion for participating user', async () => {
    mockGetGame.mockResolvedValue(makeGameState());
    mockedAIService.getBestMove.mockResolvedValue({
      move: {
        from: 24,
        to: 20,
        player: 'white',
        diceUsed: 4
      },
      equity: 0.123,
      explanation: 'Best move based on equity.'
    });

    setTestUser('user-123');

    const res = await request(app)
      .post('/api/games/game-1/suggestions')
      .send({ boardState: { positions: [] }, dice: [3, 2] });

    expect(mockGetGame).toHaveBeenCalledWith('game-1');
    expect(mockedAIService.getBestMove).toHaveBeenCalledWith({
      boardState: { positions: [] },
      dice: [3, 2],
      userId: 'user-123',
      gameId: 'game-1'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.suggestion.move).toEqual({
      from: 24,
      to: 20,
      player: 'white',
      diceUsed: 4
    });
  });

  it('returns 403 for non-participating user', async () => {
    mockGetGame.mockResolvedValue(makeGameState());

    setTestUser('intruder-999');

    const res = await request(app)
      .post('/api/games/game-1/suggestions')
      .send({ boardState: { positions: [] }, dice: [3, 2] });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
    expect(mockedAIService.getBestMove).not.toHaveBeenCalled();
  });
});

describe('POST /api/games/:id/evaluate', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    mockCreateGame.mockReset();
    mockGetGame.mockReset();
    mockedAIService.evaluatePosition.mockReset();
    setTestUser('user-123');
  });

  it('returns 200 with evaluation for participating user', async () => {
    mockGetGame.mockResolvedValue(makeGameState());
    mockedAIService.evaluatePosition.mockResolvedValue({
      equity: 0.321,
      pr: 0.045,
      winrate: 0.5,
      explanation: 'Position evaluated based on equity and PR.'
    });

    setTestUser('user-123');

    const res = await request(app)
      .post('/api/games/game-1/evaluate')
      .send({ boardState: { positions: [] }, dice: [6, 1] });

    expect(mockGetGame).toHaveBeenCalledWith('game-1');
    expect(mockedAIService.evaluatePosition).toHaveBeenCalledWith({
      boardState: { positions: [] },
      dice: [6, 1],
      userId: 'user-123',
      gameId: 'game-1'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.evaluation.equity).toBe(0.321);
  });

  it('returns 403 for non-participating user', async () => {
    mockGetGame.mockResolvedValue(makeGameState());

    setTestUser('intruder-999');

    const res = await request(app)
      .post('/api/games/game-1/evaluate')
      .send({ boardState: { positions: [] }, dice: [6, 1] });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
    expect(mockedAIService.evaluatePosition).not.toHaveBeenCalled();
  });
});
