import express from 'express';
import {
  getLeaderboardGlobal,
  getLeaderboardCountry,
  getLeaderboardSeason
} from '../controllers/leaderboardController';

const router = express.Router();

router.get('/global', getLeaderboardGlobal);
router.get('/country/:countryCode', getLeaderboardCountry);
router.get('/season/:seasonId', getLeaderboardSeason);

export default router;
