import { Tournament, Match, Round } from '../types/tournament';
// import { api } from '../utils/api';

// Mock data for development
const MOCK_TOURNAMENTS: Tournament[] = [
    {
        id: '1',
        name: 'GuruGammon Weekly Swiss',
        description: 'The premier weekly tournament for aspiring masters. 5 rounds Swiss.',
        status: 'REGISTRATION',
        maxPlayers: 32,
        currentPlayers: 12,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        format: 'SWISS',
        roundsTotal: 5,
        currentRound: 0,
        participants: [],
        rounds: [],
        entryFee: 10,
        prizePool: 300
    },
    {
        id: '2',
        name: 'Speed Gammon Blitz',
        description: 'Fast paced action. 3 rounds, 5 minute clock.',
        status: 'IN_PROGRESS',
        maxPlayers: 16,
        currentPlayers: 16,
        startTime: new Date(Date.now() - 3600000).toISOString(),
        format: 'SWISS',
        roundsTotal: 3,
        currentRound: 1,
        participants: Array.from({ length: 16 }).map((_, i) => ({
            id: `p${i}`,
            userId: `u${i}`,
            username: `Player ${i + 1}`,
            score: i % 2 === 0 ? 1 : 0,
            tieBreaker: 0,
            matchesPlayed: 1,
            wins: i % 2 === 0 ? 1 : 0,
            losses: i % 2 === 0 ? 0 : 1
        })),
        rounds: [
            {
                id: 'r1',
                tournamentId: '2',
                number: 1,
                status: 'COMPLETED',
                matches: Array.from({ length: 8 }).map((_, i) => ({
                    id: `m1_${i}`,
                    roundId: 'r1',
                    player1Id: `p${i * 2}`,
                    player2Id: `p${i * 2 + 1}`,
                    player1Score: 1,
                    player2Score: 0,
                    winnerId: `p${i * 2}`,
                    status: 'COMPLETED',
                    tableNumber: i + 1
                }))
            }
        ],
        entryFee: 5,
        prizePool: 80
    }
];

class TournamentService {
    private tournaments: Tournament[] = [...MOCK_TOURNAMENTS];

    async getTournaments(): Promise<Tournament[]> {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => resolve(this.tournaments), 500);
        });
    }

    async getTournament(id: string): Promise<Tournament | undefined> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(this.tournaments.find(t => t.id === id)), 300);
        });
    }

    async createTournament(data: Partial<Tournament>): Promise<Tournament> {
        const newTournament: Tournament = {
            id: Math.random().toString(36).substr(2, 9),
            name: data.name || 'New Tournament',
            description: data.description || '',
            status: 'REGISTRATION',
            maxPlayers: data.maxPlayers || 16,
            currentPlayers: 0,
            startTime: data.startTime || new Date().toISOString(),
            format: data.format || 'SWISS',
            roundsTotal: data.roundsTotal || 3,
            currentRound: 0,
            participants: [],
            rounds: [],
            entryFee: data.entryFee || 0,
            prizePool: data.prizePool || 0
        };
        this.tournaments.push(newTournament);
        return new Promise((resolve) => setTimeout(() => resolve(newTournament), 500));
    }

    async joinTournament(tournamentId: string, user: { id: string, username: string }): Promise<void> {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (tournament) {
            tournament.participants.push({
                id: user.id,
                userId: user.id,
                username: user.username,
                score: 0,
                tieBreaker: 0,
                matchesPlayed: 0,
                wins: 0,
                losses: 0
            });
            tournament.currentPlayers++;
        }
        return Promise.resolve();
    }

    // Swiss Pairing Logic (Simplified)
    async generatePairings(tournamentId: string): Promise<Round | null> {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return null;

        const roundNum = tournament.currentRound + 1;
        const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);

        const matches: Match[] = [];
        for (let i = 0; i < sortedParticipants.length; i += 2) {
            if (i + 1 < sortedParticipants.length) {
                matches.push({
                    id: `m${roundNum}_${i}`,
                    roundId: `r${roundNum}`,
                    player1Id: sortedParticipants[i].id,
                    player2Id: sortedParticipants[i + 1].id,
                    player1Score: 0,
                    player2Score: 0,
                    status: 'SCHEDULED',
                    tableNumber: (i / 2) + 1
                });
            } else {
                // Bye
                sortedParticipants[i].isBye = true;
                sortedParticipants[i].score += 1; // Bye point
                sortedParticipants[i].wins += 1;
            }
        }

        const newRound: Round = {
            id: `r${roundNum}`,
            tournamentId,
            number: roundNum,
            matches,
            status: 'IN_PROGRESS'
        };

        tournament.rounds.push(newRound);
        tournament.currentRound = roundNum;
        tournament.status = 'IN_PROGRESS';

        return newRound;
    }

    async simulateRoundResults(tournamentId: string): Promise<void> {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament || !tournament.rounds.length) return;

        const currentRound = tournament.rounds[tournament.rounds.length - 1];
        if (currentRound.status === 'COMPLETED') return;

        currentRound.matches.forEach(match => {
            if (match.status === 'COMPLETED') return;

            // Random winner
            const winner = Math.random() > 0.5 ? match.player1Id : match.player2Id;
            match.winnerId = winner;
            match.player1Score = winner === match.player1Id ? 7 : Math.floor(Math.random() * 6);
            match.player2Score = winner === match.player2Id ? 7 : Math.floor(Math.random() * 6);
            match.status = 'COMPLETED';

            // Update participant scores
            const p1 = tournament.participants.find(p => p.id === match.player1Id);
            const p2 = tournament.participants.find(p => p.id === match.player2Id);

            if (p1 && p2) {
                p1.matchesPlayed++;
                p2.matchesPlayed++;
                if (winner === match.player1Id) {
                    p1.score += 1;
                    p1.wins++;
                    p2.losses++;
                } else {
                    p2.score += 1;
                    p2.wins++;
                    p1.losses++;
                }
            }
        });

        currentRound.status = 'COMPLETED';
        return Promise.resolve();
    }
}

export const tournamentService = new TournamentService();
