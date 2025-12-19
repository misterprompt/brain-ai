"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const node_events_1 = require("node:events");
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../lib/prisma");
const notificationService_1 = require("./notificationService");
const queue = new Map();
const lastGameForUser = new Map();
const emitter = new node_events_1.EventEmitter();
function emitStatus(event) {
    emitter.emit('status', event);
}
function emitMatchFound(event) {
    emitter.emit('match-found', event);
}
async function createPendingGame(whitePlayerId, blackPlayerId) {
    const gameId = (0, node_crypto_1.randomUUID)();
    await prisma_1.prisma.games.create({
        data: {
            id: gameId,
            whitePlayerId,
            blackPlayerId,
            gameMode: 'PLAYER_VS_PLAYER',
            status: 'WAITING'
        }
    });
    return gameId;
}
async function tryMatch(userId) {
    const candidate = queue.get(userId);
    if (!candidate) {
        return;
    }
    for (const [otherUserId] of queue.entries()) {
        if (otherUserId === userId) {
            continue;
        }
        queue.delete(userId);
        queue.delete(otherUserId);
        const gameId = await createPendingGame(userId, otherUserId);
        lastGameForUser.set(userId, gameId);
        lastGameForUser.set(otherUserId, gameId);
        emitStatus({ userId, status: 'matched', joinedAt: null, gameId });
        emitStatus({ userId: otherUserId, status: 'matched', joinedAt: null, gameId });
        emitMatchFound({ userId, opponentId: otherUserId, gameId });
        emitMatchFound({ userId: otherUserId, opponentId: userId, gameId });
        notificationService_1.notificationService.notifyInvitation(userId, {
            source: 'match',
            contextId: gameId,
            inviterId: otherUserId,
            inviterUsername: null
        });
        notificationService_1.notificationService.notifyInvitation(otherUserId, {
            source: 'match',
            contextId: gameId,
            inviterId: userId,
            inviterUsername: null
        });
        break;
    }
}
exports.MatchmakingService = {
    async joinQueue(userId, preferences) {
        queue.set(userId, { preferences, joinedAt: Date.now() });
        lastGameForUser.delete(userId);
        const entry = queue.get(userId);
        emitStatus({ userId, status: 'searching', joinedAt: entry.joinedAt, gameId: null });
        await tryMatch(userId);
    },
    async leaveQueue(userId) {
        queue.delete(userId);
        lastGameForUser.delete(userId);
        emitStatus({ userId, status: 'cancelled', joinedAt: null, gameId: null });
    },
    getStatus(userId) {
        const entry = queue.get(userId);
        const lastGameId = lastGameForUser.get(userId) ?? null;
        if (!entry) {
            return {
                searching: false,
                preferences: null,
                joinedAt: null,
                gameId: lastGameId
            };
        }
        return {
            searching: true,
            preferences: entry.preferences,
            joinedAt: entry.joinedAt,
            gameId: lastGameId
        };
    },
    onStatus(listener) {
        emitter.on('status', listener);
        return () => emitter.removeListener('status', listener);
    },
    onMatchFound(listener) {
        emitter.on('match-found', listener);
        return () => emitter.removeListener('match-found', listener);
    },
    clear() {
        queue.clear();
        lastGameForUser.clear();
    }
};
//# sourceMappingURL=matchmakingService.js.map