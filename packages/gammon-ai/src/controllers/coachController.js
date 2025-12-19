"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoachAdvice = void 0;
const coachService_1 = require("../services/coachService");
const getCoachAdvice = async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const userId = req.user.id;
        const language = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';
        const advice = await coachService_1.CoachService.getCoachAdvice(gameId, userId, language);
        res.json(advice);
    }
    catch (error) {
        next(error);
    }
};
exports.getCoachAdvice = getCoachAdvice;
//# sourceMappingURL=coachController.js.map