export type TournamentStatus = 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED';

export interface Player {
    id: string;
    username: string;
    avatar?: string;
    rating: number;
}

export interface TournamentParticipant {
    id: string;
    userId: string;
    username: string;
    score: number;
    tieBreaker: number; // Buchholz or similar
    matchesPlayed: number;
    wins: number;
    losses: number;
    isBye?: boolean;
}

export interface Match {
    id: string;
    roundId: string;
    player1Id: string; // Participant ID
    player2Id: string; // Participant ID
    player1Score: number;
    player2Score: number;
    winnerId?: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
    tableNumber: number;
}

export interface Round {
    id: string;
    tournamentId: string;
    number: number;
    matches: Match[];
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface Tournament {
    id: string;
    name: string;
    description: string;
    status: TournamentStatus;
    maxPlayers: number;
    currentPlayers: number;
    startTime: string; // ISO date
    format: 'SWISS' | 'ELIMINATION';
    roundsTotal: number;
    currentRound: number;
    participants: TournamentParticipant[];
    rounds: Round[];
    entryFee: number;
    prizePool: number;
}
