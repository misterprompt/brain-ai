import { GNUBGProvider } from '../src/providers/gnubgProvider';

const attachAbortHandler = (options?: RequestInit) => {
  const signal = options?.signal as AbortSignal | undefined;
  if (!signal) {
    return () => {};
  }
  return (callback: () => void) => {
    const handler = () => {
      callback();
    };
    signal.addEventListener('abort', handler, { once: true });
  };
};

describe('GNUBGProvider resilience', () => {
  const originalEnv = { ...process.env };
  let fetchMock: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    const fetchTarget = globalThis as unknown as { fetch: typeof fetch };
    fetchMock = jest.spyOn(fetchTarget, 'fetch');
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    jest.useRealTimers();
    process.env = { ...originalEnv };
  });

  it('throws when the request times out', async () => {
    jest.useFakeTimers();
    process.env.GNUBG_TIMEOUT_MS = '10';
    process.env.GNUBG_MAX_RETRIES = '0';

    fetchMock.mockImplementation((_, options?: RequestInit) => {
      return new Promise((_, reject) => {
        const registerAbort = attachAbortHandler(options);
        registerAbort(() => {
          const abortError = new Error('Request aborted');
          (abortError as any).name = 'AbortError';
          reject(abortError);
        });
      });
    });

    const provider = new GNUBGProvider();
    const promise = provider.getBestMove({ boardState: {}, dice: [], userId: 'user-1' });

    jest.runOnlyPendingTimers();

    await expect(promise).rejects.toThrow('Request aborted');
    expect(errorSpy).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once and succeeds on the second attempt', async () => {
    process.env.GNUBG_TIMEOUT_MS = '1000';
    process.env.GNUBG_MAX_RETRIES = '1';

    const responses = [
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      }),
      Promise.resolve({
        ok: true,
        json: async () => ({
          bestMove: null,
          equity: 0.42,
          explanation: 'retry-success'
        })
      })
    ];

    fetchMock.mockImplementation(() => responses.shift()!);

    const provider = new GNUBGProvider();
    const result = await provider.getBestMove({ boardState: {}, dice: [], userId: 'user-2' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ equity: 0.42, explanation: 'retry-success' });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit breaker after repeated failures', async () => {
    process.env.GNUBG_TIMEOUT_MS = '1000';
    process.env.GNUBG_MAX_RETRIES = '0';
    process.env.GNUBG_CIRCUIT_THRESHOLD = '3';
    process.env.GNUBG_CIRCUIT_COOLDOWN_MS = '60000';

    fetchMock.mockImplementation(() => Promise.reject(new Error('GNUBG down')));

    const provider = new GNUBGProvider();

    await expect(provider.getBestMove({ boardState: {}, dice: [], userId: 'user-3' })).rejects.toThrow('GNUBG down');
    await expect(provider.getBestMove({ boardState: {}, dice: [], userId: 'user-3' })).rejects.toThrow('GNUBG down');
    await expect(provider.getBestMove({ boardState: {}, dice: [], userId: 'user-3' })).rejects.toThrow('GNUBG down');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalled();

    await expect(provider.getBestMove({ boardState: {}, dice: [], userId: 'user-3' })).rejects.toThrow('temporarily unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
