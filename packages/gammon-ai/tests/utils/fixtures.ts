import type { GameState, BoardState, DiceState, CubeSnapshot } from '../../src/types/game';
import type { Player } from '../../src/types/player';
import { defaultCrawfordState } from '../../src/services/rules/matchEngine';

export type GameStateFixture = GameState & {
  whitePlayerId?: string | null;
  blackPlayerId?: string | null;
};

const defaultPlayer = (id: string): Player => ({
  id,
  name: `Player ${id}`,
  email: `${id}@example.com`,
  points: 1000,
  isPremium: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

const defaultBoard = (): BoardState => ({
  positions: new Array(24).fill(0),
  whiteBar: 0,
  blackBar: 0,
  whiteOff: 0,
  blackOff: 0
});

const defaultDice = (): DiceState => ({
  dice: [1, 1],
  used: [],
  doubles: false,
  remaining: []
});

const defaultCube = (): CubeSnapshot => ({
  level: 1,
  owner: null,
  isCentered: true,
  doublePending: false,
  doubleOfferedBy: null,
  history: []
});

export function makeGameState(overrides: Partial<GameStateFixture> = {}): GameStateFixture {
  const base: GameStateFixture = {
    id: 'game-1',
    player1: defaultPlayer('user-123'),
    player2: defaultPlayer('user-456'),
    status: 'playing',
    gameType: 'match',
    stake: 0,
    timeControl: null,
    whiteTimeMs: null,
    blackTimeMs: null,
    matchLength: null,
    crawford: defaultCrawfordState(),
    cube: defaultCube(),
    whiteScore: 0,
    blackScore: 0,
    winner: null,
    drawOfferBy: null,
    board: defaultBoard(),
    currentPlayer: 'white',
    dice: defaultDice(),
    availableMoves: [],
    createdAt: new Date(),
    startedAt: new Date(),
    finishedAt: null,
    whitePlayerId: 'user-123',
    blackPlayerId: 'user-456',
    ...overrides
  };

  if (!base.player1) {
    base.player1 = defaultPlayer('user-123');
  }

  if (typeof base.player2 === 'undefined') {
    base.player2 = defaultPlayer('user-456');
  }

  return base;
}

export function mockUser(id = 'user-123') {
  return { id };
}
