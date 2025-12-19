interface CoachResponse {
    explanation: string;
    analysis: {
        bestMove: string;
        equity: number;
        mistakeType?: 'blunder' | 'error' | 'inaccuracy';
    };
}
export declare class CoachService {
    private static readonly API_URL;
    private static readonly MODEL;
    static getCoachAdvice(gameId: string, userId: string, language?: string): Promise<CoachResponse>;
}
export {};
//# sourceMappingURL=coachService.d.ts.map