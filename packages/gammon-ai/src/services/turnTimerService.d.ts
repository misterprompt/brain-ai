import type { PlayerColor, TimeControlConfig, TimeControlPreset } from '../types/game';
export declare const DEFAULT_TIME_CONTROL_PRESET: TimeControlPreset;
export type TurnTimerSnapshot = {
    config: TimeControlConfig;
    active: PlayerColor;
    whiteRemainingMs: number;
    blackRemainingMs: number;
    paused: boolean;
};
export type TimerUpdateResult = {
    flagFall: PlayerColor | false;
    whiteRemainingMs: number;
    blackRemainingMs: number;
};
export declare class TurnTimerService {
    static configure(gameId: string | number, preset: TimeControlPreset | null, overrides?: Partial<TimeControlConfig>): TimeControlConfig | null;
    static clear(gameId: string | number): void;
    static getSnapshot(gameId: string | number): TurnTimerSnapshot | null;
    static ensure(gameId: string | number, preset: TimeControlPreset | null): void;
    static consume(gameId: string | number, player: PlayerColor): TimerUpdateResult | null;
    static completeMove(gameId: string | number, movingPlayer: PlayerColor, nextPlayer: PlayerColor): TimerUpdateResult | null;
    static pause(gameId: string | number): void;
    static resume(gameId: string | number, nextActive: PlayerColor): void;
    static restore(gameId: string | number, params: {
        preset: TimeControlPreset | null;
        whiteRemainingMs?: number | null;
        blackRemainingMs?: number | null;
        activePlayer?: PlayerColor | null;
        lastUpdatedAt?: Date | null;
        overrides?: Partial<TimeControlConfig>;
    }): void;
}
export declare const TimeControlPresets: Record<"NORMAL" | "BLITZ" | "LONG", TimeControlConfig>;
//# sourceMappingURL=turnTimerService.d.ts.map