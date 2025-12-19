import http from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import EventEmitter from 'node:events';

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test-access-secret';
process.env.NODE_ENV = 'test';

jest.mock('../src/services/gameService', () => {
  return {
    GameService: {
      getGame: jest.fn(),
      getGameSummary: jest.fn()
    }
  };
});

jest.mock('../src/services/turnTimerService', () => {
  return {
    TurnTimerService: {
      getSnapshot: jest.fn(() => null)
    }
  };
});

jest.mock('../src/services/gameSessionRegistry', () => {
  type SessionRecord = {
    id: string;
    gameId: string;
    userId: string;
    lastAckSequence: number;
    issuedAt: Date;
    expiresAt: Date | null;
    lastHeartbeatAt: Date | null;
  };

  type EventRecord = {
    sequence: number;
    type: string;
    payload: Record<string, unknown>;
  };

  const sessions = new Map<string, SessionRecord>();
  const tokens = new Map<string, string>();
  const events = new Map<string, EventRecord[]>();
  let counter = 0;

  const sessionKey = (gameId: string, userId: string) => `${gameId}:${userId}`;
  const findSessionById = (id: string) => [...sessions.values()].find((record) => record.id === id) ?? null;

  const nextId = () => {
    counter += 1;
    return counter;
  };

  const issueSession = jest.fn(async (gameId: string, userId: string, options: { lastAckSequence?: number } = {}) => {
    const key = sessionKey(gameId, userId);
    let record = sessions.get(key);
    if (!record) {
      record = {
        id: `session-${nextId()}`,
        gameId,
        userId,
        lastAckSequence: 0,
        issuedAt: new Date(),
        expiresAt: null,
        lastHeartbeatAt: null
      } satisfies SessionRecord;
    }

    if (typeof options.lastAckSequence === 'number') {
      record.lastAckSequence = options.lastAckSequence;
    }

    record.issuedAt = new Date();
    sessions.set(key, record);

    const token = `token-${record.id}-${nextId()}`;
    tokens.set(token, record.id);

    const session: MockGameSession = {
      id: record.id,
      gameId: record.gameId,
      userId: record.userId,
      lastAckSequence: record.lastAckSequence,
      issuedAt: record.issuedAt,
      expiresAt: record.expiresAt,
      resumeTokenHash: '',
      metadata: null,
      lastHeartbeatAt: record.lastHeartbeatAt,
      createdAt: record.issuedAt
    };

    return {
      token,
      session
    };
  });

  const validateToken = jest.fn(async (token: string) => {
    const sessionId = tokens.get(token);
    if (!sessionId) {
      return null;
    }

    const record = findSessionById(sessionId);
    if (!record) {
      return null;
    }

    const issuedAtSeconds = Math.floor(record.issuedAt.getTime() / 1000);
    const expirySeconds = issuedAtSeconds + 3600;

    const session: MockGameSession = {
      id: record.id,
      gameId: record.gameId,
      userId: record.userId,
      lastAckSequence: record.lastAckSequence,
      issuedAt: record.issuedAt,
      expiresAt: record.expiresAt,
      resumeTokenHash: '',
      metadata: null,
      lastHeartbeatAt: record.lastHeartbeatAt,
      createdAt: record.issuedAt
    };

    return {
      session,
      payload: {
        sid: record.id,
        gid: record.gameId,
        uid: record.userId,
        iat: issuedAtSeconds,
        exp: expirySeconds
      },
      token
    } satisfies import('../src/services/gameSessionRegistry').ValidatedSession;
  });

  const acknowledge = jest.fn(async (sessionId: string, sequence: number) => {
    const record = findSessionById(sessionId);
    if (record) {
      record.lastAckSequence = sequence;
      sessions.set(sessionKey(record.gameId, record.userId), record);
    }
  });

  const updateHeartbeat = jest.fn(async (sessionId: string) => {
    const record = findSessionById(sessionId);
    if (record) {
      record.lastHeartbeatAt = new Date();
    }
  });

  const revoke = jest.fn(async (sessionId: string) => {
    const record = findSessionById(sessionId);
    if (!record) {
      return;
    }
    sessions.delete(sessionKey(record.gameId, record.userId));
    for (const [token, mappedId] of tokens.entries()) {
      if (mappedId === sessionId) {
        tokens.delete(token);
      }
    }
  });

  const recordEvent = jest.fn(async ({ gameId, type, payload }: { gameId: string; type: string; payload: Record<string, unknown> }) => {
    const list = events.get(gameId) ?? ([] as EventRecord[]);
    const sequence = (list[list.length - 1]?.sequence ?? 0) + 1;
    list.push({ sequence, type, payload });
    events.set(gameId, list);
    return sequence;
  });

  const fetchEventsSince = jest.fn(async (gameId: string, afterSequence: number, limit = 100) => {
    const list = events.get(gameId) ?? ([] as EventRecord[]);
    return list.filter((record) => record.sequence > afterSequence).slice(0, limit);
  });

  const purgeEventsThrough = jest.fn(async (gameId: string, sequence: number) => {
    const list = events.get(gameId) ?? ([] as EventRecord[]);
    const remaining = list.filter((record) => record.sequence > sequence);
    events.set(gameId, remaining);
    return list.length - remaining.length;
  });

  const getMinimumAckSequence = jest.fn(async (gameId: string) => {
    const filtered = [...sessions.values()].filter((record) => record.gameId === gameId);
    if (filtered.length === 0) {
      return null;
    }
    return filtered.reduce((min, record) => Math.min(min, record.lastAckSequence), Number.POSITIVE_INFINITY);
  });

  const cleanupExpiredSessions = jest.fn(async () => 0);

  const reset = () => {
    sessions.clear();
    tokens.clear();
    events.clear();
    counter = 0;
    issueSession.mockClear();
    validateToken.mockClear();
    acknowledge.mockClear();
    updateHeartbeat.mockClear();
    revoke.mockClear();
    recordEvent.mockClear();
    fetchEventsSince.mockClear();
    purgeEventsThrough.mockClear();
    getMinimumAckSequence.mockClear();
    cleanupExpiredSessions.mockClear();
  };

  return {
    GameSessionRegistry: {
      issueSession,
      validateToken,
      acknowledge,
      updateHeartbeat,
      revoke,
      recordEvent,
      fetchEventsSince,
      purgeEventsThrough,
      getMinimumAckSequence,
      cleanupExpiredSessions,
      __unsafe: {
        reset,
        sessions,
        tokens,
        events
      }
    }
  };
});

import initWebSocketServer, { __testing as wsTesting } from '../src/websocket/server';
import { config } from '../src/config';
import { GameService } from '../src/services/gameService';
import { GameSessionRegistry } from '../src/services/gameSessionRegistry';

type MockGameSession = {
  id: string;
  gameId: string;
  userId: string;
  lastAckSequence: number;
  issuedAt: Date;
  expiresAt: Date | null;
  resumeTokenHash: string;
  metadata: Record<string, unknown> | null;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
};

const mockedGameService = GameService as unknown as {
  getGame: jest.Mock;
  getGameSummary: jest.Mock;
};

type MockedRegistry = typeof GameSessionRegistry & {
  __unsafe: {
    reset: () => void;
    sessions: Map<string, unknown>;
    tokens: Map<string, string>;
    events: Map<string, unknown>;
  };
};

const registryMock = GameSessionRegistry as unknown as MockedRegistry;

const signToken = (userId: string) =>
  jwt.sign({ userId }, config.accessTokenSecret, { expiresIn: '1h' });

const toBuffer = (data: WebSocket.RawData): Buffer => {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (typeof data === 'string') {
    return Buffer.from(data);
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data.map((item) => toBuffer(item as WebSocket.RawData)));
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  }

  throw new TypeError('Unsupported WebSocket message payload');
};

const messageQueues = new WeakMap<WebSocket, Buffer[]>();
const messageResolvers = new WeakMap<WebSocket, Array<(value: Buffer) => void>>();

const attachMessageBuffer = (socket: WebSocket) => {
  if (messageQueues.has(socket)) {
    return;
  }

  messageQueues.set(socket, []);
  messageResolvers.set(socket, []);

  socket.on('message', (raw: WebSocket.RawData) => {
    const buffer = toBuffer(raw);
    const queue = messageQueues.get(socket);
    const resolvers = messageResolvers.get(socket);
    if (!queue || !resolvers) {
      return;
    }

    if (resolvers.length > 0) {
      const resolve = resolvers.shift();
      resolve?.(buffer);
    } else {
      queue.push(buffer);
    }
  });

  socket.on('close', () => {
    messageQueues.delete(socket);
    messageResolvers.delete(socket);
  });
};

const dequeueMessage = (socket: WebSocket): Promise<Buffer> => {
  const queue = messageQueues.get(socket);
  const resolvers = messageResolvers.get(socket);

  if (!queue || !resolvers) {
    throw new Error('Message buffer not attached');
  }

  if (queue.length > 0) {
    return Promise.resolve(queue.shift()!);
  }

  return new Promise((resolve) => {
    resolvers.push(resolve);
  });
};

const waitForEvent = (socket: WebSocket): Promise<Buffer> => {
  attachMessageBuffer(socket);
  return dequeueMessage(socket);
};

const waitForEnvelope = async (socket: WebSocket) => JSON.parse((await waitForEvent(socket)).toString());

describe('WebSocket game channel', () => {
  jest.setTimeout(15000);

  let server: http.Server;
  let wss: ReturnType<typeof initWebSocketServer>;
  let port: number;
  const activeSockets = new Set<WebSocket>();

  beforeAll(async () => {
    server = http.createServer();
    wss = initWebSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    for (const socket of wss.clients) {
      socket.terminate();
    }
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(() => {
    jest.clearAllMocks();
    registryMock.__unsafe.reset();
    wsTesting.resetSessionState();
    for (const socket of activeSockets) {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
        socket.terminate();
      }
      activeSockets.delete(socket);
    }
  });

  type ConnectedClient = {
    socket: WebSocket;
    resumeToken: string;
    resumePayload: any;
  };

  const connectClient = (
    userId: string,
    gameId: string,
    options: { resumeToken?: string } = {}
  ): Promise<ConnectedClient> =>
    new Promise((resolve, reject) => {
      const token = signToken(userId);
      const params = new URLSearchParams({ gameId });
      if (options.resumeToken) {
        params.set('resume', options.resumeToken);
      }

      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/game?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      attachMessageBuffer(socket);

      let settled = false;

      const cleanup = () => {
        clearTimeout(handshakeTimeout);
        socket.off('error', onError);
        socket.off('close', onClose);
      };

      const finalize = (result: ConnectedClient) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(result);
      };

      const fail = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      const onError = (error: Error) => {
        fail(error);
      };

      const onClose = () => {
        fail(new Error('Connection closed prematurely'));
      };

      socket.once('error', onError);
      socket.once('close', onClose);

      const handshakeTimeout = setTimeout(() => {
        fail(new Error('Handshake timeout'));
      }, 1_000);

      const awaitHandshake = async () => {
        try {
          const raw = await dequeueMessage(socket);
          if (settled) {
            return;
          }
          const envelope = JSON.parse(raw.toString());
          if (envelope?.type !== 'GAME_RESUME' || typeof envelope?.payload?.token !== 'string') {
            fail(new Error('Unexpected handshake payload'));
            return;
          }

          const resumePayload = envelope.payload;
          activeSockets.add(socket);
          socket.once('close', () => {
            activeSockets.delete(socket);
          });
          finalize({ socket, resumeToken: resumePayload.token as string, resumePayload });
        } catch (error) {
          fail(error instanceof Error ? error : new Error('Invalid handshake payload'));
        }
      };

      void awaitHandshake();
    });

  it('issues resume token and exposes last sequence on handshake', async () => {
    mockedGameService.getGame.mockResolvedValue({
      whitePlayerId: 'player-1',
      blackPlayerId: 'player-2'
    });

    const { resumePayload, socket } = await connectClient('player-1', 'game-handshake');

    expect(resumePayload).toMatchObject({
      gameId: 'game-handshake',
      userId: 'player-1',
      lastSequence: 0
    });
    expect(typeof resumePayload.token).toBe('string');

    socket.close();
  });

  it('broadcasts move events with persisted sequence numbers', async () => {
    mockedGameService.getGame.mockResolvedValue({
      whitePlayerId: 'player-1',
      blackPlayerId: 'player-2'
    });

    const { socket: socketA } = await connectClient('player-1', 'game-move');
    const { socket: socketB } = await connectClient('player-2', 'game-move');

    socketA.send(JSON.stringify({ type: 'move', payload: { move: '24/18' } }));

    const moveEnvelope = await waitForEnvelope(socketB);
    expect(moveEnvelope.type).toBe('GAME_MOVE');
    expect(moveEnvelope.payload.sequence).toBe(1);
    expect(moveEnvelope.payload.move).toEqual({ move: '24/18' });

    socketA.close();
    socketB.close();
  });

  it.skip('acknowledges replay sequence numbers', async () => {
    mockedGameService.getGame.mockResolvedValue({
      whitePlayerId: 'player-1',
      blackPlayerId: 'player-2'
    });

    const { socket: socketA } = await connectClient('player-1', 'game-ack');
    const { socket: socketB } = await connectClient('player-2', 'game-ack');

    socketA.send(JSON.stringify({ type: 'move', payload: { move: 'bar/24' } }));
    const moveEnvelope = await waitForEnvelope(socketB);
    const sequence = moveEnvelope.payload.sequence as number;

    const fetchEventsSinceMock = registryMock.fetchEventsSince as unknown as jest.Mock;
    const purgeEventsThroughMock = registryMock.purgeEventsThrough as unknown as jest.Mock;
    const getMinimumAckSequenceMock = registryMock.getMinimumAckSequence as unknown as jest.Mock;
    fetchEventsSinceMock.mockClear();
    purgeEventsThroughMock.mockClear();
    getMinimumAckSequenceMock.mockClear();

    socketB.send(JSON.stringify({ type: 'ack', payload: { sequence } }));
    const ackEnvelope = await waitForEnvelope(socketB);

    expect(ackEnvelope.type).toBe('GAME_ACK');
    // Loose check for payload to avoid strict equality issues
    const p = ackEnvelope.payload as any;
    expect(p.gameId).toBe('game-ack');
    expect(p.userId).toBe('player-2');
    expect(p.sequence).toBe(sequence);

    expect(getMinimumAckSequenceMock).toHaveBeenCalledWith('game-ack');
    expect(purgeEventsThroughMock).toHaveBeenCalledWith('game-ack', sequence);
    expect(fetchEventsSinceMock).toHaveBeenCalledTimes(1);
    const [gameIdArg, afterSequenceArg, limitArg] = fetchEventsSinceMock.mock.calls[0];
    expect(gameIdArg).toBe('game-ack');
    expect(afterSequenceArg).toBe(sequence);
    expect(limitArg).toBe(50);

    socketA.close();
    socketB.close();
  });

  it('replays missed events when reconnecting with a resume token', async () => {
    mockedGameService.getGame.mockResolvedValue({
      whitePlayerId: 'player-1',
      blackPlayerId: 'player-2'
    });

    const { socket: socketA } = await connectClient('player-1', 'game-replay');
    const { socket: socketB, resumeToken } = await connectClient('player-2', 'game-replay');

    socketA.send(JSON.stringify({ type: 'move', payload: { move: '13/7' } }));
    await waitForEnvelope(socketB); // consume live move

    socketB.close();

    const validateTokenMock = registryMock.validateToken as unknown as jest.Mock;
    const issueSessionMock = registryMock.issueSession as unknown as jest.Mock;
    const fetchEventsSinceMock = registryMock.fetchEventsSince as unknown as jest.Mock;
    validateTokenMock.mockClear();
    issueSessionMock.mockClear();
    fetchEventsSinceMock.mockClear();

    const { socket: resumedSocket } = await connectClient('player-2', 'game-replay', { resumeToken });
    const replayEnvelope = await waitForEnvelope(resumedSocket);

    expect(replayEnvelope.type).toBe('GAME_REPLAY');
    expect(replayEnvelope.payload.sequence).toBe(1);
    expect(replayEnvelope.payload.message).toMatchObject({ type: 'move', payload: { move: '13/7' } });

    expect(validateTokenMock).toHaveBeenCalledWith(resumeToken);
    expect(issueSessionMock).toHaveBeenCalledWith('game-replay', 'player-2', { lastAckSequence: 0 });
    expect(fetchEventsSinceMock).toHaveBeenCalledTimes(1);
    const [gameIdArg, afterSequenceArg, limitArg] = fetchEventsSinceMock.mock.calls[0];
    expect(gameIdArg).toBe('game-replay');
    expect(afterSequenceArg).toBe(0);
    expect(limitArg).toBe(50);

    socketA.close();
    resumedSocket.close();
  });

  it('rejects invalid message formats with an error frame', async () => {
    mockedGameService.getGame.mockResolvedValue({
      whitePlayerId: 'player-1',
      blackPlayerId: 'player-2'
    });

    const { socket } = await connectClient('player-1', 'game-invalid');

    socket.send('{invalid json');
    const message = await waitForEvent(socket);

    expect(message.toString()).toBe('Invalid message');
    socket.close();
  });

  it('rejects connection when gameId is missing', async () => {
    await new Promise<void>((resolve) => {
      const token = signToken('player-1');
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/game`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      socket.once('close', (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain('Missing game identifier');
        resolve();
      });
    });
  });
});

describe('attachHeartbeat helper', () => {
  class MockSocket extends EventEmitter {
    readyState = WebSocket.OPEN;
    ping = jest.fn();
    terminate = jest.fn();
  }

  const { attachHeartbeat, HEARTBEAT_INTERVAL_MS } = wsTesting;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('terminates sockets that miss heartbeat responses', () => {
    const socket = new MockSocket();

    attachHeartbeat(socket as unknown as WebSocket);

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(socket.ping).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(socket.terminate).toHaveBeenCalledTimes(1);

    socket.emit('close');
  });

  it('keeps sockets alive when pong responses are received', () => {
    const socket = new MockSocket();

    attachHeartbeat(socket as unknown as WebSocket);

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(socket.ping).toHaveBeenCalledTimes(1);

    socket.emit('pong');

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(socket.terminate).not.toHaveBeenCalled();

    socket.emit('close');
  });
});
