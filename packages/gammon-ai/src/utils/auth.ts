import type { Request } from 'express';
import type { GameState } from '../types/game';
import type { AuthRequest } from '../middleware/authMiddleware';

export function ensurePlayerInGame(req: Request | AuthRequest, game: GameState): boolean {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return false;
  }

  const whitePlayerId = (game as unknown as { whitePlayerId?: string | null }).whitePlayerId ?? game.player1?.id;
  const blackPlayerId = (game as unknown as { blackPlayerId?: string | null }).blackPlayerId ?? game.player2?.id ?? null;

  return userId === whitePlayerId || (!!blackPlayerId && userId === blackPlayerId);
}
