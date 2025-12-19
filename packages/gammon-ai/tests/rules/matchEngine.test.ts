import { applyPointResult, evaluateCrawfordState, type MatchRecord, type MatchRulesOptions } from '../../src/services/rules/matchEngine';
import type { games, GameMode, GameStatus, Player } from '@prisma/client';

const createGame = (overrides: Partial<games> = {}): games => ({
  id: 'game-1',
  whitePlayerId: 'white-player',
  blackPlayerId: 'black-player',
  tournamentId: null,
  gameMode: 'AI_VS_PLAYER' as GameMode,
  status: 'IN_PROGRESS' as GameStatus,
  stake: 0,
  winner: null,
  drawOfferedBy: null,
  whiteScore: 0,
  blackScore: 0,
  boardState: {} as unknown as games['boardState'],
  currentPlayer: 'WHITE' as Player,
  dice: [],
  cubeLevel: 1,
  cubeOwner: null,
  matchLength: 7,
  doubleOfferedBy: null,
  doublePending: false,
  createdAt: new Date(),
  finishedAt: null,
  updatedAt: new Date(),
  resignationType: null,
  ...overrides
} as games);

const createRules = (overrides: Partial<MatchRulesOptions> = {}): MatchRulesOptions => ({
  crawford: true,
  jacoby: false,
  beaver: false,
  raccoon: false,
  ...overrides
});

const createMatch = (
  rulesOverrides: Partial<MatchRulesOptions> = {},
  overrides: Partial<Omit<MatchRecord, 'rules'>> = {}
): MatchRecord => ({
  id: 'match-1',
  gameId: 'game-1',
  length: 7,
  rules: createRules(rulesOverrides),
  state: 'IN_PROGRESS',
  crawfordUsed: false,
  cubeHistory: [],
  ...overrides
});

describe('matchEngine Crawford rule', () => {
  it('marks Crawford as active when a player is one point away', () => {
    const match = createMatch({ crawford: true }, { length: 7, crawfordUsed: false });

    const state = evaluateCrawfordState({
      rules: match.rules,
      matchLength: match.length,
      whiteScore: 6,
      blackScore: 0,
      match
    });

    expect(state.enabled).toBe(true);
    expect(state.active).toBe(true);
    expect(state.used).toBe(false);
    expect(state.oneAwayScore).toBe(6);
    expect(state.triggeredBy).toBe('white');
  });

  it('sets crawfordUsed after a Crawford game has been played', () => {
    const gameBefore = createGame({ whiteScore: 6, blackScore: 0, matchLength: 7 });
    const matchBefore = createMatch({ crawford: true }, { length: 7, crawfordUsed: false });

    const result = applyPointResult(gameBefore, matchBefore, 1, 'white');

    expect(result.match).not.toBeNull();
    expect(result.match!.crawfordUsed).toBe(true);
  });
});
