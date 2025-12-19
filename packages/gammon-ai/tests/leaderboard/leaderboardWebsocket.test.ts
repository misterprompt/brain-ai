import http from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket from 'ws';

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/services/gameService', () => ({
  GameService: {
    getGame: jest.fn()
  }
}));

jest.mock('../../src/services/matchmakingService.js', () => ({
  MatchmakingService: {
    onStatus: jest.fn(() => () => undefined),
    onMatchFound: jest.fn(() => () => undefined),
    getStatus: jest.fn(() => ({ searching: false, gameId: null })),
    leaveQueue: jest.fn()
  }
}));

import { initWebSocketServer, broadcastLeaderboardUpdate } from '../../src/websocket/server';
import type { LeaderboardUpdatePayload } from '../../src/services/socketService';

describe('Leaderboard WebSocket channel', () => {
  let server: http.Server;
  let wss: ReturnType<typeof initWebSocketServer>;
  let port: number;

  const waitForEvent = <T>(socket: WebSocket, event: string): Promise<T> =>
    new Promise((resolve) => {
      socket.once(event, (data: T) => resolve(data));
    });

  const connectClient = (channel: string) =>
    new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/leaderboard/${channel}`);

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onClose = () => {
        cleanup();
        reject(new Error('Connection closed prematurely'));
      };

      const cleanup = () => {
        socket.off('error', onError);
        socket.off('close', onClose);
      };

      socket.once('open', () => {
        cleanup();
        resolve(socket);
      });

      socket.once('error', onError);
      socket.once('close', onClose);
    });

  beforeAll(async () => {
    server = http.createServer();
    wss = initWebSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('delivers leaderboard updates to subscribed clients', async () => {
    const socket = await connectClient('global:elo');
    const messagePromise = waitForEvent<string>(socket, 'message');

    const payload: LeaderboardUpdatePayload = {
      scope: {
        type: 'global',
        sort: 'elo'
      },
      timestamp: new Date().toISOString(),
      entries: [
        {
          id: 'user-1',
          username: 'Alice',
          country: 'FR',
          elo: 1650,
          winrate: 0.62,
          gamesPlayed: 40,
          gamesWon: 25,
          rankGlobal: 1,
          rankCountry: null
        }
      ],
      total: 1
    };

    broadcastLeaderboardUpdate('global:elo', payload);

    const raw = await messagePromise;
    const message = JSON.parse(raw.toString());

    expect(message.type).toBe('LEADERBOARD_UPDATE');
    expect(message.payload).toMatchObject(payload);

    socket.close();
  });

  it('rejects connections without a leaderboard channel', async () => {
    await new Promise<void>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/leaderboard`);

      socket.once('close', (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain('Missing leaderboard channel');
        resolve();
      });

      socket.once('error', () => {
        resolve();
      });
    });
  });
});
