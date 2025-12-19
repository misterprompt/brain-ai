"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/gnubgDebug.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const gnubgRunnerDebug_1 = require("../services/gnubgRunnerDebug");
const router = express_1.default.Router();
// Toutes les routes debug nécessitent une authentification
router.use(authMiddleware_1.authMiddleware);
// Route de debug pour tester GNUBG
router.post('/test', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const result = await gnubgRunnerDebug_1.GNUBGRunnerDebug.testRawOutput();
        res.json({
            success: true,
            data: {
                stdout: result.stdout,
                stderr: result.stderr,
                message: 'Raw GNUBG output captured'
            }
        });
    }
    catch (error) {
        console.error('GNUBG debug error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to test GNUBG'
        });
    }
});
exports.default = router;
//# sourceMappingURL=gnubgDebug.js.map