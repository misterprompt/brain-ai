export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly apiPrefix: "/api";
    readonly corsOrigin: string;
    readonly accessTokenSecret: string;
    readonly refreshTokenSecret: string;
    readonly accessTokenTtlSeconds: number;
    readonly refreshTokenTtlSeconds: number;
    readonly jwtSecret: string;
    readonly databaseUrl: string;
    readonly cors: {
        readonly origins: string[];
        readonly allowCredentials: true;
        readonly allowHeaders: string;
        readonly allowMethods: string;
        readonly exposedHeaders: string;
        readonly maxAge: number;
    };
    readonly rateLimit: {
        readonly enabled: boolean;
        readonly bypassUserIds: string[];
        readonly defaultMessage: string;
        readonly auth: {
            windowMs: number;
            max: number;
            message: string;
        };
        readonly gnubg: {
            windowMs: number;
            max: number;
            message: string;
        };
    };
    readonly elo: {
        readonly kFactor: number;
        readonly baseRating: number;
    };
    readonly timeControl: {
        readonly preset: "NORMAL" | "BLITZ" | "LONG" | "CUSTOM";
        readonly totalTimeMs: number;
        readonly incrementMs: number;
        readonly delayMs: number;
    };
    readonly session: {
        readonly tokenSecret: string;
        readonly ttlSeconds: number;
        readonly replayRetention: number;
        readonly cleanupIntervalMs: number;
        readonly redisReadThroughEnabled: boolean;
        readonly redisNamespace: string;
    };
};
//# sourceMappingURL=index.d.ts.map