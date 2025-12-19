"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/games.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const gameController_1 = require("../controllers/gameController");
const matchmakingController_1 = require("../controllers/matchmakingController");
const coachController_1 = require("../controllers/coachController");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
router.get('/available', gameController_1.listAvailableGames); // Must be before /:gameId routes
router.post('/', gameController_1.createGameController);
router.post('/:gameId/join', gameController_1.joinGame);
router.post('/:gameId/roll', gameController_1.rollDice);
router.post('/:gameId/move', gameController_1.makeMove);
router.post('/:gameId/double', gameController_1.offerDouble);
router.post('/:gameId/double/respond', gameController_1.respondToDouble);
router.post('/:gameId/resign', gameController_1.resignGame);
router.post('/:gameId/draw', gameController_1.offerDraw);
router.post('/:gameId/suggestions', gameController_1.getSuggestions);
router.post('/:gameId/evaluate', gameController_1.evaluatePosition);
router.post('/:gameId/coach', coachController_1.getCoachAdvice);
router.post('/matchmaking/join', matchmakingController_1.joinMatchmakingQueue);
router.post('/matchmaking/leave', matchmakingController_1.leaveMatchmakingQueue);
router.get('/matchmaking/status', matchmakingController_1.getMatchmakingStatus);
router.get('/:gameId/status', gameController_1.getGameStatus);
exports.default = router;
//# sourceMappingURL=games.js.map