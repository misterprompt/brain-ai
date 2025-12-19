jest.mock('../../src/server', () => require('../utils/prismaMock'));
jest.mock('../../src/lib/prisma', () => require('../utils/prismaMock'));

import { gnubgService } from '../../src/services/gnubgService';
import { setupTestDatabase, seedUser } from '../utils/db';

jest.mock('../../src/providers/gnubgProvider', () => {
  return {
    GNUBGProvider: jest.fn().mockImplementation(() => {
      return {
        getBestMove: jest.fn().mockResolvedValue({
          move: { from: 1, to: 3, player: 'white', diceUsed: 2 },
          equity: 0.5,
          explanation: 'Mocked move'
        }),
        evaluatePosition: jest.fn().mockResolvedValue({
          equity: 0.3,
          pr: 0.05,
          winrate: 0.6,
          explanation: 'Mocked evaluation'
        }),
        analyzeGame: jest.fn().mockResolvedValue({
          totalError: 0.7,
          errorRate: 0.1,
          criticalMoves: 1
        })
      };
    })
  };
});

describe('gnubgService', () => {
  setupTestDatabase();

  beforeEach(async () => {
    await seedUser({ id: 'user-1', email: 'user-1@example.com', password: 'hashed' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards getHint to provider', async () => {
    const result = await gnubgService.getHint({
      board: {},
      dice: [1, 2],
      userId: 'user-1'
    });

    expect(result.equity).toBe(0.5);
  });

  it('forwards evaluatePosition to provider', async () => {
    const result = await gnubgService.evaluatePosition({
      board: {},
      dice: [3, 4],
      userId: 'user-1'
    });

    expect(result.pr).toBe(0.05);
  });

  it('forwards analyzeGame to provider', async () => {
    const result = await gnubgService.analyzeGame({
      moves: [{ from: 1, to: 3, player: 'white', diceUsed: 2 }]
    });

    expect(result.totalError).toBe(0.7);
  });
});
