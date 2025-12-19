export declare const CACHE_TTL: {
    readonly user: 300;
    readonly game: 60;
    readonly analysis: 600;
    readonly leaderboard: 300;
    readonly stats: 180;
    readonly image: 3600;
};
export declare const CACHE_KEYS: {
    user: (userId: string) => string;
    game: (gameId: string) => string;
    analysis: (gameId: string, userId: string) => string;
    leaderboard: (type: string) => string;
    stats: (userId: string) => string;
    image: (type: string, params: unknown) => string;
};
export declare const performanceMetrics: {
    generationTime: number;
    fileSize: number;
    canvasSize: number;
    region: string;
    hitRate: number;
};
export declare class CacheService {
    private memoryCache;
    private regionCache;
    constructor();
    get<T>(key: string, region?: string): Promise<T | null>;
    set(key: string, data: unknown, ttl?: number, region?: string): Promise<void>;
    generateKey(endpoint: string, params?: Record<string, unknown>, region?: string): string;
    private hashString;
    stats(): Promise<{
        type: string;
        keys: number;
        connected: boolean;
        regions: string[];
        performance: {
            hitRate: number;
            avgResponseTime: string;
            memoryUsage: string;
        };
        info: string[];
    } | {
        type: string;
        keys: number;
        regions: string[];
        connected: boolean;
        performance: {
            hitRate: number;
            avgResponseTime: string;
            memoryUsage: string;
        };
        info?: never;
    } | {
        type: string;
        connected: boolean;
        keys?: never;
        regions?: never;
        performance?: never;
        info?: never;
    }>;
    optimizeForRegion(region: string): Promise<number>;
    clearRegion(region: string): Promise<void>;
    del(key: string): Promise<void>;
    clear(): Promise<void>;
}
export declare const cacheService: CacheService;
//# sourceMappingURL=cache-service.d.ts.map