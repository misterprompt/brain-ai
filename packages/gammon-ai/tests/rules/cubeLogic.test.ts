import { applyCubeAction, canDouble, type CubeContext, type CubeState } from '../../src/services/rules/cubeLogic';
import type { MatchRecord, MatchRulesOptions } from '../../src/services/rules/matchEngine';
import type { games, GameMode, GameStatus, Player } from '@prisma/client';

describe('cubeLogic', () => {
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
    beaver: true,
    raccoon: true,
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

  const createCube = (overrides: Partial<CubeState> = {}): CubeState => ({
    level: 1,
    owner: null,
    isCentered: true,
    ...overrides
  });

  const createContext = (overrides: Partial<CubeContext> = {}): CubeContext => {
    const match = overrides.match ?? createMatch();
    const game = overrides.game ?? createGame({ matchLength: match.length });

    return {
      currentPlayer: 'white',
      cube: createCube(),
      matchLength: match.length,
      whiteScore: game.whiteScore,
      blackScore: game.blackScore,
      rules: match.rules,
      doublePending: false,
      doubleOfferedBy: null,
      match,
      game,
      ...overrides
    };
  };

  it('allows double followed by take and redouble', () => {
    const baseContext = createContext();
    expect(canDouble(baseContext)).toBe(true);

    const afterDouble = applyCubeAction(baseContext, 'double');

    const takeContext = createContext({
      currentPlayer: 'black',
      cube: afterDouble.cube,
      doublePending: afterDouble.doublePending,
      doubleOfferedBy: afterDouble.doubleOfferedBy,
      match: baseContext.match,
      game: baseContext.game,
      whiteScore: baseContext.whiteScore,
      blackScore: baseContext.blackScore
    });

    const afterTake = applyCubeAction(takeContext, 'take');
    expect(afterTake.cube.level).toBe(afterDouble.cube.level);
    expect(afterTake.cube.owner).toBe('black');
    expect(afterTake.doublePending).toBe(false);

    const redoubleContext = createContext({
      currentPlayer: 'black',
      cube: afterTake.cube,
      doublePending: afterTake.doublePending,
      doubleOfferedBy: afterTake.doubleOfferedBy,
      match: baseContext.match,
      game: baseContext.game,
      whiteScore: baseContext.whiteScore,
      blackScore: baseContext.blackScore
    });

    const afterRedouble = applyCubeAction(redoubleContext, 'redouble');
    expect(afterRedouble.cube.level).toBe(afterDouble.cube.level * 2);
    expect(afterRedouble.doublePending).toBe(true);
    expect(afterRedouble.doubleOfferedBy).toBe('black');
  });

  it('blocks double during Crawford game', () => {
    const match = createMatch({ crawford: true }, { length: 7, crawfordUsed: false });
    const context = createContext({
      match,
      matchLength: 7,
      whiteScore: 6,
      blackScore: 0,
      currentPlayer: 'white'
    });

    expect(canDouble(context)).toBe(false);
  });

  it('prevents redouble when player does not own the cube', () => {
    const match = createMatch();
    const context = createContext({
      currentPlayer: 'white',
      cube: createCube({ level: 2, owner: 'black', isCentered: false }),
      doublePending: true,
      doubleOfferedBy: 'white',
      match
    });

    expect(() => applyCubeAction(context, 'redouble')).toThrow('Redouble not permitted in current context');
  });

  it('allows immediate beaver and raccoon when enabled', () => {
    const match = createMatch({ beaver: true, raccoon: true });
    const game = createGame();

    const afterDouble = applyCubeAction(
      createContext({ match, game }),
      'double'
    );

    const beaverContext = createContext({
      currentPlayer: 'black',
      cube: afterDouble.cube,
      doublePending: afterDouble.doublePending,
      doubleOfferedBy: afterDouble.doubleOfferedBy,
      match,
      game
    });

    const afterBeaver = applyCubeAction(beaverContext, 'beaver');
    expect(afterBeaver.cube.owner).toBe('black');
    expect(afterBeaver.doubleOfferedBy).toBe('black');

    const raccoonContext = createContext({
      currentPlayer: 'white',
      cube: afterBeaver.cube,
      doublePending: afterBeaver.doublePending,
      doubleOfferedBy: afterBeaver.doubleOfferedBy,
      match,
      game
    });

    const afterRaccoon = applyCubeAction(raccoonContext, 'raccoon');
    expect(afterRaccoon.doubleOfferedBy).toBe('white');
    expect(afterRaccoon.cube.level).toBe(afterBeaver.cube.level * 2);
  });

  it('disallows double when cube is dead', () => {
    const match = createMatch();
    const context = createContext({
      currentPlayer: 'white',
      cube: createCube({ level: 2 }),
      match,
      matchLength: 7,
      whiteScore: 6,
      blackScore: 0
    });

    expect(canDouble(context)).toBe(false);
    expect(() => applyCubeAction(context, 'double')).toThrow('Double not permitted in current context');
  });
});
