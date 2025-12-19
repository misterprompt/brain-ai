/**
 * @file matchEngine.ts
 * @description Core match engine responsible for scoring, match length handling and special rules
 * (Crawford, Jacoby, Beaver/Raccoon). This module exposes helper functions that other services
 * (cubeLogic, resignationService, controllers) will consume to keep match play consistent with
 * official backgammon rules.
 */
import type { games } from '@prisma/client';
type MatchState = 'IN_PROGRESS' | 'FINISHED';
export type MatchRecord = {
    id: string;
    gameId: string;
    length: number;
    rules: MatchRulesOptions;
    state: MatchState;
    crawfordUsed: boolean;
    cubeHistory: unknown;
};
export interface CrawfordState {
    enabled: boolean;
    active: boolean;
    used: boolean;
    matchLength: number | null;
    oneAwayScore: number | null;
    triggeredBy: 'white' | 'black' | null;
}
export declare function defaultCrawfordState(): CrawfordState;
/**
 * Options that define which special rules are enabled for the current match.
 */
export interface MatchRulesOptions {
    /** Crawford rule forbids doubling in the game immediately following reaching match point. */
    crawford: boolean;
    /** Jacoby rule (money games) scores gammons/backgammons only when the cube has been turned. */
    jacoby: boolean;
    /** Beaver option lets a player immediately redouble while retaining ownership. */
    beaver: boolean;
    /** Raccoon option allows the original doubler to redouble immediately after a beaver. */
    raccoon: boolean;
}
/**
 * Snapshot describing the outcome of processing a match event.
 */
export interface MatchUpdateResult {
    game: games;
    match: MatchRecord | null;
    finished: boolean;
}
/**
 * Calculates the new score after a point result (win, gammon, backgammon, resignation).
 * @param game Current game record.
 * @param match Optional match record (null for money games).
 * @param points Points won (already accounting for cube value & resignation type).
 * @param winner Player identifier ("white" | "black").
 * @returns Updated game/match state and whether the match has finished.
 */
export declare function applyPointResult(game: games, match: MatchRecord | null, points: number, winner: 'white' | 'black'): MatchUpdateResult;
/**
 * Determines whether the specified player is allowed to double, given the match state and rules.
 * Crawford and other special rules should be enforced here.
 */
export declare function canDouble(game: games, match: MatchRecord | null, player: 'white' | 'black', rules: MatchRulesOptions): boolean;
export declare function evaluateCrawfordState(params: {
    rules: MatchRulesOptions;
    matchLength: number | null;
    whiteScore: number;
    blackScore: number;
    match: MatchRecord | null;
}): CrawfordState;
/**
 * Factory utility to create default match rules when none are provided by the client.
 */
export declare function createDefaultRules(): MatchRulesOptions;
export {};
//# sourceMappingURL=matchEngine.d.ts.map