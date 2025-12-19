"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentService = void 0;
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const gameService_1 = require("./gameService");
const logger = new logger_1.Logger('TournamentService');
class TournamentService {
    static async startTournament(tournamentId) {
        const tournament = await prisma_1.prisma.tournaments.findUnique({
            where: { id: tournamentId },
            include: { participants: true }
        });
        if (!tournament)
            throw new errors_1.AppError('Tournament not found', 404);
        if (tournament.status !== 'REGISTRATION')
            throw new errors_1.AppError('Tournament already started', 400);
        if (tournament.participants.length < 2)
            throw new errors_1.AppError('Not enough participants', 400);
        await prisma_1.prisma.tournaments.update({
            where: { id: tournamentId },
            data: { status: 'IN_PROGRESS', startTime: new Date(), currentRound: 1 }
        });
        await this.generatePairings(tournamentId, 1);
    }
    static async generatePairings(tournamentId, round) {
        const tournament = await prisma_1.prisma.tournaments.findUnique({
            where: { id: tournamentId },
            include: {
                participants: true,
                matches: true
            }
        });
        if (!tournament)
            return;
        const participants = [...tournament.participants];
        const pastMatches = tournament.matches;
        // Calculate scores
        const scores = new Map();
        participants.forEach(p => scores.set(p.id, 0));
        pastMatches.forEach(m => {
            if (m.winnerParticipantId) {
                scores.set(m.winnerParticipantId, (scores.get(m.winnerParticipantId) || 0) + 1);
            }
        });
        // Sort by score descending
        participants.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
        const pairings = [];
        const paired = new Set();
        // Simple Swiss pairing logic (greedy)
        // TODO: Implement proper graph matching for perfect Swiss pairing
        for (let i = 0; i < participants.length; i++) {
            if (paired.has(participants[i].id))
                continue;
            const p1 = participants[i];
            let p2 = null;
            // Find best opponent: similar score, not played before
            for (let j = i + 1; j < participants.length; j++) {
                if (paired.has(participants[j].id))
                    continue;
                const candidate = participants[j];
                const playedBefore = pastMatches.some(m => (m.whiteParticipantId === p1.id && m.blackParticipantId === candidate.id) ||
                    (m.whiteParticipantId === candidate.id && m.blackParticipantId === p1.id));
                if (!playedBefore) {
                    p2 = candidate;
                    break;
                }
            }
            // If no valid opponent found (rare in simple implementation, but possible), take next available
            if (!p2) {
                for (let j = i + 1; j < participants.length; j++) {
                    if (!paired.has(participants[j].id)) {
                        p2 = participants[j];
                        break;
                    }
                }
            }
            if (p2) {
                pairings.push({ white: p1.id, black: p2.id });
                paired.add(p1.id);
                paired.add(p2.id);
            }
            else {
                // Bye
                pairings.push({ white: p1.id, black: null });
                paired.add(p1.id);
            }
        }
        // Create matches
        for (const pair of pairings) {
            if (pair.black) {
                // Create game
                const game = await gameService_1.GameService.createGame({
                    userId: (await prisma_1.prisma.tournament_participants.findUnique({ where: { id: pair.white } })).user_id,
                    opponentId: (await prisma_1.prisma.tournament_participants.findUnique({ where: { id: pair.black } })).user_id,
                    mode: 'TOURNAMENT',
                    stake: 0
                });
                await prisma_1.prisma.games.update({
                    where: { id: game.id },
                    data: { tournamentId }
                });
                await prisma_1.prisma.tournament_matches.create({
                    data: {
                        tournamentId,
                        round,
                        matchNumber: pairings.indexOf(pair) + 1,
                        whiteParticipantId: pair.white,
                        blackParticipantId: pair.black,
                        gameId: game.id,
                        status: 'SCHEDULED'
                    }
                });
            }
            else {
                // Bye
                await prisma_1.prisma.tournament_matches.create({
                    data: {
                        tournamentId,
                        round,
                        matchNumber: pairings.indexOf(pair) + 1,
                        whiteParticipantId: pair.white,
                        winnerParticipantId: pair.white,
                        isBye: true,
                        status: 'COMPLETED',
                        finishedAt: new Date()
                    }
                });
            }
        }
    }
    static async reportMatchResult(gameId, winnerId) {
        const match = await prisma_1.prisma.tournament_matches.findUnique({
            where: { gameId },
            include: { tournament: true }
        });
        if (!match)
            return;
        // Find participant ID for the winner (user_id -> participant_id)
        const participant = await prisma_1.prisma.tournament_participants.findFirst({
            where: {
                tournament_id: match.tournamentId,
                user_id: winnerId
            }
        });
        if (!participant)
            return;
        await prisma_1.prisma.tournament_matches.update({
            where: { id: match.id },
            data: {
                status: 'COMPLETED',
                winnerParticipantId: participant.id,
                finishedAt: new Date()
            }
        });
        // Check if round is complete
        const currentRoundMatches = await prisma_1.prisma.tournament_matches.findMany({
            where: {
                tournamentId: match.tournamentId,
                round: match.round
            }
        });
        if (currentRoundMatches.every(m => m.status === 'COMPLETED')) {
            // Start next round
            const nextRound = match.round + 1;
            await prisma_1.prisma.tournaments.update({
                where: { id: match.tournamentId },
                data: { currentRound: nextRound }
            });
            await this.generatePairings(match.tournamentId, nextRound);
        }
    }
}
exports.TournamentService = TournamentService;
//# sourceMappingURL=tournamentService.js.map