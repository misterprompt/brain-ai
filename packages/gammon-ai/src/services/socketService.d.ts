import type WebSocket from 'ws';
import type { NotificationEnvelope } from '../types/notifications';
import type { CubeSnapshot, GameSummary, PlayerColor } from '../types/game';
export type SocketMessageType = 'GAME_JOIN' | 'GAME_MOVE' | 'GAME_CUBE' | 'GAME_RESIGN' | 'GAME_DRAW' | 'GAME_RESUME' | 'GAME_REPLAY' | 'GAME_ACK' | 'CHAT_MESSAGE' | 'TOURNAMENT_UPDATE' | 'NOTIFICATION' | 'MATCHMAKING_STATUS' | 'MATCHMAKING_FOUND' | 'LEADERBOARD_UPDATE';
export interface SocketMessage<TPayload = unknown> {
    type: SocketMessageType;
    payload: TPayload;
    timestamp: string;
    senderId: string | null;
}
export type GameEventType = 'join' | 'move' | 'roll' | 'resign' | 'draw' | 'cube';
export interface MessagePayload {
    type: GameEventType;
    payload: Record<string, unknown>;
}
export interface GameJoinPayload {
    gameId: string;
    userId: string;
}
export interface GameMovePayload {
    gameId: string;
    move: Record<string, unknown>;
    userId: string;
    sequence?: number;
}
export interface GameCubePayload {
    gameId: string;
    action: Record<string, unknown>;
    userId: string;
    summary?: GameSummary;
    cube?: CubeSnapshot;
    sequence?: number;
}
export interface GameResumePayload {
    gameId: string;
    userId: string;
    token: string;
    issuedAt: number;
    lastSequence: number;
    timer?: {
        active: PlayerColor | null;
        whiteTimeMs: number | null;
        blackTimeMs: number | null;
        paused: boolean;
    };
    summary?: GameSummary;
}
export interface GameReplayPayload {
    gameId: string;
    sequence: number;
    message: MessagePayload;
}
export interface GameAckPayload {
    gameId: string;
    sequence: number;
    userId: string;
}
export interface GameResignPayload {
    gameId: string;
    userId: string;
    sequence?: number;
}
export interface GameDrawPayload {
    gameId: string;
    userId: string;
    sequence?: number;
}
export interface ChatMessagePayload {
    roomId: string;
    message: string;
    userId: string;
}
export interface TournamentUpdatePayload {
    tournamentId: string;
    state: Record<string, unknown>;
}
export interface MatchmakingStatusPayload {
    status: 'searching' | 'matched' | 'cancelled';
    joinedAt?: number | null;
    gameId?: string | null;
}
export interface MatchmakingFoundPayload {
    gameId: string;
    opponentId: string;
}
export type LeaderboardScopePayload = {
    type: 'global';
    sort: 'elo' | 'winrate' | 'games';
} | {
    type: 'country';
    country: string;
    sort: 'elo' | 'winrate' | 'games';
} | {
    type: 'season';
    seasonId: string;
    sort: 'elo' | 'winrate' | 'games';
};
export interface LeaderboardEntryPayload {
    id: string;
    username: string | null;
    country: string | null;
    elo: number;
    winrate: number;
    gamesPlayed: number;
    gamesWon?: number;
    rankGlobal?: number | null;
    rankCountry?: number | null;
}
export interface LeaderboardUpdatePayload {
    scope: LeaderboardScopePayload;
    timestamp: string;
    entries: LeaderboardEntryPayload[];
    total: number;
}
export declare const SOCKET_ROUTES: {
    readonly game: (id: string) => string;
    readonly chat: (id: string) => string;
    readonly tournament: (id: string) => string;
    readonly notifications: "wss://gammon-guru-api.onrender.com/ws/notifications";
    readonly leaderboard: (channel: string) => string;
};
export declare const SocketService: {
    onGameJoin(socket: WebSocket, payload: GameJoinPayload, senderId?: string | null): void;
    onGameMove(socket: WebSocket, payload: GameMovePayload, senderId?: string | null): void;
    onGameCube(socket: WebSocket, payload: GameCubePayload, senderId?: string | null): void;
    onGameResign(socket: WebSocket, payload: GameResignPayload, senderId?: string | null): void;
    onGameDraw(socket: WebSocket, payload: GameDrawPayload, senderId?: string | null): void;
    onGameResume(socket: WebSocket, payload: GameResumePayload, senderId?: string | null): void;
    onGameReplay(socket: WebSocket, payload: GameReplayPayload, senderId?: string | null): void;
    onGameAck(socket: WebSocket, payload: GameAckPayload, senderId?: string | null): void;
    onChatMessage(socket: WebSocket, payload: ChatMessagePayload, senderId?: string | null): void;
    onTournamentUpdate(socket: WebSocket, payload: TournamentUpdatePayload, senderId?: string | null): void;
    onNotification(socket: WebSocket, payload: NotificationEnvelope, senderId?: string | null): void;
    onMatchmakingStatus(socket: WebSocket, payload: MatchmakingStatusPayload, senderId?: string | null): void;
    onMatchmakingFound(socket: WebSocket, payload: MatchmakingFoundPayload, senderId?: string | null): void;
    onLeaderboardUpdate(socket: WebSocket, payload: LeaderboardUpdatePayload, senderId?: string | null): void;
};
//# sourceMappingURL=socketService.d.ts.map