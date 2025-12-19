import type { Move } from '../types/game';
import type { EvaluationResult, SuggestedMove } from '../types/ai';
import { type UserPlan } from './subscriptionService';
export interface AnalyzeInput {
    boardState: unknown;
    dice: unknown;
    move?: Move | null;
    userId?: string;
    gameId?: string;
}
export interface AIProvider {
    getBestMove(input: AnalyzeInput): Promise<SuggestedMove>;
    evaluatePosition(input: AnalyzeInput): Promise<EvaluationResult>;
}
export declare class QuotaExceededError extends Error {
    readonly statusCode = 429;
    constructor(message?: string);
}
export type QuotaInfo = {
    plan: UserPlan;
    used: number;
    limit: number;
    extra: number;
};
export declare const checkQuota: (userId: string) => Promise<"ok" | "limit">;
export declare const getQuotaStatus: (userId: string) => Promise<QuotaInfo>;
export declare const addExtraQuota: (userId: string, amount: number) => Promise<number>;
export declare const setAIProvider: (provider: AIProvider) => void;
export declare function getBestMove(input: AnalyzeInput): Promise<SuggestedMove>;
export declare function evaluatePosition(input: AnalyzeInput): Promise<EvaluationResult>;
export declare const AIService: {
    getBestMove: typeof getBestMove;
    evaluatePosition: typeof evaluatePosition;
    checkQuota: (userId: string) => Promise<"ok" | "limit">;
    getQuotaStatus: (userId: string) => Promise<QuotaInfo>;
    addExtraQuota: (userId: string, amount: number) => Promise<number>;
};
//# sourceMappingURL=aiService.d.ts.map