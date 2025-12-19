export type DashboardGame = {
    id: string;
    finishedAt: string | null;
    opponent: {
        id: string | null;
        username: string | null;
    } | null;
    role: 'white' | 'black';
    result: 'win' | 'loss' | 'draw' | 'pending';
    score: {
        user: number | null;
        opponent: number | null;
    };
};
export type DashboardQuota = {
    plan: 'free' | 'premium';
    used: number;
    limit: number;
    extra: number;
    history: {
        seasonId: string | null;
        quotaUsed: number;
        timestamp: string;
    }[];
};
export type DashboardSeason = {
    seasonId: string;
    name: string;
    rankGlobal: number | null;
    rankCountry: number | null;
    elo: number;
    winrate: number;
    gamesPlayed: number;
};
export type DashboardAnalysis = {
    id: string;
    gameId: string;
    createdAt: string;
    servicesUsed: string[];
};
export type UserDashboard = {
    profile: {
        id: string;
        username: string | null;
        country: string | null;
        eloRating: number;
        gamesPlayed: number;
        gamesWon: number;
        winRate: number;
        currentStreak: number;
        bestStreak: number;
        plan: 'free' | 'premium';
    };
    season: DashboardSeason | null;
    quota: DashboardQuota;
    recentGames: DashboardGame[];
    recentAnalyses: DashboardAnalysis[];
};
export declare function getUserDashboard(userId: string): Promise<UserDashboard>;
//# sourceMappingURL=userDashboardService.d.ts.map