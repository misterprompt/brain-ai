import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
declare const corsOptions: {
    origin: string[];
    credentials: boolean;
    optionsSuccessStatus: number;
};
declare const generalLimiter: import("express-rate-limit").RateLimitRequestHandler;
declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const validateInput: (requiredFields: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export { helmet, cors, corsOptions, generalLimiter, authLimiter };
//# sourceMappingURL=securityMiddleware.d.ts.map