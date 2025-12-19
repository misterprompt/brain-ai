import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware';
export declare const joinMatchmakingQueue: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const leaveMatchmakingQueue: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMatchmakingStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=matchmakingController.d.ts.map