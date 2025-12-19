import { type RateLimitRequestHandler } from 'express-rate-limit';
type RateLimiterScope = 'auth' | 'gnubg';
export declare const createRateLimiter: (scope: RateLimiterScope) => RateLimitRequestHandler;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map