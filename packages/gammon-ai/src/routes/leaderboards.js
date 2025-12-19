"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaderboardController_1 = require("../controllers/leaderboardController");
const router = express_1.default.Router();
router.get('/global', leaderboardController_1.getLeaderboardGlobal);
router.get('/country/:countryCode', leaderboardController_1.getLeaderboardCountry);
router.get('/season/:seasonId', leaderboardController_1.getLeaderboardSeason);
exports.default = router;
//# sourceMappingURL=leaderboards.js.map