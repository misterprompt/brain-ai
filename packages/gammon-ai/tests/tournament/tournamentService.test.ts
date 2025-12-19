import { TournamentService } from '../../src/services/tournamentService';
import { prisma } from '../../src/lib/prisma';
import { broadcastTournamentEvent } from '../../src/websocket/tournamentServer.js';
import { notificationService } from '../../src/services/notificationService';
import {
  tournamentParticipantsTotal,
  tournamentsStartedTotal,
  tournamentMatchesTotal
} from '../../src/metrics/tournamentMetrics';

jest.mock('../../src/websocket/tournamentServer.js', () => ({
  broadcastTournamentEvent: jest.fn()
}));

jest.mock('../../src/services/notificationService', () => ({
  notificationService: {
    notifyTournamentUpdate: jest.fn(),
    notifyInvitation: jest.fn()
  }
}));

const participantJoinIncMock = jest.fn();
const participantLeaveIncMock = jest.fn();
const matchScheduledIncMock = jest.fn();
const matchAutoAdvanceIncMock = jest.fn();
const matchCompletedIncMock = jest.fn();

jest.mock('../../src/metrics/tournamentMetrics', () => ({
  tournamentParticipantsTotal: {
    labels: jest.fn((label: string) => {
      if (label === 'join') {
        return { inc: participantJoinIncMock };
      }
      if (label === 'leave') {
        return { inc: participantLeaveIncMock };
      }

      return { inc: jest.fn() };
    })
  },
  tournamentsStartedTotal: {
    inc: jest.fn()
  },
  tournamentMatchesTotal: {
    labels: jest.fn((label: string) => {
      if (label === 'scheduled') {
        return { inc: matchScheduledIncMock };
      }
      if (label === 'auto_advance') {
        return { inc: matchAutoAdvanceIncMock };
      }
      if (label === 'completed') {
        return { inc: matchCompletedIncMock };
      }
      return { inc: jest.fn() };
    })
  }
}));

jest.mock('../../src/lib/prisma', () => {
  const tournaments = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };

  const tournament_participants = {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  };

  const tournament_matches = {
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn()
  };

  const tx = {
    tournaments,
    tournament_participants,
    tournament_matches
  };

  const $transaction = jest.fn((fn: (trx: typeof tx) => any) => fn(tx));

  return {
    prisma: {
      tournaments,
      tournament_participants,
      tournament_matches,
      $transaction
    }
  };
});

type MockedPrisma = {
  tournaments: Record<'findUnique' | 'create' | 'update', jest.Mock>;
  tournament_participants: Record<
    'findMany' | 'count' | 'findUnique' | 'create' | 'delete' | 'update' | 'updateMany',
    jest.Mock
  >;
  tournament_matches: Record<'create' | 'update' | 'count' | 'findMany', jest.Mock>;
  $transaction: jest.Mock;
};

const prismaMock = prisma as unknown as MockedPrisma;

const resetPrismaMocks = () => {
  Object.values(prismaMock.tournaments).forEach((fn) => fn.mockReset());
  Object.values(prismaMock.tournament_participants).forEach((fn) => fn.mockReset());
  Object.values(prismaMock.tournament_matches).forEach((fn) => fn.mockReset());
  prismaMock.$transaction.mockClear();
};

const resetMetricMocks = () => {
  participantJoinIncMock.mockReset();
  participantLeaveIncMock.mockReset();
  matchScheduledIncMock.mockReset();
  matchAutoAdvanceIncMock.mockReset();
  matchCompletedIncMock.mockReset();
  (tournamentParticipantsTotal.labels as jest.Mock).mockClear();
  (tournamentMatchesTotal.labels as jest.Mock).mockClear();
  (tournamentsStartedTotal.inc as jest.Mock).mockClear();
};

describe('TournamentService', () => {
  let listParticipantIdsSpy: jest.SpyInstance<Promise<string[]>>;
  let notifyParticipantsSpy: jest.SpyInstance<Promise<void>>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMocks();
    resetMetricMocks();
    listParticipantIdsSpy = jest.spyOn(TournamentService, 'listParticipantIds').mockResolvedValue(['user-1', 'user-2']);
    notifyParticipantsSpy = jest.spyOn(TournamentService, 'notifyParticipants').mockResolvedValue();
  });

  afterEach(() => {
    listParticipantIdsSpy.mockRestore();
    notifyParticipantsSpy.mockRestore();
  });

  describe('createTournament', () => {
    it('creates a tournament and returns a summary payload', async () => {
      prismaMock.tournaments.create.mockResolvedValue({
        id: 't-1',
        name: 'Open Cup',
        description: null,
        entryFee: 0,
        prizePool: 0,
        maxPlayers: null,
        status: 'REGISTRATION',
        startTime: null,
        endTime: null,
        createdBy: 'admin'
      });

      prismaMock.tournaments.findUnique.mockResolvedValue({
        id: 't-1',
        name: 'Open Cup',
        description: null,
        entryFee: 0,
        prizePool: 0,
        maxPlayers: null,
        status: 'REGISTRATION',
        startTime: null,
        endTime: null,
        createdBy: 'admin',
        _count: {
          participants: 0,
          matches: 0
        }
      });

      const result = await TournamentService.createTournament({
        name: 'Open Cup',
        createdBy: 'admin'
      });

      expect(result).toEqual({
        id: 't-1',
        name: 'Open Cup',
        description: null,
        entryFee: 0,
        prizePool: 0,
        maxPlayers: null,
        status: 'REGISTRATION',
        startTime: null,
        endTime: null,
        createdBy: 'admin',
        participants: 0,
        matches: 0
      });
      expect(prismaMock.tournaments.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('joinTournament', () => {
    it('persists the participant and increments metrics', async () => {
      prismaMock.tournaments.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'REGISTRATION',
        maxPlayers: null
      });
      prismaMock.tournament_participants.count.mockResolvedValue(0);
      prismaMock.tournament_participants.findUnique.mockResolvedValue(null);
      prismaMock.tournament_participants.create.mockResolvedValue({
        id: 'tp-1',
        tournament_id: 't-1',
        user_id: 'user-1',
        current_position: 0
      });

      const participant = await TournamentService.joinTournament('t-1', 'user-1');

      expect(participant).toEqual({
        id: 'tp-1',
        tournament_id: 't-1',
        user_id: 'user-1',
        current_position: 0
      });
      expect(tournamentParticipantsTotal.labels).toHaveBeenCalledWith('join');
      expect(participantJoinIncMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('leaveTournament', () => {
    it('removes the participant and increments metrics', async () => {
      prismaMock.tournaments.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'REGISTRATION'
      });
      prismaMock.tournament_participants.findUnique.mockResolvedValue({
        id: 'tp-1',
        tournament_id: 't-1',
        user_id: 'user-1'
      });
      prismaMock.tournament_participants.delete.mockResolvedValue(undefined);

      await TournamentService.leaveTournament('t-1', 'user-1');

      expect(prismaMock.tournament_participants.delete).toHaveBeenCalledWith({ where: { id: 'tp-1' } });
      expect(tournamentParticipantsTotal.labels).toHaveBeenCalledWith('leave');
      expect(participantLeaveIncMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('startTournament', () => {
    it('updates status, emits events and records metrics', async () => {
      const now = Date.now();
      const createdMatches: any[] = [];

      listParticipantIdsSpy.mockResolvedValue(['user-1', 'user-2']);

      prismaMock.tournament_participants.findMany.mockImplementation((args) => {
        if (args?.select?.user_id) {
          return [
            { user_id: 'user-1' },
            { user_id: 'user-2' }
          ];
        }
        return [
          { id: 'tp-1', registered_at: now },
          { id: 'tp-2', registered_at: now }
        ];
      });

      prismaMock.tournaments.findUnique.mockResolvedValue({
        id: 't-1',
        name: 'Open Cup',
        description: null,
        entryFee: 0,
        prizePool: 0,
        maxPlayers: null,
        status: 'REGISTRATION',
        startTime: null,
        endTime: null,
        createdBy: 'admin',
        _count: {
          participants: 2,
          matches: 0
        }
      });

      prismaMock.tournament_matches.create.mockImplementation((args) => {
        const record = { ...args.data };
        createdMatches.push(record);
        return record;
      });

      await TournamentService.startTournament('t-1');

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect((tournamentsStartedTotal.inc as jest.Mock)).toHaveBeenCalledTimes(1);
      expect(broadcastTournamentEvent).toHaveBeenCalledWith('t-1', 'tournamentUpdated', {
        tournamentId: 't-1',
        type: 'started',
        round: 1
      });
      expect(createdMatches).toHaveLength(1);
      expect(matchScheduledIncMock).toHaveBeenCalledWith(1);
      expect(notifyParticipantsSpy).toHaveBeenCalled();
    });
  });

  describe('reportMatchResult', () => {
    it('finalises match, broadcasts events and enqueues next round', async () => {
      const matchRecord = {
        id: 'match-1',
        tournamentId: 't-1',
        round: 1,
        matchNumber: 1
      };

      (TournamentService.listParticipantIds as jest.Mock).mockResolvedValue(['user-1', 'user-2']);

      prismaMock.tournament_matches.update.mockResolvedValue(matchRecord);
      prismaMock.tournament_participants.update.mockResolvedValue(undefined);
      prismaMock.tournament_matches.count.mockResolvedValue(0);
      prismaMock.tournament_matches.findMany.mockResolvedValue([
        { winnerParticipantId: 'tp-1' },
        { winnerParticipantId: 'tp-2' }
      ]);

      const createdMatches: any[] = [];
      prismaMock.tournament_matches.create.mockImplementation((args) => {
        const record = { ...args.data };
        createdMatches.push(record);
        return record;
      });

      await TournamentService.reportMatchResult({
        matchId: 'match-1',
        winnerParticipantId: 'tp-1'
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(matchCompletedIncMock).toHaveBeenCalled();
      expect(broadcastTournamentEvent).toHaveBeenCalledWith('t-1', 'matchFinished', expect.objectContaining({
        matchId: 'match-1'
      }));
      expect(createdMatches.length).toBeGreaterThan(0);
      expect(notifyParticipantsSpy).toHaveBeenCalled();
    });
  });

  describe('getUserRole', () => {
    it('returns ORGANIZER when user created the tournament', async () => {
      prismaMock.tournaments.findUnique.mockResolvedValue({
        id: 't-1',
        createdBy: 'creator'
      } as any);

      const role = await TournamentService.getUserRole('t-1', 'creator');
      expect(role).toBe('ORGANIZER');
    });

    it('returns PLAYER when user is registered', async () => {
      prismaMock.tournaments.findUnique.mockResolvedValue({
        id: 't-1',
        createdBy: 'creator'
      } as any);

      prismaMock.tournament_participants.findUnique.mockResolvedValue({
        id: 'tp-1',
        tournament_id: 't-1',
        user_id: 'player-1'
      } as any);

      const role = await TournamentService.getUserRole('t-1', 'player-1');
      expect(role).toBe('PLAYER');
    });

    it('returns SPECTATOR when user is not registered', async () => {
      prismaMock.tournaments.findUnique.mockResolvedValue({
        id: 't-1',
        createdBy: 'creator'
      } as any);

      prismaMock.tournament_participants.findUnique.mockResolvedValue(null);

      const role = await TournamentService.getUserRole('t-1', 'viewer');
      expect(role).toBe('SPECTATOR');
    });

    it('throws if tournament does not exist', async () => {
      prismaMock.tournaments.findUnique.mockResolvedValue(null);

      await expect(TournamentService.getUserRole('t-1', 'any')).rejects.toThrow('Tournament not found');
    });
  });

  describe('getStandings', () => {
    it('computes wins, losses, and ordering', async () => {
      const now = new Date('2025-11-20T18:00:00.000Z');
      prismaMock.tournament_participants.findMany.mockResolvedValue([
        {
          id: 'tp-1',
          tournament_id: 't-1',
          user_id: 'player-1',
          registered_at: now,
          current_position: 1
        },
        {
          id: 'tp-2',
          tournament_id: 't-1',
          user_id: 'player-2',
          registered_at: new Date(now.getTime() + 1000),
          current_position: 2
        }
      ] as any);

      prismaMock.tournament_matches.findMany.mockResolvedValue([
        {
          tournamentId: 't-1',
          round: 1,
          matchNumber: 1,
          whiteParticipantId: 'tp-1',
          blackParticipantId: 'tp-2',
          winnerParticipantId: 'tp-1',
          status: 'COMPLETED'
        }
      ] as any);

      const standings = await TournamentService.getStandings('t-1');

      expect(prismaMock.tournament_participants.findMany).toHaveBeenCalledWith({
        where: { tournament_id: 't-1' },
        orderBy: [{ registered_at: 'asc' }]
      });

      expect(standings).toEqual([
        expect.objectContaining({
          participantId: 'tp-1',
          wins: 1,
          losses: 0,
          eliminated: false
        }),
        expect.objectContaining({
          participantId: 'tp-2',
          wins: 0,
          losses: 1,
          eliminated: true
        })
      ]);
    });
  });

  describe('getBracket', () => {
    it('groups matches by round', async () => {
      prismaMock.tournament_matches.findMany.mockResolvedValue([
        {
          id: 'match-1',
          tournamentId: 't-1',
          round: 1,
          matchNumber: 1,
          whiteParticipantId: 'tp-1',
          blackParticipantId: 'tp-2',
          winnerParticipantId: null,
          status: 'SCHEDULED',
          scheduledAt: null,
          startedAt: null,
          finishedAt: null,
          gameId: null
        },
        {
          id: 'match-2',
          tournamentId: 't-1',
          round: 2,
          matchNumber: 1,
          whiteParticipantId: 'tp-3',
          blackParticipantId: 'tp-4',
          winnerParticipantId: null,
          status: 'SCHEDULED',
          scheduledAt: null,
          startedAt: null,
          finishedAt: null,
          gameId: null
        }
      ] as any);

      const bracket = await TournamentService.getBracket('t-1');

      expect(prismaMock.tournament_matches.findMany).toHaveBeenCalledWith({
        where: { tournamentId: 't-1' },
        orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
      });

      expect(bracket).toEqual([
        {
          round: 1,
          matches: [
            expect.objectContaining({
              id: 'match-1',
              matchNumber: 1,
              status: 'SCHEDULED'
            })
          ]
        },
        {
          round: 2,
          matches: [
            expect.objectContaining({ id: 'match-2', matchNumber: 1 })
          ]
        }
      ]);
    });
  });
});
