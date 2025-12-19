process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret';

jest.mock('../../src/server', () => ({
  prisma: {
    tournament_participants: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn(() => ({}))
  };
});

import { broadcastTournamentEvent, __testUtils, TournamentEventType } from '../../src/websocket/tournamentServer';
import type { WebSocket } from 'ws';

describe('broadcastTournamentEvent', () => {
  class FakeSocket {
    public sent: string[] = [];
    public closedWith?: { code: number; reason?: string };
    constructor(public readonly name: string) {}

    send = jest.fn((message: string) => {
      this.sent.push(message);
    });

    close = jest.fn((code: number, reason?: string) => {
      this.closedWith = { code, reason };
    });
  }

  const addConnection = (socket: FakeSocket, tournamentId: string): FakeSocket => {
    __testUtils.addConnection(socket as unknown as WebSocket, {
      userId: `user-${socket.name}`,
      tournamentId
    });
    return socket;
  };

  beforeEach(() => {
    __testUtils.clearConnections();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    __testUtils.clearConnections();
    jest.useRealTimers();
  });

  const emit = (tournamentId: string, type: TournamentEventType) => {
    broadcastTournamentEvent(tournamentId, type, { tournamentId, matchId: 'm-1' });
  };

  it('sends payload to connections of the same tournament', () => {
    const socketA = addConnection(new FakeSocket('A'), 't-1');
    addConnection(new FakeSocket('B'), 't-2');

    emit('t-1', 'matchCreated');

    expect(socketA.send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(socketA.sent[0]);
    expect(payload).toMatchObject({
      type: 'matchCreated',
      payload: { tournamentId: 't-1', matchId: 'm-1' }
    });
    expect(typeof payload.timestamp).toBe('string');
  });

  it('does not send payload to other tournaments', () => {
    const socketA = addConnection(new FakeSocket('A'), 't-1');
    const socketB = addConnection(new FakeSocket('B'), 't-2');

    emit('t-1', 'tournamentUpdated');

    expect(socketA.send).toHaveBeenCalledTimes(1);
    expect(socketB.send).not.toHaveBeenCalled();
  });

  it('closes socket when send throws and removes connection', () => {
    const socket = addConnection(new FakeSocket('erroring'), 't-1');
    socket.send.mockImplementation(() => {
      throw new Error('network');
    });

    emit('t-1', 'matchFinished');

    expect(socket.close).toHaveBeenCalledWith(1011, 'Broadcast failure');
    // Second emit should not call send again because connection was removed.
    socket.send.mockClear();
    emit('t-1', 'tournamentEnded');
    expect(socket.send).not.toHaveBeenCalled();
  });
});
