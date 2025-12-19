// src/routes/gnubgDebug.ts
import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { GNUBGRunnerDebug } from '../services/gnubgRunnerDebug';

const router = express.Router();

// Toutes les routes debug nécessitent une authentification
router.use(authMiddleware as unknown as express.RequestHandler);

// Route de debug pour tester GNUBG
router.post('/test', (async (req: AuthRequest, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const result = await GNUBGRunnerDebug.testRawOutput();

    res.json({
      success: true,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        message: 'Raw GNUBG output captured'
      }
    });
  } catch (error) {
    console.error('GNUBG debug error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test GNUBG'
    });
  }
}) as unknown as express.RequestHandler);

export default router;
