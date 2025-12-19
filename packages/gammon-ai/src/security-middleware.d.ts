import { Request, Response, NextFunction } from 'express';
export declare const rateLimits: {
    auth: import("express-rate-limit").RateLimitRequestHandler;
    game: import("express-rate-limit").RateLimitRequestHandler;
    read: import("express-rate-limit").RateLimitRequestHandler;
    images: import("express-rate-limit").RateLimitRequestHandler;
    health: import("express-rate-limit").RateLimitRequestHandler;
};
export declare const speedLimit: ((req: Request, _res: Response, next: NextFunction) => void) & {
    resetKey: () => void;
    store: undefined;
};
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestSizeLimits: {
    json: string;
    urlencoded: string;
    text: string;
};
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const compressionConfig: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const requestTimeout: (timeoutMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeError: (error: any, req: Request, res: Response, _next: NextFunction) => void;
export declare const auditLog: (req: any, res: Response, next: NextFunction) => void;
export declare const validationRules: {
    userId: import("express-validator").ValidationChain;
    gameId: import("express-validator").ValidationChain;
    register: import("express-validator").ValidationChain[];
    login: import("express-validator").ValidationChain[];
    gameMove: import("express-validator").ValidationChain[];
};
//# sourceMappingURL=security-middleware.d.ts.map