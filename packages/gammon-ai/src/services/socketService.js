"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = exports.SOCKET_ROUTES = void 0;
exports.SOCKET_ROUTES = {
    game: (id) => `wss://gammon-guru-api.onrender.com/ws/game/${id}`,
    chat: (id) => `wss://gammon-guru-api.onrender.com/ws/chat/${id}`,
    tournament: (id) => `wss://gammon-guru-api.onrender.com/ws/tournament/${id}`,
    notifications: 'wss://gammon-guru-api.onrender.com/ws/notifications',
    leaderboard: (channel) => `wss://gammon-guru-api.onrender.com/ws/leaderboard/${channel}`
};
function buildMessage(type, payload, senderId) {
    return {
        type,
        payload,
        timestamp: new Date().toISOString(),
        senderId
    };
}
function emit(socket, type, payload, senderId) {
    const message = buildMessage(type, payload, senderId);
    socket.send(JSON.stringify(message));
}
exports.SocketService = {
    onGameJoin(socket, payload, senderId = null) {
        emit(socket, 'GAME_JOIN', payload, senderId);
    },
    onGameMove(socket, payload, senderId = null) {
        emit(socket, 'GAME_MOVE', payload, senderId);
    },
    onGameCube(socket, payload, senderId = null) {
        emit(socket, 'GAME_CUBE', payload, senderId);
    },
    onGameResign(socket, payload, senderId = null) {
        emit(socket, 'GAME_RESIGN', payload, senderId);
    },
    onGameDraw(socket, payload, senderId = null) {
        emit(socket, 'GAME_DRAW', payload, senderId);
    },
    onGameResume(socket, payload, senderId = null) {
        emit(socket, 'GAME_RESUME', payload, senderId);
    },
    onGameReplay(socket, payload, senderId = null) {
        emit(socket, 'GAME_REPLAY', payload, senderId);
    },
    onGameAck(socket, payload, senderId = null) {
        emit(socket, 'GAME_ACK', payload, senderId);
    },
    onChatMessage(socket, payload, senderId = null) {
        emit(socket, 'CHAT_MESSAGE', payload, senderId);
    },
    onTournamentUpdate(socket, payload, senderId = null) {
        emit(socket, 'TOURNAMENT_UPDATE', payload, senderId);
    },
    onNotification(socket, payload, senderId = null) {
        emit(socket, 'NOTIFICATION', payload, senderId);
    },
    onMatchmakingStatus(socket, payload, senderId = null) {
        emit(socket, 'MATCHMAKING_STATUS', payload, senderId);
    },
    onMatchmakingFound(socket, payload, senderId = null) {
        emit(socket, 'MATCHMAKING_FOUND', payload, senderId);
    },
    onLeaderboardUpdate(socket, payload, senderId = null) {
        emit(socket, 'LEADERBOARD_UPDATE', payload, senderId);
    }
};
//# sourceMappingURL=socketService.js.map