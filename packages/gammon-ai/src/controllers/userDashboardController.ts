import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware';
import { getUserDashboard } from '../services/userDashboardService';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const dashboard = await getUserDashboard(req.user.id);
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    const status = message === 'User not found' ? 404 : 500;
    return res.status(status).json({ success: false, error: message });
  }
};
