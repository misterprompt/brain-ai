import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
export declare const getHint: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getQuotaStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const purchaseAnalyses: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const evaluatePosition: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const analyzeGame: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkInstallation: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=gnubgController.d.ts.map