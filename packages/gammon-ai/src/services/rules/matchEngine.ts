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

export function defaultCrawfordState(): CrawfordState {
  return {
    enabled: false,
    active: false,
    used: false,
    matchLength: null,
    oneAwayScore: null,
    triggeredBy: null
  } satisfies CrawfordState;
}

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
export function applyPointResult(
  game: games,
  match: MatchRecord | null,
  points: number,
  winner: 'white' | 'black'
): MatchUpdateResult {
  // Apply Jacoby Rule: Gammons/Backgammons count as single game if cube hasn't been turned
  // (i.e., cube owner is still null or centered, depending on implementation, but here we check if cube has been used).
  // In this implementation, we check if the cube value is > 1 OR if it has been owned.
  // However, standard Jacoby means "cube not turned".
  // If rules.jacoby is active and cube is centered (level 1, no owner), treat points > 1 as 1.

  let finalPoints = points;
  if (match && match.rules.jacoby) {
    // Assuming 'game' has cube state. We need to know if cube was used.
    // If we don't have full cube history here, we rely on cubeOwner.
    // If cubeOwner is null (or whatever represents centered), Jacoby applies.
    if (!game.cubeOwner && points > 1) {
      finalPoints = 1;
    }
  }

  const updatedGame = {
    ...game,
    whiteScore: winner === 'white' ? game.whiteScore + finalPoints : game.whiteScore,
    blackScore: winner === 'black' ? game.blackScore + finalPoints : game.blackScore,
    doublePending: false,
    doubleOfferedBy: null,
    cubeOwner: winner === 'white' ? 'WHITE' : 'BLACK'
  } as games;

  let updatedMatch: MatchRecord | null = match ? { ...match } : null;
  let finished = false;

  if (updatedMatch) {
    const preCrawford = evaluateCrawfordState({
      rules: updatedMatch.rules,
      matchLength: updatedMatch.length,
      whiteScore: game.whiteScore ?? 0,
      blackScore: game.blackScore ?? 0,
      match: updatedMatch
    });

    if (updatedMatch.rules.crawford && preCrawford.active && !updatedMatch.crawfordUsed) {
      updatedMatch = { ...updatedMatch, crawfordUsed: true };
    }

    const winnerScore = winner === 'white' ? updatedGame.whiteScore : updatedGame.blackScore;
    const matchPoint = updatedMatch.length;

    if (winnerScore >= matchPoint) {
      updatedMatch = { ...updatedMatch, state: 'FINISHED' };
      finished = true;
    }
  } else {
    // Money game (no match) - Jacoby usually applies here
    // If match is null, we can't check rules.jacoby unless we pass rules separately or assume default.
    // For now, we only apply if match record exists.
    finished = true;
  }

  return {
    game: updatedGame,
    match: updatedMatch,
    finished
  };
}

/**
 * Determines whether the specified player is allowed to double, given the match state and rules.
 * Crawford and other special rules should be enforced here.
 */
export function canDouble(
  game: games,
  match: MatchRecord | null,
  player: 'white' | 'black',
  rules: MatchRulesOptions
): boolean {
  void player;

  const crawford = evaluateCrawfordState({
    rules,
    matchLength: match?.length ?? (game.matchLength ?? null),
    whiteScore: game.whiteScore ?? 0,
    blackScore: game.blackScore ?? 0,
    match
  });

  if (crawford.active) {
    return false;
  }

  // Jacoby rule is enforced during scoring (applyPointResult), not doubling.
  // Beaver/Raccoon are response actions, handled in respondToDouble.

  // Check cube ownership
  if (game.cubeOwner && game.cubeOwner.toLowerCase() !== player) {
    return false;
  }

  // Check double pending
  if (game.doublePending) {
    return false;
  }

  // Jacoby rule: Gammons/Backgammons only count if cube has been turned.
  // This doesn't prevent doubling, but it's a rule to be aware of.
  // The doubling itself is allowed unless other conditions prevent it.

  return true;
}

export function evaluateCrawfordState(params: {
  rules: MatchRulesOptions;
  matchLength: number | null;
  whiteScore: number;
  blackScore: number;
  match: MatchRecord | null;
}): CrawfordState {
  const { rules, matchLength, whiteScore, blackScore, match } = params;

  const resolvedLength = matchLength ?? match?.length ?? null;
  const oneAwayScore = resolvedLength !== null ? resolvedLength - 1 : null;
  const used = match?.crawfordUsed ?? false;

  if (!rules.crawford || resolvedLength === null || oneAwayScore === null) {
    return {
      enabled: Boolean(rules.crawford && resolvedLength !== null),
      active: false,
      used,
      matchLength: resolvedLength,
      oneAwayScore,
      triggeredBy: null
    } satisfies CrawfordState;
  }

  let triggeredBy: 'white' | 'black' | null = null;
  if (whiteScore === oneAwayScore) {
    triggeredBy = 'white';
  } else if (blackScore === oneAwayScore) {
    triggeredBy = 'black';
  }

  const active = Boolean(triggeredBy && !used);

  return {
    enabled: true,
    active,
    used,
    matchLength: resolvedLength,
    oneAwayScore,
    triggeredBy
  } satisfies CrawfordState;
}

/**
 * Factory utility to create default match rules when none are provided by the client.
 */
export function createDefaultRules(): MatchRulesOptions {
  return {
    crawford: true,
    jacoby: false,
    beaver: false,
    raccoon: false
  };
}

// ✅ Validation
// - Objectif: poser le squelette du moteur de match (score, règles spéciales).
// - Tests exécutés: aucun (implémentation manquante, stubs en place).
// - À faire: ajouter la logique complète (score/cube), gérer états MatchState, écrire tests unitaires
//   et mettre à jour les contrôleurs pour consommer ces helpers.
