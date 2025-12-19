import type { games, Player } from '@prisma/client';
import { applyPointResult, type MatchRecord, type MatchRulesOptions, type MatchUpdateResult } from './matchEngine';

export type ResignationType = 'SINGLE' | 'GAMMON' | 'BACKGAMMON';

type CubeAwareGame = games & {
  cubeLevel?: number | null;
  cubeOwner?: Player | null;
  doublePending?: boolean | null;
  resignationType?: ResignationType | null;
};

export interface ResignationContext {
  game: games;
  match: MatchRecord | null;
  rules: MatchRulesOptions;
  resigningPlayer: 'white' | 'black';
  resignationType: ResignationType;
}

export interface ResignationResult extends MatchUpdateResult {
  winner: 'white' | 'black';
  resignationType: ResignationType;
  pointsAwarded: number;
}

const RESIGNATION_POINTS: Record<ResignationType, number> = {
  SINGLE: 1,
  GAMMON: 2,
  BACKGAMMON: 3
};

const PLAYER_ENUM_MAP: Record<'white' | 'black', Player> = {
  white: 'WHITE',
  black: 'BLACK'
};

function normalizeGame(game: games): CubeAwareGame {
  return game as CubeAwareGame;
}

function effectiveResignationType(context: ResignationContext): ResignationType {
  const { match, rules, game, resignationType } = context;

  if (!match && rules.jacoby) {
    const cubeAware = normalizeGame(game);
    const cubeLevel = cubeAware.cubeLevel ?? 1;
    const cubeOwner = cubeAware.cubeOwner ?? null;
    const cubeUnturned = cubeLevel === 1 && cubeOwner === null;
    if (cubeUnturned) {
      return 'SINGLE';
    }
  }

  return resignationType;
}

function validateContext(context: ResignationContext): void {
  const cubeAware = normalizeGame(context.game);

  if (cubeAware.status !== 'PLAYING') {
    throw new Error('Cannot resolve resignation when game is not active');
  }

  if (cubeAware.doublePending) {
    throw new Error('Cannot resolve resignation while a double is pending');
  }
}

export function resolveResignation(context: ResignationContext): ResignationResult {
  validateContext(context);

  const { game, match, resigningPlayer } = context;
  const cubeAware = normalizeGame(game);

  const winner = resigningPlayer === 'white' ? 'black' : 'white';
  const resolvedType = effectiveResignationType(context);
  const basePoints = RESIGNATION_POINTS[resolvedType] ?? 1;
  const cubeLevel = cubeAware.cubeLevel ?? 1;
  const pointsAwarded = basePoints * cubeLevel;

  const matchUpdate = applyPointResult(game, match, pointsAwarded, winner);

  const now = new Date();
  const updatedGame: games = {
    ...matchUpdate.game,
    status: 'FINISHED' as games['status'],
    winner: PLAYER_ENUM_MAP[winner],
    finishedAt: now,
    updatedAt: now
  } as games;

  return {
    game: updatedGame,
    match: matchUpdate.match,
    finished: matchUpdate.finished,
    winner,
    resignationType: resolvedType,
    pointsAwarded
  };
}
