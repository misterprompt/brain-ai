import type { ResignGameRequest, ResignGameResult } from '../types/game';
import type { MatchRecord, MatchRulesOptions } from './rules/matchEngine';
import { createDefaultRules } from './rules/matchEngine';
import { resolveResignation, type ResignationType } from './rules/resignationService';
import { prisma } from '../lib/prisma';
import type { games } from '@prisma/client';

interface ResignationOutcome extends ResignGameResult {
  whiteScore: number;
  blackScore: number;
  matchState: MatchRecord['state'] | null;
  crawfordUsed: boolean | null;
}

function buildRules(json: unknown): MatchRulesOptions {
  const defaults = createDefaultRules();
  if (typeof json !== 'object' || json === null) {
    return defaults;
  }
  const candidate = json as Partial<Record<keyof MatchRulesOptions, unknown>>;
  return {
    crawford: typeof candidate.crawford === 'boolean' ? candidate.crawford : defaults.crawford,
    jacoby: typeof candidate.jacoby === 'boolean' ? candidate.jacoby : defaults.jacoby,
    beaver: typeof candidate.beaver === 'boolean' ? candidate.beaver : defaults.beaver,
    raccoon: typeof candidate.raccoon === 'boolean' ? candidate.raccoon : defaults.raccoon
  };
}

type MatchEntity = {
  id: string;
  gameId: string;
  length: number;
  rules: unknown;
  state: 'IN_PROGRESS' | 'FINISHED';
  crawfordUsed: boolean;
  cubeHistory: unknown;
};

function buildMatchRecord(match: MatchEntity, rules: MatchRulesOptions): MatchRecord {
  return {
    id: match.id,
    gameId: match.gameId,
    length: match.length,
    rules,
    state: match.state,
    crawfordUsed: match.crawfordUsed,
    cubeHistory: match.cubeHistory
  };
}

export async function processResignation(request: ResignGameRequest): Promise<ResignationOutcome> {
  const { gameId, userId, resignationType } = request;

  return prisma.$transaction(async (tx) => {
    const client = tx as any;

    const game = (await client.games.findUnique({ where: { id: gameId } })) as games | null;
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'PLAYING') {
      throw new Error('Game is not active');
    }

    const isWhite = game.whitePlayerId === userId;
    const isBlack = game.blackPlayerId === userId;
    if (!isWhite && !isBlack) {
      throw new Error('Player is not part of this game');
    }

    const resigningPlayer: 'white' | 'black' = isWhite ? 'white' : 'black';

    const match = (await client.matches.findUnique({ where: { gameId } })) as MatchEntity | null;
    const rules = match ? buildRules(match.rules) : createDefaultRules();
    const matchRecord = match ? buildMatchRecord(match, rules) : null;

    const resignationResult = resolveResignation({
      game: game as games,
      match: matchRecord,
      rules,
      resigningPlayer,
      resignationType: resignationType as ResignationType
    });

    await client.games.update({
      where: { id: gameId },
      data: {
        status: resignationResult.game.status,
        whiteScore: resignationResult.game.whiteScore,
        blackScore: resignationResult.game.blackScore,
        winner: resignationResult.game.winner,
        finishedAt: resignationResult.game.finishedAt,
        resignationType: resignationResult.resignationType
      }
    });

    if (resignationResult.match && match) {
      await client.matches.update({
        where: { id: match.id },
        data: {
          state: resignationResult.match.state,
          crawfordUsed: resignationResult.match.crawfordUsed
        }
      });
    }

    return {
      gameId,
      winner: resignationResult.winner,
      resignationType: resignationResult.resignationType,
      pointsAwarded: resignationResult.pointsAwarded,
      finished: resignationResult.finished,
      whiteScore: resignationResult.game.whiteScore,
      blackScore: resignationResult.game.blackScore,
      matchState: resignationResult.match?.state ?? null,
      crawfordUsed: resignationResult.match?.crawfordUsed ?? null
    } satisfies ResignationOutcome;
  });
}
