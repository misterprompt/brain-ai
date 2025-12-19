import express from 'express';
import request from 'supertest';

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn(() => ({
      games: {},
      tournament_participants: {},
      tournaments: {},
      $transaction: jest.fn()
    }))
  };
});

jest.mock('../../src/server', () => {
  const express = require('express');
  const { prisma } = require('../utils/prismaMock');
  return {
    prisma,
    default: express()
  };
});

jest.mock('../../src/websocket/tournamentServer.js', () => ({
  broadcastTournamentEvent: jest.fn()
}));

jest.mock('../../src/websocket/server.ts', () => ({
  sendNotification: jest.fn()
}));

jest.mock('../../src/services/gameService', () => ({
  GameService: {}
}));

jest.mock('../../src/middleware/authMiddleware', () => require('../__mocks__/authMiddleware'));

jest.mock('../../src/services/tournamentService', () => {
  const createMock = jest.fn();
  return {
    TournamentService: {
      createTournament: jest.fn(),
      joinTournament: jest.fn(),
      leaveTournament: jest.fn(),
      getTournament: jest.fn(),
      listParticipants: jest.fn(),
      listLeaderboard: jest.fn(),
      getStandings: jest.fn(),
      getBracket: jest.fn(),
      startTournament: jest.fn(),
      reportMatchResult: jest.fn(),
      notifyParticipants: jest.fn(),
      getUserRole: jest.fn()
    }
  };
});

import tournamentsRouter from '../../src/routes/tournaments';
import { authMiddleware, setTestUser } from '../__mocks__/authMiddleware';
import { TournamentService } from '../../src/services/tournamentService';
import { broadcastTournamentEvent } from '../../src/websocket/tournamentServer.js';

describe('Tournament routes', () => {
  let app: express.Express;

  const mockService = TournamentService as jest.Mocked<typeof TournamentService>;
  const mockBroadcast = broadcastTournamentEvent as jest.Mock;

  const resetServiceMocks = () => {
    jest.clearAllMocks();
    Object.values(mockService).forEach((fn) => {
      if (typeof fn === 'function') {
        (fn as jest.Mock).mockReset();
      }
    });
    mockBroadcast.mockReset();
  };

  const createApp = () => {
    const application = express();
    application.use(express.json());
    application.use('/api/tournaments', tournamentsRouter);
    return application;
  };

  beforeAll(() => {
    process.env.TOURNAMENT_ADMIN_IDS = 'admin-user';
  });

  beforeEach(() => {
    resetServiceMocks();
    setTestUser('admin-user');
    mockService.getUserRole.mockResolvedValue('ORGANIZER');
    app = createApp();
  });

  afterAll(() => {
    delete process.env.TOURNAMENT_ADMIN_IDS;
  });

  describe('POST /api/tournaments', () => {
    it('allows admins to create tournaments', async () => {
      mockService.createTournament.mockResolvedValue({
        id: 't-1',
        name: 'Winter Cup',
        description: null,
        entryFee: 0,
        prizePool: 0,
        maxPlayers: null,
        status: 'REGISTRATION',
        startTime: null,
        endTime: null,
        createdBy: 'admin-user',
        participants: 0,
        matches: 0
      });

      const response = await request(app)
        .post('/api/tournaments')
        .send({ name: 'Winter Cup' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockService.createTournament).toHaveBeenCalledWith({
        name: 'Winter Cup',
        createdBy: 'admin-user'
      });
    });

    it('rejects non-admin users', async () => {
      setTestUser('regular-user');

      const response = await request(app)
        .post('/api/tournaments')
        .send({ name: 'Winter Cup' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(mockService.createTournament).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/tournaments/:id/join', () => {
    it('registers participant and broadcasts join event', async () => {
      setTestUser('player-1');
      mockService.joinTournament.mockResolvedValue({
        id: 'tp-1',
        tournament_id: 't-1',
        user_id: 'player-1',
        current_position: 0
      } as any);
      mockService.getTournament.mockResolvedValue({
        id: 't-1',
        name: 'Winter Cup',
        createdBy: 'admin-user'
      } as any);

      const response = await request(app)
        .post('/api/tournaments/t-1/join')
        .send();

      expect(response.status).toBe(201);
      expect(mockService.joinTournament).toHaveBeenCalledWith('t-1', 'player-1');
      expect(mockBroadcast).toHaveBeenCalledWith('t-1', 'playerJoined', {
        tournamentId: 't-1',
        userId: 'player-1'
      });
      expect(mockService.notifyParticipants).toHaveBeenCalledWith({
        tournamentId: 't-1',
        message: expect.stringContaining('a rejoint'),
        payload: {
          userId: 'player-1',
          action: 'join'
        },
        excludeUserIds: ['player-1']
      });
    });
  });

  describe('POST /api/tournaments/:id/leave', () => {
    it('allows participants to leave and notifies others', async () => {
      setTestUser('player-1');
      mockService.getTournament.mockResolvedValue({
        id: 't-1',
        name: 'Winter Cup',
        createdBy: 'admin-user'
      } as any);

      const response = await request(app)
        .post('/api/tournaments/t-1/leave')
        .send();

      expect(response.status).toBe(200);
      expect(mockService.leaveTournament).toHaveBeenCalledWith('t-1', 'player-1');
      expect(mockBroadcast).toHaveBeenCalledWith('t-1', 'tournamentUpdated', {
        tournamentId: 't-1',
        type: 'participantLeft',
        userId: 'player-1'
      });
      expect(mockService.notifyParticipants).toHaveBeenCalledWith({
        tournamentId: 't-1',
        message: expect.stringContaining('a quitté'),
        payload: {
          userId: 'player-1',
          action: 'leave'
        },
        excludeUserIds: ['player-1']
      });
    });
  });

  describe('GET endpoints', () => {
    beforeEach(() => {
      setTestUser('player-1');
    });

    it('returns tournament detail', async () => {
      mockService.getTournament.mockResolvedValue({
        id: 't-1',
        name: 'Winter Cup'
      } as any);

      const response = await request(app).get('/api/tournaments/t-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('t-1');
    });

    it('lists participants ordered by registration', async () => {
      mockService.listParticipants.mockResolvedValue([
        { id: 'tp-1', user_id: 'player-1' }
      ] as any);

      const response = await request(app).get('/api/tournaments/t-1/participants');

      expect(response.status).toBe(200);
      expect(mockService.listParticipants).toHaveBeenCalledWith('t-1');
      expect(response.body.data).toHaveLength(1);
    });

    it('lists leaderboard entries', async () => {
      mockService.listLeaderboard.mockResolvedValue([
        { user_id: 'player-1', current_position: 1 }
      ] as any);

      const response = await request(app).get('/api/tournaments/t-1/leaderboard');

      expect(response.status).toBe(200);
      expect(mockService.listLeaderboard).toHaveBeenCalledWith('t-1');
    });

    it('returns standings payload', async () => {
      mockService.getStandings.mockResolvedValue([
        { participantId: 'tp-1', userId: 'player-1', wins: 1, losses: 0, eliminated: false }
      ] as any);

      const response = await request(app).get('/api/tournaments/t-1/standings');

      expect(response.status).toBe(200);
      expect(mockService.getStandings).toHaveBeenCalledWith('t-1');
      expect(response.body.data).toHaveLength(1);
    });

    it('returns bracket payload', async () => {
      mockService.getBracket.mockResolvedValue([
        { round: 1, matches: [] }
      ] as any);

      const response = await request(app).get('/api/tournaments/t-1/bracket');

      expect(response.status).toBe(200);
      expect(mockService.getBracket).toHaveBeenCalledWith('t-1');
      expect(response.body.data[0].round).toBe(1);
    });
  });

  describe('POST /api/tournaments/:id/start', () => {
    it('authorises owner to start tournament', async () => {
      setTestUser('admin-user');
      mockService.getTournament.mockResolvedValue({
        id: 't-1',
        createdBy: 'admin-user'
      } as any);

      const response = await request(app)
        .post('/api/tournaments/t-1/start')
        .send();

      expect(response.status).toBe(200);
      expect(mockService.startTournament).toHaveBeenCalledWith('t-1');
    });

    it('rejects non-authorised user', async () => {
      setTestUser('player-1');
      mockService.getTournament.mockResolvedValue({
        id: 't-1',
        createdBy: 'admin-user'
      } as any);
      mockService.getUserRole.mockResolvedValue('PLAYER');

      const response = await request(app)
        .post('/api/tournaments/t-1/start')
        .send();

      expect(response.status).toBe(403);
      expect(mockService.startTournament).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/tournaments/:id/matches/:matchId/report', () => {
    it('reports match result when authorised', async () => {
      setTestUser('admin-user');
      mockService.getTournament.mockResolvedValue({
        id: 't-1',
        createdBy: 'admin-user'
      } as any);
      mockService.getUserRole.mockResolvedValue('ORGANIZER');

      const response = await request(app)
        .post('/api/tournaments/t-1/matches/m-1/report')
        .send({ winnerParticipantId: 'tp-1', gameId: 'g-1' });

      expect(response.status).toBe(200);
      expect(mockService.reportMatchResult).toHaveBeenCalledWith({
        matchId: 'm-1',
        winnerParticipantId: 'tp-1',
        gameId: 'g-1'
      });
    });

    it('validates payload and rejects missing winner', async () => {
      setTestUser('admin-user');
      mockService.getTournament.mockResolvedValue({
        id: 't-1',
        createdBy: 'admin-user'
      } as any);
      mockService.getUserRole.mockResolvedValue('ORGANIZER');

      const response = await request(app)
        .post('/api/tournaments/t-1/matches/m-1/report')
        .send({});

      expect(response.status).toBe(400);
      expect(mockService.reportMatchResult).not.toHaveBeenCalled();
    });
  });
});
