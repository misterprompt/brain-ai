import type { Request } from 'express';
import type { GameState } from '../types/game';
import type { AuthRequest } from '../middleware/authMiddleware';
export declare function ensurePlayerInGame(req: Request | AuthRequest, game: GameState): boolean;
//# sourceMappingURL=auth.d.ts.map