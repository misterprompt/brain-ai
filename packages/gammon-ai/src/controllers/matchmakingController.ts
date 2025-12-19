import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware';
import { MatchmakingService } from '../services/matchmakingService.js';

export const joinMatchmakingQueue = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const preferences = (req.body ?? {}) as Record<string, unknown>;
    await MatchmakingService.joinQueue(req.user.id, preferences);
    const status = MatchmakingService.getStatus(req.user.id);

    return res.status(200).json({ success: true, data: status });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const leaveMatchmakingQueue = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await MatchmakingService.leaveQueue(req.user.id);
    const status = MatchmakingService.getStatus(req.user.id);

    return res.status(200).json({ success: true, data: status });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getMatchmakingStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const status = MatchmakingService.getStatus(req.user.id);
    return res.json({ success: true, data: status });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
};
