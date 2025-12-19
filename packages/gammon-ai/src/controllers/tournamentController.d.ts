import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
export declare const createTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const leaveTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const joinTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentParticipants: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentLeaderboard: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const startTournament: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reportTournamentMatch: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentStandings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentBracket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentOverview: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=tournamentController.d.ts.map