import type { EvaluationResult, SuggestedMove } from '../types/ai';
import type { Move } from '../types/game';
export interface HintInput {
    board: unknown;
    dice: unknown;
    move?: Move | null;
    userId?: string | null;
    gameId?: string | null;
}
export interface EvaluateInput {
    board: unknown;
    dice?: unknown;
    userId?: string | null;
    gameId?: string | null;
}
export interface AnalyzeGameInput {
    moves: Move[];
}
export declare function getHint(input: HintInput): Promise<SuggestedMove>;
export declare function evaluatePosition(input: EvaluateInput): Promise<EvaluationResult>;
export declare function analyzeGame(input: AnalyzeGameInput): Promise<{
    totalError: number;
    errorRate: number;
    criticalMoves: number;
    avgErrorPerMove?: number | undefined;
}>;
export declare const gnubgService: {
    getHint: typeof getHint;
    evaluatePosition: typeof evaluatePosition;
    analyzeGame: typeof analyzeGame;
};
//# sourceMappingURL=gnubgService.d.ts.map