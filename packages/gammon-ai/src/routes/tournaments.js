"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const tournamentController_1 = require("../controllers/tournamentController");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
router.post('/', tournamentController_1.createTournament);
router.post('/:id/join', tournamentController_1.joinTournament);
router.post('/:id/leave', tournamentController_1.leaveTournament);
router.get('/:id', tournamentController_1.getTournament);
router.get('/:id/participants', tournamentController_1.getTournamentParticipants);
router.get('/:id/leaderboard', tournamentController_1.getTournamentLeaderboard);
router.get('/:id/standings', tournamentController_1.getTournamentStandings);
router.get('/:id/bracket', tournamentController_1.getTournamentBracket);
router.get('/:id/overview', tournamentController_1.getTournamentOverview);
router.post('/:id/start', tournamentController_1.startTournament);
router.post('/:id/matches/:matchId/report', tournamentController_1.reportTournamentMatch);
exports.default = router;
//# sourceMappingURL=tournaments.js.map