"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const userDashboardService_1 = require("../services/userDashboardService");
const getDashboard = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const dashboard = await (0, userDashboardService_1.getUserDashboard)(req.user.id);
        return res.json({ success: true, data: dashboard });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load dashboard';
        const status = message === 'User not found' ? 404 : 500;
        return res.status(status).json({ success: false, error: message });
    }
};
exports.getDashboard = getDashboard;
//# sourceMappingURL=userDashboardController.js.map