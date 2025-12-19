import { BoardState, Move } from '../types/game';
export declare class GNUBGRunner {
    static boardToGNUBGFormat(board: BoardState): string;
    static createTempFile(content: string, extension?: string): Promise<string>;
    static cleanupTempFile(filepath: string): void;
    static getHint(board: BoardState, dice: number[]): Promise<{
        move: Move;
        evaluation: number;
        confidence: number;
    }>;
    static parseHintOutput(output: string): {
        move: Move;
        evaluation: number;
        confidence: number;
    };
    static parseGNUBGMove(gnubgMove: string): Move;
    static evaluatePosition(board: BoardState): Promise<{
        equity: number;
        winProbability: number;
        gammonProbability: number;
        backgammonProbability: number;
    }>;
    static parseEvaluationOutput(output: string): {
        equity: number;
        winProbability: number;
        gammonProbability: number;
        backgammonProbability: number;
    };
    static analyzeGame(_moves: Move[]): Promise<{
        totalError: number;
        errorRate: number;
        criticalMoves: number;
        analysis: string;
    }>;
    static checkInstallation(): Promise<boolean>;
}
//# sourceMappingURL=gnubgRunner.d.ts.map