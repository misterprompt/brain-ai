import { EventEmitter } from 'events';
import type { GameEventType } from './socketService';

export const gameEventEmitter = new EventEmitter();

export interface GameEvent {
    gameId: string;
    type: GameEventType;
    payload: Record<string, unknown>;
    userId: string | null; // null for system/AI
}

export function emitGameEvent(gameId: string, type: GameEventType, payload: Record<string, unknown>, userId: string | null = null) {
    gameEventEmitter.emit('gameEvent', { gameId, type, payload, userId } satisfies GameEvent);
}
