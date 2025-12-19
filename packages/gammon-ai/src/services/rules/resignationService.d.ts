import type { games } from '@prisma/client';
import { type MatchRecord, type MatchRulesOptions, type MatchUpdateResult } from './matchEngine';
export type ResignationType = 'SINGLE' | 'GAMMON' | 'BACKGAMMON';
export interface ResignationContext {
    game: games;
    match: MatchRecord | null;
    rules: MatchRulesOptions;
    resigningPlayer: 'white' | 'black';
    resignationType: ResignationType;
}
export interface ResignationResult extends MatchUpdateResult {
    winner: 'white' | 'black';
    resignationType: ResignationType;
    pointsAwarded: number;
}
export declare function resolveResignation(context: ResignationContext): ResignationResult;
//# sourceMappingURL=resignationService.d.ts.map