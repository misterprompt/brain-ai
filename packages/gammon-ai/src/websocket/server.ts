import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';
import { GameService } from '../services/gameService';
import {
  SocketService,
  type MatchmakingStatusPayload,
  type LeaderboardUpdatePayload,
  type GameEventType,
  type MessagePayload,
  type GameReplayPayload,
  type GameResumePayload
} from '../services/socketService';
import type { NotificationEnvelope } from '../types/notifications';
import type { CubeSnapshot, GameSummary } from '../types/game';
import {
  MatchmakingService,
  type MatchmakingStatus,
  type MatchmakingStatusEvent,
  type MatchmakingMatchFoundEvent
} from '../services/matchmakingService.js';
import { config } from '../config';
import { handleTournamentConnection } from './tournamentServer';
import { GameSessionRegistry } from '../services/gameSessionRegistry';
import { TurnTimerService } from '../services/turnTimerService';
import { wsReplayBacklogGauge, wsResumeAttemptsTotal, wsResumeInvalidTokenTotal } from '../metrics/wsReconnectMetrics';
import { Logger } from '../utils/logger';

interface JwtPayload {
  userId: string;
}

interface AuthContext {
  userId: string;
  gameId: string;
}

interface ConnectionState extends AuthContext {
  userId: string;
  gameId: string;
  sessionId: string;
  lastAck: number;
}

type IncomingEnvelope = {
  type: string;
  payload?: unknown;
};

const HEARTBEAT_INTERVAL_MS = 10_000;
// Defensive default for replay limit if session config is unavailable
const REPLAY_LIMIT = config.session?.replayRetention ?? 50;

const connections = new Map<WebSocket, ConnectionState>();
const matchmakingConnections = new Map<string, Set<WebSocket>>();
const notificationConnections = new Map<string, Set<WebSocket>>();
const leaderboardConnections = new Map<string, Set<WebSocket>>();

const wsLogger = new Logger('WebSocketServer');

function resetSessionState() {
  connections.clear();
}

const gameServiceWithSummary = GameService as unknown as {
  getGameSummary?: (id: string | number) => Promise<GameSummary | null>;
};

const GAME_EVENT_TYPES = new Set<GameEventType>(['join', 'move', 'roll', 'resign', 'draw', 'cube']);

function normalizeGameId(gameId: string): string | number {
  const numericId = Number(gameId);
  return Number.isFinite(numericId) ? numericId : gameId;
}

async function fetchGameSummary(gameId: string): Promise<GameSummary | null> {
  if (typeof gameServiceWithSummary.getGameSummary !== 'function') {
    return null;
  }

  return gameServiceWithSummary.getGameSummary(normalizeGameId(gameId));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isGameEventType(value: unknown): value is GameEventType {
  return typeof value === 'string' && GAME_EVENT_TYPES.has(value as GameEventType);
}

function normalizeEventType(value: string): GameEventType | null {
  const candidate = value.toLowerCase();
  return isGameEventType(candidate) ? (candidate as GameEventType) : null;
}

function shouldPersistEvent(message: MessagePayload): boolean {
  return message.type === 'move' || message.type === 'roll' || message.type === 'cube' || message.type === 'resign' || message.type === 'draw';
}

function buildTimerSnapshot(gameId: string): GameResumePayload['timer'] | undefined {
  const snapshot = TurnTimerService.getSnapshot(gameId);
  if (!snapshot) {
    return undefined;
  }

  return {
    active: snapshot.paused ? null : snapshot.active,
    whiteTimeMs: snapshot.whiteRemainingMs,
    blackTimeMs: snapshot.blackRemainingMs,
    paused: snapshot.paused
  };
}

async function enrichMessagePayload(context: ConnectionState, message: MessagePayload): Promise<MessagePayload> {
  const basePayload = asRecord(message.payload);

  if (message.type !== 'cube') {
    return {
      type: message.type,
      payload: basePayload
    } satisfies MessagePayload;
  }

  if ('summary' in basePayload) {
    return { type: 'cube', payload: basePayload } satisfies MessagePayload;
  }

  const summary = await fetchGameSummary(context.gameId);
  if (!summary) {
    return { type: 'cube', payload: basePayload } satisfies MessagePayload;
  }

  return {
    type: 'cube',
    payload: {
      ...basePayload,
      summary,
      cube: basePayload.cube ?? summary.cube
    }
  } satisfies MessagePayload;
}

async function persistEvent(context: ConnectionState, message: MessagePayload): Promise<{ sequence: number | null; message: MessagePayload }> {
  const enriched = await enrichMessagePayload(context, message);

  if (!shouldPersistEvent(enriched)) {
    return { sequence: null, message: enriched };
  }

  const sequence = await GameSessionRegistry.recordEvent({
    gameId: context.gameId,
    type: enriched.type,
    payload: asRecord(enriched.payload)
  });

  return { sequence, message: enriched };
}

function isAckMessageType(type: string): boolean {
  return type === 'ack' || type === 'game_ack' || type === 'GAME_ACK';
}

import { gameEventEmitter, type GameEvent } from '../services/gameEventEmitter';

function emitGameEvent(target: WebSocket, gameId: string, senderId: string | null, message: MessagePayload, sequence: number | null) {
  const payloadRecord = asRecord(message.payload);
  const sequenceFragment = sequence !== null ? { sequence } : undefined;

  switch (message.type) {
    case 'join':
      SocketService.onGameJoin(target, { gameId, userId: senderId || 'system' }, senderId);
      break;
    case 'move':
      SocketService.onGameMove(
        target,
        {
          gameId,
          move: payloadRecord,
          userId: senderId || 'system',
          ...sequenceFragment
        },
        senderId
      );
      break;
    case 'roll':
			SocketService.onGameMove(
				target,
				{
					gameId,
					move: { ...payloadRecord, eventType: 'roll' },
					userId: senderId || 'system',
					...sequenceFragment
				},
				senderId
			);
			break;
    case 'resign':
      SocketService.onGameResign(
        target,
        {
          gameId,
          userId: senderId || 'system',
          ...payloadRecord,
          ...sequenceFragment
        },
        senderId
      );
      break;
    case 'draw':
      SocketService.onGameDraw(
        target,
        {
          gameId,
          userId: senderId || 'system',
          ...payloadRecord,
          ...sequenceFragment
        },
        senderId
      );
      break;
    case 'cube': {
      const action = 'action' in payloadRecord && isRecord(payloadRecord.action) ? payloadRecord.action : payloadRecord;
      const summary = payloadRecord.summary as GameSummary | undefined;
      const cube = payloadRecord.cube as CubeSnapshot | undefined;
      SocketService.onGameCube(
        target,
        {
          gameId,
          userId: senderId || 'system',
          action,
          ...(summary ? { summary } : {}),
          ...(cube ? { cube } : {}),
          ...sequenceFragment
        },
        senderId
      );
      break;
    }
  }
}

function extractSequence(payload: unknown): number | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return payload;
  }

  if (typeof payload === 'string') {
    const numeric = Number(payload);
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (isRecord(payload)) {
    const candidate =
      typeof payload.sequence !== 'undefined'
        ? payload.sequence
        : typeof payload.lastSequence !== 'undefined'
          ? payload.lastSequence
          : undefined;

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === 'string') {
      const numeric = Number(candidate);
      return Number.isFinite(numeric) ? numeric : null;
    }
  }

  return null;
}

async function broadcastGameEvent(sender: WebSocket, message: MessagePayload) {
  const context = connections.get(sender);
  if (!context) {
    return;
  }

  const { sequence, message: enriched } = await persistEvent(context, message);
  await GameSessionRegistry.updateHeartbeat(context.sessionId);

  for (const [socket, socketContext] of connections.entries()) {
    if (socketContext.gameId !== context.gameId) {
      continue;
    }

    emitGameEvent(socket, context.gameId, context.userId, enriched, sequence);
  }
}

// Subscribe to internal game events (e.g. from AI or HTTP controllers)
gameEventEmitter.on('gameEvent', async (event: GameEvent) => {
  const { gameId, type, payload, userId } = event;

  try {
    const sequence = await GameSessionRegistry.recordEvent({
      gameId,
      type,
      payload
    });

    const message: MessagePayload = { type, payload };

    for (const [socket, context] of connections.entries()) {
      if (context.gameId === gameId && socket.readyState === WebSocket.OPEN) {
        emitGameEvent(socket, gameId, userId, message, sequence);
      }
    }
  } catch (error) {
    wsLogger.error('Failed to broadcast internal game event', { error, gameId, type });
  }
});

async function handleGameEvent(socket: WebSocket, message: MessagePayload) {
  await broadcastGameEvent(socket, message);
}

async function handleAckMessage(socket: WebSocket, sequence: number) {
  const state = connections.get(socket);
  if (!state) {
    return;
  }

  if (!Number.isFinite(sequence) || sequence < 0) {
    wsLogger.warn('Received invalid ACK payload', {
      gameId: state?.gameId,
      userId: state?.userId,
      sequence
    });
    socket.send('Invalid ACK payload');
    return;
  }

  if (sequence < state.lastAck) {
    wsLogger.debug('Ignoring out-of-order ACK', {
      gameId: state.gameId,
      userId: state.userId,
      sequence,
      lastAck: state.lastAck
    });
    return;
  }

  state.lastAck = sequence;
  connections.set(socket, state);

  await GameSessionRegistry.acknowledge(state.sessionId, sequence);
  await GameSessionRegistry.updateHeartbeat(state.sessionId);

  const minimumAck = await GameSessionRegistry.getMinimumAckSequence(state.gameId);
  if (typeof minimumAck === 'number') {
    await GameSessionRegistry.purgeEventsThrough(state.gameId, minimumAck);
  }

  const remainingBacklog = await GameSessionRegistry.fetchEventsSince(state.gameId, sequence, REPLAY_LIMIT);
  wsReplayBacklogGauge.labels(state.gameId).set(remainingBacklog.length);
  wsLogger.info('Processed GAME_ACK', {
    gameId: state.gameId,
    userId: state.userId,
    acknowledgedSequence: sequence,
    remainingBacklog: remainingBacklog.length
  });

  SocketService.onGameAck(
    socket,
    {
      gameId: state.gameId,
      userId: state.userId,
      sequence
    },
    state.userId
  );
}

async function streamReplayEvents(socket: WebSocket, state: ConnectionState) {
  const events = await GameSessionRegistry.fetchEventsSince(state.gameId, state.lastAck, REPLAY_LIMIT);

  wsReplayBacklogGauge.labels(state.gameId).set(events.length);
  if (events.length > 0) {
    wsLogger.info('Streaming replay events', {
      gameId: state.gameId,
      userId: state.userId,
      backlogSize: events.length
    });
  }

  for (const event of events) {
    const rawType = (event as { type?: unknown }).type;
    const eventType = typeof rawType === 'string' ? normalizeEventType(rawType) : null;
    if (!eventType) {
      continue;
    }

    const rawPayload = (event as { payload?: unknown }).payload;
    const payload = isRecord(rawPayload) ? (rawPayload as Record<string, unknown>) : {};
    const sequence = (event as { sequence?: unknown }).sequence;
    if (typeof sequence !== 'number') {
      continue;
    }

    const replayPayload: GameReplayPayload = {
      gameId: state.gameId,
      sequence,
      message: {
        type: eventType,
        payload
      }
    };

    SocketService.onGameReplay(socket, replayPayload, null);
  }
}

async function sendResumeHandshake(socket: WebSocket, state: ConnectionState, token: string, issuedAt: Date) {
  const summary = await fetchGameSummary(state.gameId);
  const timer = buildTimerSnapshot(state.gameId);

  const resumePayload: GameResumePayload = {
    gameId: state.gameId,
    userId: state.userId,
    token,
    issuedAt: issuedAt.getTime(),
    lastSequence: state.lastAck,
    ...(timer ? { timer } : {}),
    ...(summary ? { summary } : {})
  };

  SocketService.onGameResume(socket, resumePayload, state.userId);
}

function attachHeartbeat(socket: WebSocket) {
  let isAlive = true;
  socket.on('pong', () => {
    isAlive = true;
  });
  const interval = setInterval(() => {
    if (!isAlive) {
      socket.terminate();
      clearInterval(interval);
      return;
    }
    isAlive = false;
    if (socket.readyState === WebSocket.OPEN) {
      socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
  socket.on('close', () => {
    clearInterval(interval);
  });
}

const parseRequestUrl = (req: IncomingMessage): URL | null => {
  const host = req.headers.host ?? `localhost:${config.port ?? 3000}`;
  const rawUrl = req.url ?? '';

  try {
    return new URL(rawUrl, `http://${host}`);
  } catch {
    return null;
  }
};

function extractAuthToken(req: IncomingMessage): string | null {
  let authHeader = req.headers['authorization'];

  if (!authHeader) {
    const protocolHeader = req.headers['sec-websocket-protocol'];
    if (typeof protocolHeader === 'string') {
      const protocols = protocolHeader.split(',').map((value) => value.trim());
      const bearerProtocol = protocols.find((value) => value.startsWith('Bearer '));
      if (bearerProtocol) {
        authHeader = bearerProtocol;
      }
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

function verifyToken(token: string): string | null {
  if (!config.accessTokenSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret) as JwtPayload;
    return decoded?.userId ?? null;
  } catch {
    return null;
  }
}

function authenticateUser(req: IncomingMessage): string | null {
  const token = extractAuthToken(req);
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

function authenticateConnection(req: IncomingMessage, gameId: string): AuthContext | null {
  const userId = authenticateUser(req);
  if (!userId) {
    return null;
  }

  return { userId, gameId };
}

async function authorizePlayer(context: AuthContext): Promise<boolean> {
  const gameService = GameService as unknown as {
    getGame?: (id: string) => Promise<(Record<string, unknown> & { whitePlayerId?: string | null; blackPlayerId?: string | null }) | null>;
  };

  const game = await gameService.getGame?.(context.gameId);

  if (!game) {
    return false;
  }

  const whitePlayerId = (game.whitePlayerId ?? (game as any).player1?.id) ?? null;
  const blackPlayerId = (game.blackPlayerId ?? (game as any).player2?.id) ?? null;

  return context.userId === whitePlayerId || context.userId === blackPlayerId;
}

function deriveStatusPayload(status: MatchmakingStatus): MatchmakingStatusPayload {
  if (status.searching) {
    return {
      status: 'searching',
      joinedAt: status.joinedAt,
      gameId: null
    } satisfies MatchmakingStatusPayload;
  }

  if (status.gameId) {
    return {
      status: 'matched',
      joinedAt: null,
      gameId: status.gameId
    } satisfies MatchmakingStatusPayload;
  }

  return {
    status: 'cancelled',
    joinedAt: null,
    gameId: null
  } satisfies MatchmakingStatusPayload;
}

function sendMatchmakingStatus(userId: string, payload: MatchmakingStatusPayload): void {
  const sockets = matchmakingConnections.get(userId);
  if (!sockets) {
    return;
  }

  for (const socket of [...sockets]) {
    if (socket.readyState === WebSocket.OPEN) {
      SocketService.onMatchmakingStatus(socket, payload, userId);
    } else {
      sockets.delete(socket);
    }
  }

  if (sockets.size === 0) {
    matchmakingConnections.delete(userId);
  }
}

function handleStatusEvent(event: MatchmakingStatusEvent): void {
  const payload: MatchmakingStatusPayload = {
    status: event.status,
    joinedAt: event.joinedAt,
    gameId: event.gameId
  };

  sendMatchmakingStatus(event.userId, payload);
}

function handleMatchFoundEvent(event: MatchmakingMatchFoundEvent): void {
  const sockets = matchmakingConnections.get(event.userId);
  if (!sockets) {
    return;
  }

  for (const socket of [...sockets]) {
    if (socket.readyState === WebSocket.OPEN) {
      SocketService.onMatchmakingFound(socket, { gameId: event.gameId, opponentId: event.opponentId }, event.userId);
    } else {
      sockets.delete(socket);
    }
  }

  if (sockets.size === 0) {
    matchmakingConnections.delete(event.userId);
  }
}

function handleMatchmakingConnection(socket: WebSocket, req: IncomingMessage): void {
  const userId = authenticateUser(req);

  if (!userId) {
    socket.close(1008, 'Unauthorized');
    return;
  }

  let sockets = matchmakingConnections.get(userId);
  if (!sockets) {
    sockets = new Set();
    matchmakingConnections.set(userId, sockets);
  }
  sockets.add(socket);

  const status = MatchmakingService.getStatus(userId);
  const payload = deriveStatusPayload(status);
  SocketService.onMatchmakingStatus(socket, payload, userId);

  socket.on('close', () => {
    const set = matchmakingConnections.get(userId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        matchmakingConnections.delete(userId);
        void MatchmakingService.leaveQueue(userId);
      }
    }
  });
}

function handleNotificationConnection(socket: WebSocket, req: IncomingMessage): void {
  const userId = authenticateUser(req);

  if (!userId) {
    socket.close(1008, 'Unauthorized');
    return;
  }

  let sockets = notificationConnections.get(userId);
  if (!sockets) {
    sockets = new Set();
    notificationConnections.set(userId, sockets);
  }
  sockets.add(socket);

  socket.on('close', () => {
    const set = notificationConnections.get(userId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        notificationConnections.delete(userId);
      }
    }
  });
}

function handleLeaderboardConnection(socket: WebSocket, requestUrl: URL): void {
  const channel = requestUrl.pathname.replace('/ws/leaderboard', '').replace(/^\//, '');

  if (!channel) {
    socket.close(1008, 'Missing leaderboard channel');
    return;
  }

  let sockets = leaderboardConnections.get(channel);
  if (!sockets) {
    sockets = new Set();
    leaderboardConnections.set(channel, sockets);
  }

  sockets.add(socket);

  socket.on('close', () => {
    const set = leaderboardConnections.get(channel);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        leaderboardConnections.delete(channel);
      }
    }
  });
}

export function sendNotification(userId: string, notification: NotificationEnvelope): void {
  const sockets = notificationConnections.get(userId);
  if (!sockets || sockets.size === 0) {
    return;
  }

  for (const socket of [...sockets]) {
    if (socket.readyState === WebSocket.OPEN) {
      SocketService.onNotification(socket, notification, null);
    } else {
      sockets.delete(socket);
    }
  }

  if (sockets.size === 0) {
    notificationConnections.delete(userId);
  }
}

export function broadcastLeaderboardUpdate(channel: string, payload: LeaderboardUpdatePayload): void {
  const sockets = leaderboardConnections.get(channel);

  if (!sockets || sockets.size === 0) {
    return;
  }

  for (const socket of [...sockets]) {
    if (socket.readyState === WebSocket.OPEN) {
      SocketService.onLeaderboardUpdate(socket, payload, null);
    } else {
      sockets.delete(socket);
    }
  }

  if (sockets.size === 0) {
    leaderboardConnections.delete(channel);
  }
}

export function initWebSocketServer(server: import('http').Server) {
  const wss = new WebSocketServer({ server });
  const unsubscribeStatus = MatchmakingService.onStatus(handleStatusEvent);
  const unsubscribeMatch = MatchmakingService.onMatchFound(handleMatchFoundEvent);

  wss.on('connection', async (socket: WebSocket, req) => {
    attachHeartbeat(socket);
    const requestUrl = parseRequestUrl(req);

    if (!requestUrl) {
      socket.close(1008, 'Invalid path');
      return;
    }

    if (requestUrl.pathname === '/ws/tournament') {
      await handleTournamentConnection(socket, req, requestUrl);
      return;
    }

    if (requestUrl.pathname === '/ws/matchmaking') {
      handleMatchmakingConnection(socket, req);
      return;
    }

    if (requestUrl.pathname === '/ws/notifications') {
      handleNotificationConnection(socket, req);
      return;
    }

    if (requestUrl.pathname.startsWith('/ws/leaderboard')) {
      handleLeaderboardConnection(socket, requestUrl);
      return;
    }

    if (requestUrl.pathname.startsWith('/ws/game')) {
      const gameId = requestUrl.searchParams.get('gameId');
      const incomingResumeToken = requestUrl.searchParams.get('resume');

      if (!gameId) {
        socket.close(1008, 'Missing game identifier');
        return;
      }

      let validatedSession: Awaited<ReturnType<typeof GameSessionRegistry.validateToken>> | null = null;
      if (incomingResumeToken) {
        validatedSession = await GameSessionRegistry.validateToken(incomingResumeToken);
        if (!validatedSession || validatedSession.payload.gid !== gameId) {
          wsResumeAttemptsTotal.labels('invalid_token').inc();
          wsResumeInvalidTokenTotal.inc();
          wsLogger.warn('Rejected invalid resume token', {
            gameId,
            reason: !validatedSession ? 'validation_failed' : 'token_game_mismatch'
          });
          socket.close(1008, 'Invalid resume token');
          return;
        }

        wsResumeAttemptsTotal.labels('resumed').inc();
        wsLogger.info('Accepted resume token', {
          gameId,
          userId: validatedSession.payload.uid,
          sessionId: validatedSession.session.id,
          lastAckSequence: validatedSession.session.lastAckSequence
        });
      }

      let context: AuthContext | null = null;
      if (validatedSession) {
        context = { userId: validatedSession.payload.uid, gameId } satisfies AuthContext;
      } else {
        context = authenticateConnection(req, gameId);
        wsResumeAttemptsTotal.labels('new_session').inc();
        wsLogger.info('Started new WS session', {
          gameId,
          userId: context?.userId ?? 'anonymous'
        });
      }

      if (!context) {
        socket.close(1008, 'Unauthorized');
        return;
      }

      if (!(await authorizePlayer(context))) {
        socket.close(1008, 'Forbidden');
        return;
      }

      const issueOptions = validatedSession
        ? { lastAckSequence: validatedSession.session.lastAckSequence }
        : undefined;
      const { token: resumeToken, session } = await GameSessionRegistry.issueSession(context.gameId, context.userId, issueOptions);

      const issuedAt = session.issuedAt instanceof Date ? session.issuedAt : new Date();
      const state: ConnectionState = {
        ...context,
        sessionId: session.id,
        lastAck: session.lastAckSequence
      };

      connections.set(socket, state);

      await sendResumeHandshake(socket, state, resumeToken, issuedAt);
      wsLogger.info('Dispatched resume handshake', {
        gameId,
        userId: state.userId,
        sessionId: state.sessionId,
        lastSequence: state.lastAck
      });

      await streamReplayEvents(socket, state);

      socket.on('message', async (rawMessage) => {
        const raw = String(rawMessage);

        let envelope: IncomingEnvelope;
        try {
          envelope = JSON.parse(raw) as IncomingEnvelope;
        } catch {
          socket.send('Invalid message');
          return;
        }

        if (!isRecord(envelope) || typeof envelope.type !== 'string') {
          socket.send('Invalid message');
          return;
        }

        if (isAckMessageType(envelope.type)) {
          const sequence = extractSequence(envelope.payload);
          if (sequence === null) {
            socket.send('Invalid ACK payload');
            return;
          }
          await handleAckMessage(socket, sequence);
          return;
        }

        const normalizedType = normalizeEventType(envelope.type);
        if (!normalizedType) {
          socket.send('Invalid message');
          return;
        }

        const payload = isRecord(envelope.payload) ? envelope.payload : {};
        const message: MessagePayload = {
          type: normalizedType,
          payload
        };

        await handleGameEvent(socket, message);
      });

      socket.on('close', () => {
        connections.delete(socket);
      });

      return;
    }

    socket.close(1008, 'Invalid path');
  });

  wss.on('close', () => {
    unsubscribeStatus();
    unsubscribeMatch();
    matchmakingConnections.clear();
    notificationConnections.clear();
    leaderboardConnections.clear();
  });

  return wss;
}

export default initWebSocketServer;

export const __testing = {
  attachHeartbeat,
  HEARTBEAT_INTERVAL_MS,
  resetSessionState
};
