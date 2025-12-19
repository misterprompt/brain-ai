export class QuotaExceededError extends Error {
  statusCode = 429;
}

export const AIService = {
  getBestMove: jest.fn(async () => ({
    move: {
      from: 24,
      to: 20,
      player: 'white',
      diceUsed: 4
    },
    explanation: 'Best move based on equity.',
    equity: 0.123
  })),
  evaluatePosition: jest.fn(async () => ({
    equity: 0.321,
    pr: 0.045,
    winrate: 0.5,
    explanation: 'Position evaluated based on equity and PR.'
  })),
  addExtraQuota: jest.fn()
};
