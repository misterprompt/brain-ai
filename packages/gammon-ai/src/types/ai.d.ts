import type { Move } from './game';
export interface SuggestedMove {
    move: Move | null;
    explanation: string;
    equity: number;
}
export interface EvaluationResult {
    equity: number;
    pr: number;
    winrate: number;
    explanation: string;
}
//# sourceMappingURL=ai.d.ts.map