"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchmakingStatus = exports.leaveMatchmakingQueue = exports.joinMatchmakingQueue = void 0;
const matchmakingService_js_1 = require("../services/matchmakingService.js");
const joinMatchmakingQueue = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const preferences = (req.body ?? {});
        await matchmakingService_js_1.MatchmakingService.joinQueue(req.user.id, preferences);
        const status = matchmakingService_js_1.MatchmakingService.getStatus(req.user.id);
        return res.status(200).json({ success: true, data: status });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
exports.joinMatchmakingQueue = joinMatchmakingQueue;
const leaveMatchmakingQueue = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        await matchmakingService_js_1.MatchmakingService.leaveQueue(req.user.id);
        const status = matchmakingService_js_1.MatchmakingService.getStatus(req.user.id);
        return res.status(200).json({ success: true, data: status });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
exports.leaveMatchmakingQueue = leaveMatchmakingQueue;
const getMatchmakingStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const status = matchmakingService_js_1.MatchmakingService.getStatus(req.user.id);
        return res.json({ success: true, data: status });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMatchmakingStatus = getMatchmakingStatus;
//# sourceMappingURL=matchmakingController.js.map