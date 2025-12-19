/**
 * @file cubeLogic.ts
 * @description Core logic for handling cube transitions in backgammon (double, take, pass, redouble).
 * The functions defined here adhere to USBGF/WBGF guidelines and act as the single source of truth
 * for validating whether an action is legal and computing the resulting cube state.
 */

import type { games } from '@prisma/client';
import { applyPointResult, type MatchRecord, type MatchRulesOptions, type MatchUpdateResult } from './matchEngine';

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
export function canDouble(context: CubeContext, intent: 'double' | 'redouble' = 'double'): boolean {
  const {
    currentPlayer,
    cube,
    matchLength,
    whiteScore,
    blackScore,
    rules,
    doublePending,
    doubleOfferedBy,
    match,
    game
  } = context;

  if (doublePending && doubleOfferedBy !== null) {
    // There is already an offer awaiting a response.
    return false;
  }

  const ownsCube = cube.owner === currentPlayer;
  const isCentered = cube.isCentered;

  if (!isCentered && !ownsCube) {
    return false;
  }

  if (intent === 'redouble' && isCentered) {
    return false;
  }

  if (isCrawfordProhibited({ matchLength, whiteScore, blackScore, rules, match })) {
    return false;
  }

  // Holland Rule: Post-Crawford, trailer cannot double until after 2 rolls
  if (isHollandProhibited(context)) {
    return false;
  }

  if (isDeadCube(context)) {
    return false;
  }

  return true;
}

/**
 * Applies the requested cube action and returns the resulting cube state.
 * Throws if the action is not legal in the provided context.
 */
export function applyCubeAction(context: CubeContext, action: CubeAction): CubeActionResult {
  const { currentPlayer, cube, doublePending, doubleOfferedBy } = context;
  const opponent = currentPlayer === 'white' ? 'black' : 'white';

  switch (action) {
    case 'double':
    case 'redouble': {
      const result = offerDouble(context, action, opponent);
      return result;
    }
    case 'take': {
      if (!doublePending || !doubleOfferedBy) {
        throw new Error('No double pending to accept');
      }

      if (currentPlayer === doubleOfferedBy) {
        throw new Error('Offering player cannot take their own double');
      }

      return {
        cube: {
          level: cube.level,
          owner: currentPlayer,
          isCentered: false
        },
        doublePending: false,
        doubleOfferedBy: null,
        historyEntry: createHistoryEntry(currentPlayer, 'take', cube.level, 'Double accepted')
      };
    }
    case 'pass': {
      if (!doublePending || !doubleOfferedBy) {
        throw new Error('No double pending to refuse');
      }

      const losingPlayer = currentPlayer;
      const winningPlayer = losingPlayer === 'white' ? 'black' : 'white';
      const points = cube.level;

      // Jacoby Rule check: If enabled and cube never turned, gammon/backgammon not allowed (handled in scoring)
      // But for a PASS, the points are just the current cube level.

      const matchUpdate = applyPointResult(context.game, context.match, points, winningPlayer);

      return {
        cube: {
          level: cube.level,
          owner: cube.owner,
          isCentered: cube.isCentered
        },
        doublePending: false,
        doubleOfferedBy: null,
        historyEntry: createHistoryEntry(currentPlayer, 'pass', cube.level, 'Double refused'),
        matchUpdate
      };
    }
    case 'beaver':
    case 'raccoon': {
      return handleImmediateRedouble(context, action, opponent);
    }
    default:
      throw new Error(`Unsupported cube action: ${action satisfies never}`);
  }
}

function createHistoryEntry(by: 'white' | 'black', action: CubeAction, level: number, note?: string): CubeHistoryEntry {
  return {
    by,
    action,
    level,
    ...(note ? { note } : {}),
    timestamp: new Date().toISOString()
  };
}

function offerDouble(context: CubeContext, intent: 'double' | 'redouble', opponent: 'white' | 'black'): CubeActionResult {
  const isRedouble = intent === 'redouble';

  if (isRedouble && !canDouble(context, 'redouble')) {
    throw new Error('Redouble not permitted in current context');
  }

  if (!isRedouble && !canDouble(context, 'double')) {
    throw new Error('Double not permitted in current context');
  }

  const newLevel = context.cube.level * 2;
  const note = isRedouble ? 'Redouble offered' : 'Cube offered and pending acceptance';

  return {
    cube: {
      level: newLevel,
      owner: opponent,
      isCentered: false
    },
    doublePending: true,
    doubleOfferedBy: context.currentPlayer,
    historyEntry: createHistoryEntry(context.currentPlayer, intent, newLevel, note)
  };
}

function handleImmediateRedouble(
  context: CubeContext,
  action: 'beaver' | 'raccoon',
  _opponent: 'white' | 'black'
): CubeActionResult {
  if (!context.rules[action]) {
    throw new Error(`${action} option is not enabled`);
  }

  const { doublePending, doubleOfferedBy, currentPlayer } = context;
  if (!doublePending || !doubleOfferedBy) {
    throw new Error(`${action} requires an outstanding double`);
  }

  const isResponder = currentPlayer !== doubleOfferedBy;
  if (action === 'beaver') {
    if (!isResponder) {
      throw new Error('Only the player being doubled may beaver');
    }
  }

  if (action === 'raccoon') {
    if (!isResponder) {
      throw new Error('Only the original doubler may raccoon');
    }
    if (!context.rules.beaver) {
      throw new Error('Raccoon requires beaver to be enabled');
    }
    if (context.cube.owner !== doubleOfferedBy) {
      throw new Error('Raccoon only available immediately after a beaver');
    }
  }

  const newLevel = context.cube.level * 2;
  const newOwner = currentPlayer;
  const nextOfferer = currentPlayer;

  return {
    cube: {
      level: newLevel,
      owner: newOwner,
      isCentered: false
    },
    doublePending: true,
    doubleOfferedBy: nextOfferer,
    historyEntry: createHistoryEntry(currentPlayer, action, newLevel, `${action} executed`)
  };
}

function isCrawfordProhibited(params: {
  matchLength: number | null;
  whiteScore: number;
  blackScore: number;
  rules: MatchRulesOptions;
  match: MatchRecord | null;
}): boolean {
  const { matchLength, whiteScore, blackScore, rules, match } = params;
  if (!rules.crawford || !matchLength) {
    return false;
  }

  const matchPoint = matchLength - 1;
  const crawfordConsumed = match?.crawfordUsed ?? false;
  const isCrawfordGame = (whiteScore === matchPoint || blackScore === matchPoint) && !crawfordConsumed;
  return isCrawfordGame;
}

function isHollandProhibited(context: CubeContext): boolean {
  // Holland Rule: In post-Crawford games, the trailer cannot double until after their second roll.
  const { matchLength, whiteScore, blackScore, rules, match, game } = context;

  if (!matchLength || !rules.crawford || !match?.crawfordUsed) {
    return false;
  }

  // Post-Crawford is any game AFTER the Crawford game.
  // The rule applies to the TRAILER (player behind in score).
  const trailer = whiteScore < blackScore ? 'white' : (blackScore < whiteScore ? 'black' : null);

  if (!trailer || trailer !== context.currentPlayer) {
    return false;
  }

  // Check if at least 2 rolls have occurred for this player.
  // We check the number of moves made by the current player in this game.
  // Assuming game.gameMoves is populated.
  const playerMoves = ((game as any).gameMoves || []).filter((m: any) =>
    (m.player === 'WHITE' && context.currentPlayer === 'white') ||
    (m.player === 'BLACK' && context.currentPlayer === 'black')
  );

  if (playerMoves.length < 2) {
    return true;
  }

  return false;
}

function isDeadCube(context: CubeContext): boolean {
  const { matchLength, whiteScore, blackScore, cube, currentPlayer } = context;
  if (!matchLength) {
    return false;
  }

  const playerScore = currentPlayer === 'white' ? whiteScore : blackScore;

  return playerScore + cube.level >= matchLength;
}

/**
 * Checks if Jacoby rule applies to scoring (Gammons/Backgammons don't count if cube not turned).
 */
export function isJacobyActive(context: CubeContext): boolean {
  return !!context.rules.jacoby && context.cube.isCentered;
}

/**
 * Calculates the score points considering the Jacoby rule.
 */
export function calculateJacobyScore(points: number, context: CubeContext): number {
  if (isJacobyActive(context) && points > 1) {
    return 1;
  }
  return points;
}

/**
 * Checks if Murphy rule (Automatic Doubles) should trigger.
 * This is typically checked at the start of the game during the opening roll.
 */
export function shouldMurphyDouble(die1: number, die2: number, rules: MatchRulesOptions): boolean {
  // Murphy rule: If opening roll is doubles, cube is doubled (if enabled).
  return die1 === die2 && !!(rules as any).murphy;
}
