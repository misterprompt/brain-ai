export declare class TournamentService {
    static startTournament(tournamentId: string): Promise<void>;
    static generatePairings(tournamentId: string, round: number): Promise<void>;
    static reportMatchResult(gameId: string, winnerId: string): Promise<void>;
}
//# sourceMappingURL=tournamentService.d.ts.map