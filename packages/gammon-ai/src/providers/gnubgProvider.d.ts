import { z } from 'zod';
import type { EvaluationResult, SuggestedMove } from '../types/ai';
import type { Move } from '../types/game';
import type { AIProvider, AnalyzeInput } from '../services/aiService';
import { Logger } from '../utils/logger';
declare const analyzeGameResponseSchema: z.ZodObject<{
    totalError: z.ZodNumber;
    errorRate: z.ZodNumber;
    criticalMoves: z.ZodNumber;
    avgErrorPerMove: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    totalError: number;
    errorRate: number;
    criticalMoves: number;
    avgErrorPerMove?: number | undefined;
}, {
    totalError: number;
    errorRate: number;
    criticalMoves: number;
    avgErrorPerMove?: number | undefined;
}>;
type AnalyzeGameResponse = z.infer<typeof analyzeGameResponseSchema>;
type SleepFn = (ms: number) => Promise<void>;
export interface GNUBGProviderOptions {
    baseUrl?: string;
    timeoutMs?: number;
    maxRetries?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerCooldownMs?: number;
    fetchImpl?: typeof fetch;
    sleepFn?: SleepFn;
    logger?: Logger;
}
export declare class GNUBGProvider implements AIProvider {
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly circuitThreshold;
    private readonly circuitCooldownMs;
    private readonly fetchImpl;
    private readonly sleep;
    private readonly logger;
    private failureCount;
    private circuitOpenUntil;
    constructor(options?: GNUBGProviderOptions);
    private readonly cache;
    private readonly CACHE_SIZE;
    private readonly CACHE_TTL;
    private getCacheKey;
    private getFromCache;
    private setCache;
    getBestMove(input: AnalyzeInput): Promise<SuggestedMove>;
    evaluatePosition(input: AnalyzeInput): Promise<EvaluationResult>;
    analyzeGame(moves: Move[]): Promise<AnalyzeGameResponse>;
    get isCircuitOpen(): boolean;
    private buildAnalyzePayload;
    private ensureCircuitClosed;
    private handleFailure;
    private handleSuccess;
    private computeBackoff;
    private executeRequest;
}
export {};
//# sourceMappingURL=gnubgProvider.d.ts.map