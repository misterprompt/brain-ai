import { EventEmitter } from 'events';
import type { GameEventType } from './socketService';
export declare const gameEventEmitter: EventEmitter<[never]>;
export interface GameEvent {
    gameId: string;
    type: GameEventType;
    payload: Record<string, unknown>;
    userId: string | null;
}
export declare function emitGameEvent(gameId: string, type: GameEventType, payload: Record<string, unknown>, userId?: string | null): void;
//# sourceMappingURL=gameEventEmitter.d.ts.map