// src/services/tournamentService.ts
// FIXED: Changed 'user' to 'users' in Prisma includes
// FIXED: Changed 'playerLeft' to 'participantLeft' for consistency
// FIXED: Added proper null handling and undefined checks
import { prisma } from '../lib/prisma';
import { broadcastTournamentEvent } from '../websocket/tournamentServer';
import { AppError } from '../utils/errors';
import { GameService } from './gameService';
import { tournamentRounds } from '../metrics/registry';
import { notificationService } from './notificationService';

export class TournamentService {
  static async createTournament(data: {
    name: string;
    createdBy: string;
    description?: string;
    entryFee?: number;
    prizePool?: number;
    maxPlayers?: number;
    startTime?: Date;
  }) {
    const tournament = await prisma.tournaments.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        createdBy: data.createdBy,
        description: data.description ?? null,
        entryFee: data.entryFee ?? 0,
        prizePool: data.prizePool ?? 0,
        maxPlayers: data.maxPlayers ?? null,
        startTime: data.startTime ?? null,
        status: 'REGISTRATION'
      }
    });

    return tournament;
  }

  static async getTournament(tournamentId: string) {
    return await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { participants: true }
    });
  }

  static async joinTournament(tournamentId: string, userId: string) {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { participants: true }
    });

    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'REGISTRATION') {
      throw new Error('Tournament is no longer accepting registrations');
    }
    if (tournament.maxPlayers && tournament.participants.length >= tournament.maxPlayers) {
      throw new Error('Tournament is full');
    }

    const existing = tournament.participants.find(p => p.user_id === userId);
    if (existing) {
      throw new Error('User already registered in this tournament');
    }

    const participant = await prisma.tournament_participants.create({
      data: {
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        user_id: userId,
        current_position: 0
      }
    });

    broadcastTournamentEvent(tournamentId, 'playerJoined', { userId });
    return participant;
  }

  static async leaveTournament(tournamentId: string, userId: string) {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { participants: true }
    });

    if (!tournament) throw new Error('Tournament not found');

    const participant = tournament.participants.find(p => p.user_id === userId);
    if (!participant) {
      throw new Error('User not registered in this tournament');
    }

    await prisma.tournament_participants.delete({
      where: { id: participant.id }
    });

    broadcastTournamentEvent(tournamentId, 'participantLeft', { userId });
  }

  static async notifyParticipants(params: {
    tournamentId: string;
    message: string;
    payload: any;
    excludeUserIds?: string[];
  }) {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: params.tournamentId },
      include: { participants: true }
    });

    if (!tournament) return;

    const userIds = tournament.participants
      .map(p => p.user_id)
      .filter(id => !params.excludeUserIds?.includes(id));

    for (const userId of userIds) {
      await notificationService.notifyInvitation(userId, {
        source: 'tournament',
        contextId: params.tournamentId,
        inviterId: 'SYSTEM',
        inviterUsername: null
      });
    }
  }

  static async listParticipants(tournamentId: string) {
    return await prisma.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      include: { users: true }
    });
  }

  static async listLeaderboard(tournamentId: string) {
    const participants = await prisma.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      include: {
        wonMatches: true,
        users: true
      },
      orderBy: { current_position: 'asc' }
    });

    return participants.map(p => ({
      ...p,
      wins: p.wonMatches.length
    }));
  }

  static async getUserRole(tournamentId: string, userId: string): Promise<string> {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) throw new Error('Tournament not found');
    if (tournament.createdBy === userId) return 'ORGANIZER';
    return 'PARTICIPANT';
  }

  static async reportMatchResult(params: {
    matchId: string;
    winnerParticipantId: string;
    gameId: string | null;
  }) {
    await prisma.tournament_matches.update({
      where: { id: params.matchId },
      data: {
        winnerParticipantId: params.winnerParticipantId,
        gameId: params.gameId ?? null,
        status: 'COMPLETED',
        finishedAt: new Date()
      }
    });
  }

  static async getStandings(tournamentId: string) {
    return await this.listLeaderboard(tournamentId);
  }

  static async getBracket(tournamentId: string) {
    const matches = await prisma.tournament_matches.findMany({
      where: { tournamentId },
      include: {
        white: { include: { users: true } },
        black: { include: { users: true } },
        winner: { include: { users: true } }
      },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
    });

    return matches;
  }

  static async getOverview(tournamentId: string, userId: string) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const standings = await this.getStandings(tournamentId);
    const bracket = await this.getBracket(tournamentId);

    return {
      tournament,
      standings,
      bracket,
      userRole: await this.getUserRole(tournamentId, userId)
    };
  }

  static async registerPlayer(tournamentId: string, userId: string) {
    return await this.joinTournament(tournamentId, userId);
  }

  static async startTournament(tournamentId: string) {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { participants: true }
    });

    if (!tournament) throw new AppError('Tournament not found', 404);
    if (tournament.participants.length < 2) {
      throw new Error('At least two participants required to start tournament');
    }

    await prisma.tournaments.update({
      where: { id: tournamentId },
      data: { status: 'IN_PROGRESS', startTime: new Date() }
    });

    await this.generatePairings(tournamentId, 1);

    broadcastTournamentEvent(tournamentId, 'tournamentUpdated', { status: 'IN_PROGRESS' });
  }

  static async generatePairings(tournamentId: string, round: number) {
    // Update metrics
    tournamentRounds.set({ tournament_id: tournamentId }, round);

    const participants = await prisma.tournament_participants.findMany({
      where: { tournament_id: tournamentId },
      include: {
        wonMatches: true,
        whiteMatches: true,
        blackMatches: true
      }
    });

    // Calculate scores
    const playersWithScores = participants.map(p => {
      const wins = p.wonMatches.length;
      const byes = p.whiteMatches.filter(m => !m.blackParticipantId && m.winnerParticipantId === p.id).length +
        p.blackMatches.filter(m => !m.whiteParticipantId && m.winnerParticipantId === p.id).length;
      return { ...p, score: wins + byes };
    });

    playersWithScores.sort((a, b) => b.score - a.score);

    type PlayerWithScore = typeof playersWithScores[0];
    const pairings: Array<[PlayerWithScore, PlayerWithScore | null]> = [];
    const pairedIds = new Set<string>();

    for (let i = 0; i < playersWithScores.length; i++) {
      const p1 = playersWithScores[i];
      if (!p1 || pairedIds.has(p1.id)) continue;

      let p2: PlayerWithScore | null = null;

      for (let j = i + 1; j < playersWithScores.length; j++) {
        const candidate = playersWithScores[j];
        if (candidate && !pairedIds.has(candidate.id)) {
          p2 = candidate;
          break;
        }
      }

      if (p2) {
        pairings.push([p1, p2]);
        pairedIds.add(p1.id);
        pairedIds.add(p2.id);
      } else {
        pairings.push([p1, null]);
        pairedIds.add(p1.id);
      }
    }

    for (const [p1, p2] of pairings) {
      if (p2) {
        const game = await GameService.createGame({
          userId: p1.user_id,
          mode: 'TOURNAMENT',
          opponentId: p2.user_id,
          stake: 0
        });

        await prisma.games.update({
          where: { id: game.id },
          data: { tournamentId: tournamentId ?? null }
        });

        await prisma.tournament_matches.create({
          data: {
            tournamentId,
            round,
            matchNumber: 0,
            whiteParticipantId: p1.id,
            blackParticipantId: p2.id,
            gameId: game.id,
            status: 'SCHEDULED'
          }
        });

        broadcastTournamentEvent(tournamentId, 'matchCreated', {
          whiteId: p1.user_id,
          blackId: p2.user_id,
          gameId: game.id
        });
      } else {
        await prisma.tournament_matches.create({
          data: {
            tournamentId,
            round,
            matchNumber: 0,
            whiteParticipantId: p1.id,
            winnerParticipantId: p1.id,
            status: 'COMPLETED',
            finishedAt: new Date()
          }
        });
      }
    }
  }

  static async handleMatchCompletion(gameId: string, winnerId: string) {
    const match = await prisma.tournament_matches.findUnique({
      where: { gameId },
      include: {
        white: true,
        black: true,
        tournament: { include: { participants: true } }
      }
    });

    if (!match) return;

    const winnerParticipant = match.whiteParticipantId && match.white?.user_id === winnerId
      ? match.white
      : match.black;

    if (!winnerParticipant) return;

    await prisma.tournament_matches.update({
      where: { id: match.id },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        winnerParticipantId: winnerParticipant.id
      }
    });

    broadcastTournamentEvent(match.tournamentId, 'matchFinished', { gameId, winnerId });

    const currentRoundMatches = await prisma.tournament_matches.findMany({
      where: {
        tournamentId: match.tournamentId,
        round: match.round
      }
    });

    const allComplete = currentRoundMatches.every(m => m.status === 'COMPLETED');

    if (allComplete) {
      if (match.round < 3) {
        await this.generatePairings(match.tournamentId, match.round + 1);
      } else {
        await prisma.tournaments.update({
          where: { id: match.tournamentId },
          data: { status: 'FINISHED', endTime: new Date() }
        });
        broadcastTournamentEvent(match.tournamentId, 'tournamentEnded', {});
      }
    }
  }
}
