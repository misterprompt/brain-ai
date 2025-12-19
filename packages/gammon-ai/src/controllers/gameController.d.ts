import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
export declare const createGameController: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getGameDetails: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rollDice: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const makeMove: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getGameStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const listAvailableGames: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const joinGame: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const listUserGames: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAvailableMoves: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPipCount: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resignGame: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const offerDraw: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSuggestions: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const evaluatePosition: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const offerDouble: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const respondToDouble: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=gameController.d.ts.map