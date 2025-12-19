import { GameService } from '../src/services/gameService';
import { BackgammonEngine } from '../src/services/gameEngine';
import { notificationService } from '../src/services/notificationService';
import { prisma } from '../src/lib/prisma';
import type { GameState, Move, DiceState, BoardState } from '../src/types/game';
import { defaultCrawfordState } from '../src/services/rules/matchEngine';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    games: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    users: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

type PrismaMock = {
  games: {
    findUnique: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  users: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

if (!prismaMock.games) {
  prismaMock.games = {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  } as unknown as PrismaMock['games'];
}

if (!prismaMock.users) {
  prismaMock.users = {
    findUnique: jest.fn(),
    update: jest.fn()
  } as unknown as PrismaMock['users'];
}

const makeBoard = (): BoardState => {
  const initial = BackgammonEngine.createInitialBoard();
  return {
    positions: [...initial.positions],
    whiteBar: initial.whiteBar,
    blackBar: initial.blackBar,
    whiteOff: initial.whiteOff,
    blackOff: initial.blackOff
  };
};

const makeDice = (override?: Partial<DiceState>): DiceState => ({
  dice: [1, 2],
  used: [false, false],
  doubles: false,
  remaining: [1, 2],
  ...override
});

const mockPrismaGame = {
  id: 'game-1',
  whitePlayerId: 'player-1',
  blackPlayerId: 'player-2',
  status: 'PLAYING',
  gameMode: 'PLAYER_VS_PLAYER',
  stake: 0,
  whitePlayer: { id: 'player-1', username: 'P1', email: 'p1@example.com', eloRating: 1000, subscriptionType: 'FREE', createdAt: new Date(), updatedAt: new Date() },
  blackPlayer: { id: 'player-2', username: 'P2', email: 'p2@example.com', eloRating: 1000, subscriptionType: 'FREE', createdAt: new Date(), updatedAt: new Date() },
  winner: null,
  boardState: { board: makeBoard(), dice: makeDice() },
  dice: [1, 2],
  currentPlayer: 'WHITE',
  cubeLevel: 1,
  cubeOwner: null,
  doublePending: false,
  doubleOfferedBy: null,
  cubeHistory: [],
  matchLength: null,
  whiteScore: 0,
  blackScore: 0,
  createdAt: new Date(),
  updatedAt: new Date()
} as any;

describe('GameService.makeMove regression flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    prismaMock.games.findUnique.mockReset();
    prismaMock.games.update.mockReset();
    prismaMock.users.update.mockReset();
  });

  it('throws when move is not among advertised moves', async () => {
    prismaMock.games.findUnique.mockResolvedValueOnce(mockPrismaGame);
    const legalMoves: Move[] = [{ from: 1, to: 3, player: 'white', diceUsed: 2 }];

    jest.spyOn(BackgammonEngine, 'calculateAvailableMoves').mockImplementation((player) => {
      if (player === 'white') {
        return legalMoves;
      }
      return [];
    });

    await expect(
      GameService.makeMove('game-1', 'player-1', { from: 0, to: 1, diceUsed: 1 })
    ).rejects.toThrow('Requested move is not among the available moves');
  });

  it('persists victory and notifies when win condition is met', async () => {
    const victoryBoard = makeBoard();
    victoryBoard.whiteOff = 15;
    const legalMove: Move = { from: 0, to: 1, player: 'white', diceUsed: 1 };

    const gameWinning = { ...mockPrismaGame, boardState: { board: victoryBoard, dice: makeDice() } };
    const gameWon = {
      ...gameWinning,
      winner: 'WHITE',
      status: 'COMPLETED',
      finishedAt: new Date()
    };

    prismaMock.games.findUnique
      .mockResolvedValueOnce(gameWinning) // Initial state
      .mockResolvedValueOnce(gameWon);    // After update

    // We need to mock calculateAvailableMoves to return our move so the strict check passes
    jest.spyOn(BackgammonEngine, 'calculateAvailableMoves').mockReturnValue([legalMove]);

    jest.spyOn(BackgammonEngine, 'validateMove').mockReturnValue({ valid: true });
    jest.spyOn(BackgammonEngine, 'applyMove').mockReturnValue(victoryBoard);
    jest.spyOn(BackgammonEngine, 'useDie').mockReturnValue(makeDice({ remaining: [] }));
    jest.spyOn(BackgammonEngine, 'checkWinCondition').mockReturnValue('white');

    const result = await GameService.makeMove('game-1', 'player-1', legalMove);

    expect(result.status).toBe('completed');
    expect(result.winner?.id).toBe('player-1');
    expect(prismaMock.games.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'game-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        winner: 'WHITE'
      })
    }));
  });
});
