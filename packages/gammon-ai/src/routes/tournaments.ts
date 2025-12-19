import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createTournament,
  joinTournament,
  leaveTournament,
  getTournament,
  getTournamentParticipants,
  getTournamentLeaderboard,
  startTournament,
  reportTournamentMatch,
  getTournamentStandings,
  getTournamentBracket,
  getTournamentOverview
} from '../controllers/tournamentController';

const router = express.Router();

router.use(authMiddleware as unknown as express.RequestHandler);

router.post('/', createTournament as unknown as express.RequestHandler);
router.post('/:id/join', joinTournament as unknown as express.RequestHandler);
router.post('/:id/leave', leaveTournament as unknown as express.RequestHandler);
router.get('/:id', getTournament as unknown as express.RequestHandler);
router.get('/:id/participants', getTournamentParticipants as unknown as express.RequestHandler);
router.get('/:id/leaderboard', getTournamentLeaderboard as unknown as express.RequestHandler);
router.get('/:id/standings', getTournamentStandings as unknown as express.RequestHandler);
router.get('/:id/bracket', getTournamentBracket as unknown as express.RequestHandler);
router.get('/:id/overview', getTournamentOverview as unknown as express.RequestHandler);
router.post('/:id/start', startTournament as unknown as express.RequestHandler);
router.post('/:id/matches/:matchId/report', reportTournamentMatch as unknown as express.RequestHandler);

export default router;
