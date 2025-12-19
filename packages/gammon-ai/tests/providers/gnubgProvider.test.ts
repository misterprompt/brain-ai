import { GNUBGProvider } from '../../src/providers/gnubgProvider';
import type { AnalyzeInput } from '../../src/services/aiService';
import type { Move } from '../../src/types/game';

describe('GNUBGProvider', () => {
  const baseInput: AnalyzeInput = {
    boardState: {
      positions: Array(24).fill(0),
      whiteBar: 0,
      blackBar: 0,
      whiteOff: 0,
      blackOff: 0
    },
    dice: [1, 2],
    move: null,
    userId: 'user-1',
    gameId: 'game-1'
  };

  const createResponse = (data: unknown, init?: Partial<Response>): Response => ({
    ok: !(init?.status && init.status >= 400),
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: 'https://example.com',
    clone() {
      return createResponse(data, init);
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    json: async () => data,
    text: async () => JSON.stringify(data)
  } as Response);

  it('returns mapped suggestion on success', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      createResponse({
        bestMove: { from: 1, to: 3, player: 'white', diceUsed: 2 },
        equity: 0.12,
        explanation: 'Strong move.'
      })
    );

    const provider = new GNUBGProvider({
      fetchImpl: fetchMock,
      sleepFn: async () => {},
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never
    });

    const result = await provider.getBestMove(baseInput);

    expect(result).toEqual({
      move: { from: 1, to: 3, player: 'white', diceUsed: 2 },
      equity: 0.12,
      explanation: 'Strong move.'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once after a transient failure', async () => {
    let attempts = 0;
    const fetchMock = jest.fn().mockImplementation(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve(
        createResponse({
          bestMove: { from: 2, to: 4, player: 'white', diceUsed: 2 },
          equity: 0.2
        })
      );
    });

    const provider = new GNUBGProvider({
      fetchImpl: fetchMock,
      sleepFn: async () => {},
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never,
      maxRetries: 1
    });

    const result = await provider.getBestMove(baseInput);

    expect(result.equity).toBe(0.2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when response payload is invalid', async () => {
    const fetchMock = jest.fn().mockResolvedValue(createResponse({ invalid: true }));
    const provider = new GNUBGProvider({
      fetchImpl: fetchMock,
      sleepFn: async () => {},
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never,
      maxRetries: 0
    });

    await expect(provider.getBestMove(baseInput)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit breaker after repeated failures', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('GNUBG offline'));
    const provider = new GNUBGProvider({
      fetchImpl: fetchMock,
      sleepFn: async () => {},
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never,
      maxRetries: 0,
      circuitBreakerThreshold: 1,
      circuitBreakerCooldownMs: 10_000
    });

    await expect(provider.getBestMove(baseInput)).rejects.toThrow('GNUBG offline');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(provider.getBestMove(baseInput)).rejects.toThrow('GNUBG provider temporarily unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('analyzes games via dedicated endpoint', async () => {
    const moves: Move[] = [{ from: 1, to: 3, player: 'white', diceUsed: 2 }];
    const fetchMock = jest.fn().mockResolvedValue(
      createResponse({ totalError: 0.5, errorRate: 0.1, criticalMoves: 2 })
    );

    const provider = new GNUBGProvider({
      fetchImpl: fetchMock,
      sleepFn: async () => {},
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never
    });

    const result = await provider.analyzeGame(moves);
    expect(result).toEqual({ totalError: 0.5, errorRate: 0.1, criticalMoves: 2 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/analyze-game'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
