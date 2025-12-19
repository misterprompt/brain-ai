import type { LeaderboardScopePayload } from './socketService';
export type LeaderboardSort = 'elo' | 'winrate' | 'games';
export interface PaginationParams {
    page?: number | string;
    perPage?: number | string;
}
export interface LeaderboardQuery extends PaginationParams {
    sort?: LeaderboardSort | string;
}
export interface LeaderboardMeta {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
}
export interface LeaderboardEntry {
    id: string;
    username: string | null;
    country: string | null;
    elo: number;
    winrate: number;
    gamesPlayed: number;
    gamesWon?: number;
    rankGlobal?: number | null;
    rankCountry?: number | null;
}
export declare function deriveLeaderboardChannel(scope: LeaderboardScopePayload): string;
export declare function getGlobalLeaderboard(query: LeaderboardQuery): Promise<{
    data: LeaderboardEntry[];
    meta: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getCountryLeaderboard(countryCode: string, query: LeaderboardQuery): Promise<{
    data: LeaderboardEntry[];
    meta: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getSeasonLeaderboard(seasonId: string, query: LeaderboardQuery): Promise<{
    data: LeaderboardEntry[];
    meta: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
    };
}>;
//# sourceMappingURL=leaderboardService.d.ts.map