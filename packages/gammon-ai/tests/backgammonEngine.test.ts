import { BackgammonEngine } from '../src/services/gameEngine';
import type { BoardState, DiceState, Move } from '../src/types/game';

const makeEmptyBoard = (): BoardState => ({
  positions: Array(24).fill(0),
  whiteBar: 0,
  blackBar: 0,
  whiteOff: 0,
  blackOff: 0
});

const buildDice = (remaining: number[], doubles = false): DiceState => ({
  dice: remaining.length >= 2 ? [remaining[0], remaining[1]] : [remaining[0] ?? 0, remaining[1] ?? 0],
  used: [false, false],
  doubles,
  remaining
});

describe('BackgammonEngine regression rules', () => {
  it('rejects moves that ignore the highest available die', () => {
    const board = makeEmptyBoard();
    board.positions[0] = 1; // White checker on point 1

    const dice = buildDice([6, 5]);
    const illegalMove: Move = {
      from: 0,
      to: 5,
      player: 'white',
      diceUsed: 5
    };

    const validation = BackgammonEngine.validateMove(illegalMove, board, dice);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/highest available die/i);
  });

  it('enforces bar entry priority when destination is blocked', () => {
    const board = makeEmptyBoard();
    board.whiteBar = 1;
    board.positions[21] = -2; // Black owns entry point for die 3

    const dice = buildDice([3]);
    const moves = BackgammonEngine.calculateAvailableMoves('white', board, dice);

    expect(moves).toHaveLength(0);
  });

  it('prevents bearing off with a higher die while pieces remain behind', () => {
    const board = makeEmptyBoard();
    board.positions[18] = 1; // Checker deeper in home board
    board.positions[22] = 1; // Checker attempting to bear off

    const dice = buildDice([6, 1]);
    const move: Move = {
      from: 22,
      to: 25,
      player: 'white',
      diceUsed: 6
    };

    const validation = BackgammonEngine.validateMove(move, board, dice);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/higher die while pieces remain behind/i);
  });

  it('prevents white from landing on a point with more than one opposing checker', () => {
    const board = makeEmptyBoard();
    // White checker at point 1 (index 0)
    board.positions[0] = 1;
    // Black owns point 6 with more than one checker (index 5)
    board.positions[5] = -2;

    const dice: DiceState = buildDice([5]);
    const move: Move = {
      from: 0,
      to: 5,
      player: 'white',
      diceUsed: 5
    };

    const validation = BackgammonEngine.validateMove(move, board, dice);
    expect(validation.valid).toBe(false);
  });

  it('prevents black from landing on a point with more than one opposing checker', () => {
    const board = makeEmptyBoard();
    // Black checker at point 6 (index 5)
    board.positions[5] = -1;
    // White owns point 1 with more than one checker (index 0)
    board.positions[0] = 2;

    const dice: DiceState = buildDice([5]);
    const move: Move = {
      from: 5,
      to: 0,
      player: 'black',
      diceUsed: 5
    };

    const validation = BackgammonEngine.validateMove(move, board, dice);
    expect(validation.valid).toBe(false);
  });

  it('disallows bearing off when not all pieces are in home board', () => {
    const board = makeEmptyBoard();
    // One checker in home board (point 19, index 18) and one outside (point 11, index 10)
    board.positions[18] = 1;
    board.positions[10] = 1;

    const dice = buildDice([2]);
    const move: Move = {
      from: 18,
      to: 25,
      player: 'white',
      diceUsed: 2
    };

    const validation = BackgammonEngine.validateMove(move, board, dice);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/all pieces are in home board/i);
  });

  it('allows white to bear off with a higher die when no pieces remain behind', () => {
    const board = makeEmptyBoard();
    // Single white checker on point 23 (index 22), no other white checkers behind in home board
    board.positions[22] = 1;

    const dice = buildDice([6]);
    const move: Move = {
      from: 22,
      to: 25,
      player: 'white',
      diceUsed: 6
    };

    const validation = BackgammonEngine.validateMove(move, board, dice);
    expect(validation.valid).toBe(true);
  });

  it('allows black to bear off with a higher die when no pieces remain behind', () => {
    const board = makeEmptyBoard();
    // Single black checker on point 3 (index 2), no other black checkers behind in home board
    board.positions[2] = -1;

    const dice = buildDice([6]);
    const move: Move = {
      from: 2,
      to: 25,
      player: 'black',
      diceUsed: 6
    };

    const validation = BackgammonEngine.validateMove(move, board, dice);
    expect(validation.valid).toBe(true);
  });
});
