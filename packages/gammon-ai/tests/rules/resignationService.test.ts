import type { games, GameMode, GameStatus, Player } from '@prisma/client';
import { resolveResignation, type ResignationType } from '../../src/services/rules/resignationService';
import type { MatchRecord, MatchRulesOptions } from '../../src/services/rules/matchEngine';

describe('resolveResignation', () => {
  const baseDate = new Date('2025-01-01T00:00:00Z');

  const createGame = (overrides: Record<string, unknown> = {}): games =>
    ({
      id: 'game-1',
      whitePlayerId: 'white-player',
      blackPlayerId: 'black-player',
      tournamentId: null,
      gameMode: 'PLAYER_VS_PLAYER' as GameMode,
      status: 'PLAYING' as GameStatus,
      stake: 0,
      winner: null,
      drawOfferedBy: null,
      whiteScore: 0,
      blackScore: 0,
      boardState: {} as games['boardState'],
      currentPlayer: 'WHITE' as Player,
      dice: [],
      cubeLevel: 1,
      cubeOwner: null,
      matchLength: 7,
      doubleOfferedBy: null,
      doublePending: false,
      createdAt: baseDate,
      finishedAt: null,
      updatedAt: baseDate,
      resignationType: null,
      ...(overrides as Partial<games>)
    } as unknown as games);

  const createRules = (overrides: Partial<MatchRulesOptions> = {}): MatchRulesOptions => ({
    crawford: true,
    jacoby: false,
    beaver: false,
    raccoon: false,
    ...overrides
  });

  const createMatch = (
    overrides: Partial<MatchRecord> = {},
    rulesOverrides: Partial<MatchRulesOptions> = {}
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

  const buildContext = (params: {
    game?: Record<string, unknown>;
    match?: MatchRecord | null;
    rules?: MatchRulesOptions;
    resigningPlayer?: 'white' | 'black';
    resignationType?: ResignationType;
  }) => {
    const game = createGame(params.game);
    const rules = params.rules ?? createRules();
    const match = params.match === undefined ? createMatch({}, rules) : params.match;

    return {
      game,
      match,
      rules,
      resigningPlayer: params.resigningPlayer ?? 'white',
      resignationType: params.resignationType ?? 'SINGLE'
    };
  };

  it('awards single resignation with cube multiplier', () => {
    const context = buildContext({
      game: { cubeLevel: 2, whiteScore: 1, blackScore: 3 },
      resigningPlayer: 'white',
      resignationType: 'SINGLE'
    });

    const result = resolveResignation(context);

    expect(result.pointsAwarded).toBe(2);
    expect(result.winner).toBe('black');
    expect(result.game.whiteScore).toBe(1);
    expect(result.game.blackScore).toBe(5);
    expect(result.game.status).toBe('FINISHED');
    expect(result.resignationType).toBe('SINGLE');
    expect(result.game.finishedAt).toBeInstanceOf(Date);
  });

  it('awards gammon resignation correctly', () => {
    const context = buildContext({
      game: { cubeLevel: 3, whiteScore: 4, blackScore: 2 },
      resigningPlayer: 'black',
      resignationType: 'GAMMON'
    });

    const result = resolveResignation(context);

    expect(result.pointsAwarded).toBe(6);
    expect(result.winner).toBe('white');
    expect(result.game.whiteScore).toBe(10);
    expect(result.resignationType).toBe('GAMMON');
  });

  it('downgrades resignation to single under Jacoby when cube not turned', () => {
    const rules = createRules({ jacoby: true });
    const context = buildContext({
      game: { cubeLevel: 1, cubeOwner: null, whiteScore: 0, blackScore: 0 },
      match: null,
      rules,
      resigningPlayer: 'white',
      resignationType: 'GAMMON'
    });

    const result = resolveResignation(context);

    expect(result.resignationType).toBe('SINGLE');
    expect(result.pointsAwarded).toBe(1);
    expect(result.game.blackScore).toBe(1);
  });

  it('throws when a double is pending', () => {
    const context = buildContext({
      game: { doublePending: true },
      resigningPlayer: 'white'
    });

    expect(() => resolveResignation(context)).toThrow('Cannot resolve resignation while a double is pending');
  });
});
