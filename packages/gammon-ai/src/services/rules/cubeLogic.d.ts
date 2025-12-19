/**
 * @file cubeLogic.ts
 * @description Core logic for handling cube transitions in backgammon (double, take, pass, redouble).
 * The functions defined here adhere to USBGF/WBGF guidelines and act as the single source of truth
 * for validating whether an action is legal and computing the resulting cube state.
 */
import type { games } from '@prisma/client';
import { type MatchRecord, type MatchRulesOptions, type MatchUpdateResult } from './matchEngine';
/** Allowed cube actions */
export type CubeAction = 'double' | 'take' | 'pass' | 'redouble' | 'beaver' | 'raccoon';
/** Record persisted in matches.cubeHistory */
export interface CubeHistoryEntry {
    by: 'white' | 'black';
    action: CubeAction;
    level: number;
    timestamp: string;
    note?: string;
}
/** State description of the cube at a given moment. */
export interface CubeState {
    /** Current cube level (1, 2, 4, …). */
    level: number;
    /** Owner of the cube ("white" | "black") or null if centered. */
    owner: 'white' | 'black' | null;
    /** Whether the cube is centered (no owner). */
    isCentered: boolean;
}
/** Context information required to validate cube actions. */
export interface CubeContext {
    /** Player whose turn it is ("white" | "black"). */
    currentPlayer: 'white' | 'black';
    /** Current cube state. */
    cube: CubeState;
    /** Match length (null for money games). */
    matchLength: number | null;
    /** Score for the white player in match play. */
    whiteScore: number;
    /** Score for the black player in match play. */
    blackScore: number;
    /** Special rule flags (Crawford/Jacoby/Beaver/Raccoon). */
    rules: MatchRulesOptions;
    /** Whether a double is currently pending. */
    doublePending: boolean;
    /** Player who offered the current double (if any). */
    doubleOfferedBy: 'white' | 'black' | null;
    /** Match record when applicable. */
    match: MatchRecord | null;
    /** Game record snapshot (used for pass resolution). */
    game: games;
}
/** Result of applying a cube action. */
export interface CubeActionResult {
    cube: CubeState;
    doublePending: boolean;
    doubleOfferedBy: 'white' | 'black' | null;
    historyEntry: CubeHistoryEntry;
    matchUpdate?: MatchUpdateResult;
}
/**
 * Determines whether the current player is allowed to double given the cube context.
 * Business constraints (Crawford, ownership, beaver restrictions…) must be enforced here.
 */
export declare function canDouble(context: CubeContext, intent?: 'double' | 'redouble'): boolean;
/**
 * Applies the requested cube action and returns the resulting cube state.
 * Throws if the action is not legal in the provided context.
 */
export declare function applyCubeAction(context: CubeContext, action: CubeAction): CubeActionResult;
/**
 * Checks if Jacoby rule applies to scoring (Gammons/Backgammons don't count if cube not turned).
 */
export declare function isJacobyActive(context: CubeContext): boolean;
/**
 * Checks if Murphy rule (Automatic Doubles) should trigger.
 * This is typically checked at the start of the game during the opening roll.
 */
export declare function shouldMurphyDouble(die1: number, die2: number, rules: MatchRulesOptions): boolean;
//# sourceMappingURL=cubeLogic.d.ts.map