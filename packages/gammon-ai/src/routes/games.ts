// src/routes/games.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createGameController,
  getGameStatus,
  joinGame,
  rollDice,
  makeMove,
  resignGame,
  offerDraw,
  getSuggestions,
  evaluatePosition,
  listAvailableGames,
  offerDouble,
  respondToDouble
} from '../controllers/gameController';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  getMatchmakingStatus
} from '../controllers/matchmakingController';

import { CoachController } from '../controllers/coachController';

const router = express.Router();

router.use(authMiddleware as unknown as express.RequestHandler);

router.get('/available', listAvailableGames as unknown as express.RequestHandler); // Must be before /:gameId routes
router.post('/', createGameController as unknown as express.RequestHandler);

router.post('/:gameId/join', joinGame as unknown as express.RequestHandler);
router.post('/:gameId/roll', rollDice as unknown as express.RequestHandler);
router.post('/:gameId/move', makeMove as unknown as express.RequestHandler);
router.post('/:gameId/double', offerDouble as unknown as express.RequestHandler);
router.post('/:gameId/double/respond', respondToDouble as unknown as express.RequestHandler);
router.post('/:gameId/resign', resignGame as unknown as express.RequestHandler);
router.post('/:gameId/draw', offerDraw as unknown as express.RequestHandler);
router.post('/:gameId/suggestions', getSuggestions as unknown as express.RequestHandler);
router.post('/:gameId/evaluate', evaluatePosition as unknown as express.RequestHandler);
router.post('/:gameId/coach', CoachController.getCoachAdvice as unknown as express.RequestHandler);
router.post('/matchmaking/join', joinMatchmakingQueue as unknown as express.RequestHandler);
router.post('/matchmaking/leave', leaveMatchmakingQueue as unknown as express.RequestHandler);
router.get('/matchmaking/status', getMatchmakingStatus as unknown as express.RequestHandler);
router.get('/:gameId/status', getGameStatus as unknown as express.RequestHandler);

export default router;
