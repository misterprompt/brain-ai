export interface ApplyEloMatchOptions {
    winnerUserId: string;
    loserUserId: string;
    isDraw?: boolean;
    seasonId?: string | null;
}
export interface EloMatchResult {
    winner: {
        userId: string;
        rating: number;
    };
    loser: {
        userId: string;
        rating: number;
    };
    scope: {
        type: 'global' | 'global+season';
        seasonId?: string | null;
    };
}
export declare class EloService {
    static expectedScore(playerRating: number, opponentRating: number): number;
    static applyMatchResult(options: ApplyEloMatchOptions): Promise<EloMatchResult>;
}
//# sourceMappingURL=eloService.d.ts.map