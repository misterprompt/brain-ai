import type { MatchmakingStatusEvent, MatchmakingMatchFoundEvent } from '../../src/services/matchmakingService.js';
import { MatchmakingService } from '../../src/services/matchmakingService.js';
import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/lib/prisma', () => {
  const create = jest.fn().mockResolvedValue(undefined);
  return {
    prisma: {
      games: {
        create
      }
    }
  };
});

type PrismaMock = {
  games: {
    create: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

describe('MatchmakingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MatchmakingService.clear();
  });

  it('enqueues a user and emits searching status', async () => {
    const statusEvents: MatchmakingStatusEvent[] = [];
    const unsubscribe = MatchmakingService.onStatus((event) => statusEvents.push(event));

    await MatchmakingService.joinQueue('user-a', {});

    const status = MatchmakingService.getStatus('user-a');
    expect(status.searching).toBe(true);
    expect(status.preferences).toEqual({});
    expect(typeof status.joinedAt).toBe('number');
    expect(status.gameId).toBeNull();
    expect(statusEvents.some((event) => event.userId === 'user-a' && event.status === 'searching')).toBe(true);

    unsubscribe();
  });

  it('matches two users and creates a pending game', async () => {
    const statusEvents: MatchmakingStatusEvent[] = [];
    const matchEvents: MatchmakingMatchFoundEvent[] = [];
    const unsubscribeStatus = MatchmakingService.onStatus((event) => statusEvents.push(event));
    const unsubscribeMatch = MatchmakingService.onMatchFound((event) => matchEvents.push(event));

    await MatchmakingService.joinQueue('user-a', {});
    await MatchmakingService.joinQueue('user-b', {});

    expect(prismaMock.games.create).toHaveBeenCalledTimes(1);
    const [params] = prismaMock.games.create.mock.calls[0];
    const players = new Set([params.data.whitePlayerId, params.data.blackPlayerId]);
    expect(players).toEqual(new Set(['user-a', 'user-b']));

    const statusA = MatchmakingService.getStatus('user-a');
    const statusB = MatchmakingService.getStatus('user-b');
    expect(statusA.searching).toBe(false);
    expect(statusB.searching).toBe(false);
    expect(statusA.gameId).toEqual(statusB.gameId);
    expect(statusA.gameId).not.toBeNull();

    expect(matchEvents).toHaveLength(2);
    const gameIds = matchEvents.map((event) => event.gameId);
    expect(gameIds.every((gameId) => gameId === statusA.gameId)).toBe(true);

    unsubscribeStatus();
    unsubscribeMatch();
  });

  it('removes a user from queue and emits cancelled status', async () => {
    const statusEvents: MatchmakingStatusEvent[] = [];
    const unsubscribe = MatchmakingService.onStatus((event) => statusEvents.push(event));

    await MatchmakingService.joinQueue('user-a', {});
    await MatchmakingService.leaveQueue('user-a');

    const status = MatchmakingService.getStatus('user-a');
    expect(status.searching).toBe(false);
    expect(status.gameId).toBeNull();
    expect(statusEvents.some((event) => event.userId === 'user-a' && event.status === 'cancelled')).toBe(true);

    unsubscribe();
  });
});
