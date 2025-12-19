"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__testing = void 0;
exports.sendNotification = sendNotification;
exports.broadcastLeaderboardUpdate = broadcastLeaderboardUpdate;
exports.initWebSocketServer = initWebSocketServer;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const gameService_1 = require("../services/gameService");
const socketService_1 = require("../services/socketService");
const matchmakingService_js_1 = require("../services/matchmakingService.js");
const config_1 = require("../config");
const tournamentServer_1 = require("./tournamentServer");
const gameSessionRegistry_1 = require("../services/gameSessionRegistry");
const turnTimerService_1 = require("../services/turnTimerService");
const wsReconnectMetrics_1 = require("../metrics/wsReconnectMetrics");
const logger_1 = require("../utils/logger");
const HEARTBEAT_INTERVAL_MS = 10_000;
// Defensive default for replay limit if session config is unavailable
const REPLAY_LIMIT = config_1.config.session?.replayRetention ?? 50;
const connections = new Map();
const matchmakingConnections = new Map();
const notificationConnections = new Map();
const leaderboardConnections = new Map();
const wsLogger = new logger_1.Logger('WebSocketServer');
function resetSessionState() {
    connections.clear();
}
const gameServiceWithSummary = gameService_1.GameService;
const GAME_EVENT_TYPES = new Set(['join', 'move', 'roll', 'resign', 'draw', 'cube']);
function normalizeGameId(gameId) {
    const numericId = Number(gameId);
    return Number.isFinite(numericId) ? numericId : gameId;
}
async function fetchGameSummary(gameId) {
    if (typeof gameServiceWithSummary.getGameSummary !== 'function') {
        return null;
    }
    return gameServiceWithSummary.getGameSummary(normalizeGameId(gameId));
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asRecord(value) {
    return isRecord(value) ? value : {};
}
function isGameEventType(value) {
    return typeof value === 'string' && GAME_EVENT_TYPES.has(value);
}
function normalizeEventType(value) {
    const candidate = value.toLowerCase();
    return isGameEventType(candidate) ? candidate : null;
}
function shouldPersistEvent(message) {
    return message.type === 'move' || message.type === 'roll' || message.type === 'cube' || message.type === 'resign' || message.type === 'draw';
}
function buildTimerSnapshot(gameId) {
    const snapshot = turnTimerService_1.TurnTimerService.getSnapshot(gameId);
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
async function enrichMessagePayload(context, message) {
    const basePayload = asRecord(message.payload);
    if (message.type !== 'cube') {
        return {
            type: message.type,
            payload: basePayload
        };
    }
    if ('summary' in basePayload) {
        return { type: 'cube', payload: basePayload };
    }
    const summary = await fetchGameSummary(context.gameId);
    if (!summary) {
        return { type: 'cube', payload: basePayload };
    }
    return {
        type: 'cube',
        payload: {
            ...basePayload,
            summary,
            cube: basePayload.cube ?? summary.cube
        }
    };
}
async function persistEvent(context, message) {
    const enriched = await enrichMessagePayload(context, message);
    if (!shouldPersistEvent(enriched)) {
        return { sequence: null, message: enriched };
    }
    const sequence = await gameSessionRegistry_1.GameSessionRegistry.recordEvent({
        gameId: context.gameId,
        type: enriched.type,
        payload: asRecord(enriched.payload)
    });
    return { sequence, message: enriched };
}
function isAckMessageType(type) {
    return type === 'ack' || type === 'game_ack' || type === 'GAME_ACK';
}
const gameEventEmitter_1 = require("../services/gameEventEmitter");
function emitGameEvent(target, gameId, senderId, message, sequence) {
    const payloadRecord = asRecord(message.payload);
    const sequenceFragment = sequence !== null ? { sequence } : undefined;
    switch (message.type) {
        case 'join':
            socketService_1.SocketService.onGameJoin(target, { gameId, userId: senderId || 'system' }, senderId);
            break;
        case 'move':
            socketService_1.SocketService.onGameMove(target, {
                gameId,
                move: payloadRecord,
                userId: senderId || 'system',
                ...sequenceFragment
            }, senderId);
            break;
        case 'roll':
            socketService_1.SocketService.onGameMove(target, {
                gameId,
                move: { ...payloadRecord, eventType: 'roll' },
                userId: senderId || 'system',
                ...sequenceFragment
            }, senderId);
            break;
        case 'resign':
            socketService_1.SocketService.onGameResign(target, {
                gameId,
                userId: senderId || 'system',
                ...payloadRecord,
                ...sequenceFragment
            }, senderId);
            break;
        case 'draw':
            socketService_1.SocketService.onGameDraw(target, {
                gameId,
                userId: senderId || 'system',
                ...payloadRecord,
                ...sequenceFragment
            }, senderId);
            break;
        case 'cube': {
            const action = 'action' in payloadRecord && isRecord(payloadRecord.action) ? payloadRecord.action : payloadRecord;
            const summary = payloadRecord.summary;
            const cube = payloadRecord.cube;
            socketService_1.SocketService.onGameCube(target, {
                gameId,
                userId: senderId || 'system',
                action,
                ...(summary ? { summary } : {}),
                ...(cube ? { cube } : {}),
                ...sequenceFragment
            }, senderId);
            break;
        }
    }
}
function extractSequence(payload) {
    if (typeof payload === 'number' && Number.isFinite(payload)) {
        return payload;
    }
    if (typeof payload === 'string') {
        const numeric = Number(payload);
        return Number.isFinite(numeric) ? numeric : null;
    }
    if (isRecord(payload)) {
        const candidate = typeof payload.sequence !== 'undefined'
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
async function broadcastGameEvent(sender, message) {
    const context = connections.get(sender);
    if (!context) {
        return;
    }
    const { sequence, message: enriched } = await persistEvent(context, message);
    await gameSessionRegistry_1.GameSessionRegistry.updateHeartbeat(context.sessionId);
    for (const [socket, socketContext] of connections.entries()) {
        if (socketContext.gameId !== context.gameId) {
            continue;
        }
        emitGameEvent(socket, context.gameId, context.userId, enriched, sequence);
    }
}
// Subscribe to internal game events (e.g. from AI or HTTP controllers)
gameEventEmitter_1.gameEventEmitter.on('gameEvent', async (event) => {
    const { gameId, type, payload, userId } = event;
    try {
        const sequence = await gameSessionRegistry_1.GameSessionRegistry.recordEvent({
            gameId,
            type,
            payload
        });
        const message = { type, payload };
        for (const [socket, context] of connections.entries()) {
            if (context.gameId === gameId && socket.readyState === ws_1.WebSocket.OPEN) {
                emitGameEvent(socket, gameId, userId, message, sequence);
            }
        }
    }
    catch (error) {
        wsLogger.error('Failed to broadcast internal game event', { error, gameId, type });
    }
});
async function handleGameEvent(socket, message) {
    await broadcastGameEvent(socket, message);
}
async function handleAckMessage(socket, sequence) {
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
    await gameSessionRegistry_1.GameSessionRegistry.acknowledge(state.sessionId, sequence);
    await gameSessionRegistry_1.GameSessionRegistry.updateHeartbeat(state.sessionId);
    const minimumAck = await gameSessionRegistry_1.GameSessionRegistry.getMinimumAckSequence(state.gameId);
    if (typeof minimumAck === 'number') {
        await gameSessionRegistry_1.GameSessionRegistry.purgeEventsThrough(state.gameId, minimumAck);
    }
    const remainingBacklog = await gameSessionRegistry_1.GameSessionRegistry.fetchEventsSince(state.gameId, sequence, REPLAY_LIMIT);
    wsReconnectMetrics_1.wsReplayBacklogGauge.labels(state.gameId).set(remainingBacklog.length);
    wsLogger.info('Processed GAME_ACK', {
        gameId: state.gameId,
        userId: state.userId,
        acknowledgedSequence: sequence,
        remainingBacklog: remainingBacklog.length
    });
    socketService_1.SocketService.onGameAck(socket, {
        gameId: state.gameId,
        userId: state.userId,
        sequence
    }, state.userId);
}
async function streamReplayEvents(socket, state) {
    const events = await gameSessionRegistry_1.GameSessionRegistry.fetchEventsSince(state.gameId, state.lastAck, REPLAY_LIMIT);
    wsReconnectMetrics_1.wsReplayBacklogGauge.labels(state.gameId).set(events.length);
    if (events.length > 0) {
        wsLogger.info('Streaming replay events', {
            gameId: state.gameId,
            userId: state.userId,
            backlogSize: events.length
        });
    }
    for (const event of events) {
        const rawType = event.type;
        const eventType = typeof rawType === 'string' ? normalizeEventType(rawType) : null;
        if (!eventType) {
            continue;
        }
        const rawPayload = event.payload;
        const payload = isRecord(rawPayload) ? rawPayload : {};
        const sequence = event.sequence;
        if (typeof sequence !== 'number') {
            continue;
        }
        const replayPayload = {
            gameId: state.gameId,
            sequence,
            message: {
                type: eventType,
                payload
            }
        };
        socketService_1.SocketService.onGameReplay(socket, replayPayload, null);
    }
}
async function sendResumeHandshake(socket, state, token, issuedAt) {
    const summary = await fetchGameSummary(state.gameId);
    const timer = buildTimerSnapshot(state.gameId);
    const resumePayload = {
        gameId: state.gameId,
        userId: state.userId,
        token,
        issuedAt: issuedAt.getTime(),
        lastSequence: state.lastAck,
        ...(timer ? { timer } : {}),
        ...(summary ? { summary } : {})
    };
    socketService_1.SocketService.onGameResume(socket, resumePayload, state.userId);
}
function attachHeartbeat(socket) {
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
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            socket.ping();
        }
    }, HEARTBEAT_INTERVAL_MS);
    socket.on('close', () => {
        clearInterval(interval);
    });
}
const parseRequestUrl = (req) => {
    const host = req.headers.host ?? `localhost:${config_1.config.port ?? 3000}`;
    const rawUrl = req.url ?? '';
    try {
        return new URL(rawUrl, `http://${host}`);
    }
    catch {
        return null;
    }
};
function extractAuthToken(req) {
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
function verifyToken(token) {
    if (!config_1.config.accessTokenSecret) {
        return null;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.accessTokenSecret);
        return decoded?.userId ?? null;
    }
    catch {
        return null;
    }
}
function authenticateUser(req) {
    const token = extractAuthToken(req);
    if (!token) {
        return null;
    }
    return verifyToken(token);
}
function authenticateConnection(req, gameId) {
    const userId = authenticateUser(req);
    if (!userId) {
        return null;
    }
    return { userId, gameId };
}
async function authorizePlayer(context) {
    const gameService = gameService_1.GameService;
    const game = await gameService.getGame?.(context.gameId);
    if (!game) {
        return false;
    }
    const whitePlayerId = (game.whitePlayerId ?? game.player1?.id) ?? null;
    const blackPlayerId = (game.blackPlayerId ?? game.player2?.id) ?? null;
    return context.userId === whitePlayerId || context.userId === blackPlayerId;
}
function deriveStatusPayload(status) {
    if (status.searching) {
        return {
            status: 'searching',
            joinedAt: status.joinedAt,
            gameId: null
        };
    }
    if (status.gameId) {
        return {
            status: 'matched',
            joinedAt: null,
            gameId: status.gameId
        };
    }
    return {
        status: 'cancelled',
        joinedAt: null,
        gameId: null
    };
}
function sendMatchmakingStatus(userId, payload) {
    const sockets = matchmakingConnections.get(userId);
    if (!sockets) {
        return;
    }
    for (const socket of [...sockets]) {
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            socketService_1.SocketService.onMatchmakingStatus(socket, payload, userId);
        }
        else {
            sockets.delete(socket);
        }
    }
    if (sockets.size === 0) {
        matchmakingConnections.delete(userId);
    }
}
function handleStatusEvent(event) {
    const payload = {
        status: event.status,
        joinedAt: event.joinedAt,
        gameId: event.gameId
    };
    sendMatchmakingStatus(event.userId, payload);
}
function handleMatchFoundEvent(event) {
    const sockets = matchmakingConnections.get(event.userId);
    if (!sockets) {
        return;
    }
    for (const socket of [...sockets]) {
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            socketService_1.SocketService.onMatchmakingFound(socket, { gameId: event.gameId, opponentId: event.opponentId }, event.userId);
        }
        else {
            sockets.delete(socket);
        }
    }
    if (sockets.size === 0) {
        matchmakingConnections.delete(event.userId);
    }
}
function handleMatchmakingConnection(socket, req) {
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
    const status = matchmakingService_js_1.MatchmakingService.getStatus(userId);
    const payload = deriveStatusPayload(status);
    socketService_1.SocketService.onMatchmakingStatus(socket, payload, userId);
    socket.on('close', () => {
        const set = matchmakingConnections.get(userId);
        if (set) {
            set.delete(socket);
            if (set.size === 0) {
                matchmakingConnections.delete(userId);
                void matchmakingService_js_1.MatchmakingService.leaveQueue(userId);
            }
        }
    });
}
function handleNotificationConnection(socket, req) {
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
function handleLeaderboardConnection(socket, requestUrl) {
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
function sendNotification(userId, notification) {
    const sockets = notificationConnections.get(userId);
    if (!sockets || sockets.size === 0) {
        return;
    }
    for (const socket of [...sockets]) {
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            socketService_1.SocketService.onNotification(socket, notification, null);
        }
        else {
            sockets.delete(socket);
        }
    }
    if (sockets.size === 0) {
        notificationConnections.delete(userId);
    }
}
function broadcastLeaderboardUpdate(channel, payload) {
    const sockets = leaderboardConnections.get(channel);
    if (!sockets || sockets.size === 0) {
        return;
    }
    for (const socket of [...sockets]) {
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            socketService_1.SocketService.onLeaderboardUpdate(socket, payload, null);
        }
        else {
            sockets.delete(socket);
        }
    }
    if (sockets.size === 0) {
        leaderboardConnections.delete(channel);
    }
}
function initWebSocketServer(server) {
    const wss = new ws_1.WebSocketServer({ server });
    const unsubscribeStatus = matchmakingService_js_1.MatchmakingService.onStatus(handleStatusEvent);
    const unsubscribeMatch = matchmakingService_js_1.MatchmakingService.onMatchFound(handleMatchFoundEvent);
    wss.on('connection', async (socket, req) => {
        attachHeartbeat(socket);
        const requestUrl = parseRequestUrl(req);
        if (!requestUrl) {
            socket.close(1008, 'Invalid path');
            return;
        }
        if (requestUrl.pathname === '/ws/tournament') {
            await (0, tournamentServer_1.handleTournamentConnection)(socket, req, requestUrl);
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
            let validatedSession = null;
            if (incomingResumeToken) {
                validatedSession = await gameSessionRegistry_1.GameSessionRegistry.validateToken(incomingResumeToken);
                if (!validatedSession || validatedSession.payload.gid !== gameId) {
                    wsReconnectMetrics_1.wsResumeAttemptsTotal.labels('invalid_token').inc();
                    wsReconnectMetrics_1.wsResumeInvalidTokenTotal.inc();
                    wsLogger.warn('Rejected invalid resume token', {
                        gameId,
                        reason: !validatedSession ? 'validation_failed' : 'token_game_mismatch'
                    });
                    socket.close(1008, 'Invalid resume token');
                    return;
                }
                wsReconnectMetrics_1.wsResumeAttemptsTotal.labels('resumed').inc();
                wsLogger.info('Accepted resume token', {
                    gameId,
                    userId: validatedSession.payload.uid,
                    sessionId: validatedSession.session.id,
                    lastAckSequence: validatedSession.session.lastAckSequence
                });
            }
            let context = null;
            if (validatedSession) {
                context = { userId: validatedSession.payload.uid, gameId };
            }
            else {
                context = authenticateConnection(req, gameId);
                wsReconnectMetrics_1.wsResumeAttemptsTotal.labels('new_session').inc();
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
            const { token: resumeToken, session } = await gameSessionRegistry_1.GameSessionRegistry.issueSession(context.gameId, context.userId, issueOptions);
            const issuedAt = session.issuedAt instanceof Date ? session.issuedAt : new Date();
            const state = {
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
                let envelope;
                try {
                    envelope = JSON.parse(raw);
                }
                catch {
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
                const message = {
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
exports.default = initWebSocketServer;
exports.__testing = {
    attachHeartbeat,
    HEARTBEAT_INTERVAL_MS,
    resetSessionState
};
//# sourceMappingURL=server.js.map