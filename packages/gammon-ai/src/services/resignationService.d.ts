import type { ResignGameRequest, ResignGameResult } from '../types/game';
import type { MatchRecord } from './rules/matchEngine';
interface ResignationOutcome extends ResignGameResult {
    whiteScore: number;
    blackScore: number;
    matchState: MatchRecord['state'] | null;
    crawfordUsed: boolean | null;
}
export declare function processResignation(request: ResignGameRequest): Promise<ResignationOutcome>;
export {};
//# sourceMappingURL=resignationService.d.ts.map