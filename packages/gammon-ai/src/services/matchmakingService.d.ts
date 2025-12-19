import { EventEmitter } from 'node:events';
export type MatchmakingStatus = {
    searching: boolean;
    preferences: Record<string, unknown> | null;
    joinedAt: number | null;
    gameId: string | null;
};
export type MatchmakingStatusEvent = {
    userId: string;
    status: 'searching' | 'matched' | 'cancelled';
    joinedAt: number | null;
    gameId: string | null;
};
export type MatchmakingMatchFoundEvent = {
    userId: string;
    opponentId: string;
    gameId: string;
};
export declare const MatchmakingService: {
    joinQueue(userId: string, preferences: Record<string, unknown>): Promise<void>;
    leaveQueue(userId: string): Promise<void>;
    getStatus(userId: string): MatchmakingStatus;
    onStatus(listener: (event: MatchmakingStatusEvent) => void): () => EventEmitter<[never]>;
    onMatchFound(listener: (event: MatchmakingMatchFoundEvent) => void): () => EventEmitter<[never]>;
    clear(): void;
};
//# sourceMappingURL=matchmakingService.d.ts.map