import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import type { MatchmakingStatus } from '../../src/services/matchmakingService.js';
import { MatchmakingService } from '../../src/services/matchmakingService.js';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  getMatchmakingStatus
} from '../../src/controllers/matchmakingController.js';

jest.mock('../../src/services/matchmakingService.js');
jest.mock('../../src/server', () => ({
  prisma: {
    games: {
      create: jest.fn()
    }
  }
}));

const mockedService = MatchmakingService as jest.Mocked<typeof MatchmakingService>;

const app = express();
app.use(express.json());
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).user = { id: 'user-a' };
  next();
});

const router = express.Router();
router.post('/matchmaking/join', joinMatchmakingQueue);
router.post('/matchmaking/leave', leaveMatchmakingQueue);
router.get('/matchmaking/status', getMatchmakingStatus);

app.use('/api/games', router);

describe('Matchmaking controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('joins matchmaking queue and returns status', async () => {
    const status: MatchmakingStatus = {
      searching: true,
      preferences: {},
      joinedAt: Date.now(),
      gameId: null
    };
    mockedService.joinQueue.mockResolvedValueOnce();
    mockedService.getStatus.mockReturnValueOnce(status);

    const response = await request(app).post('/api/games/matchmaking/join').send({ rating: 'any' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(status);
    expect(mockedService.joinQueue).toHaveBeenCalledWith('user-a', { rating: 'any' });
  });

  it('cancels matchmaking search', async () => {
    const status: MatchmakingStatus = {
      searching: false,
      preferences: null,
      joinedAt: null,
      gameId: null
    };
    mockedService.leaveQueue.mockResolvedValueOnce();
    mockedService.getStatus.mockReturnValueOnce(status);

    const response = await request(app).post('/api/games/matchmaking/leave');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(status);
    expect(mockedService.leaveQueue).toHaveBeenCalledWith('user-a');
  });

  it('returns matchmaking status', async () => {
    const status: MatchmakingStatus = {
      searching: false,
      preferences: null,
      joinedAt: null,
      gameId: 'game-123'
    };
    mockedService.getStatus.mockReturnValueOnce(status);

    const response = await request(app).get('/api/games/matchmaking/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(status);
    expect(mockedService.getStatus).toHaveBeenCalledWith('user-a');
  });

  it('protects endpoints when user missing', async () => {
    const unauthenticatedApp = express();
    unauthenticatedApp.use(express.json());
    unauthenticatedApp.use('/api/games', router);

    const response = await request(unauthenticatedApp).post('/api/games/matchmaking/join');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(mockedService.joinQueue).not.toHaveBeenCalled();
  });
});
