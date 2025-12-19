"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const prisma_1 = require("../lib/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
router.use(adminMiddleware_1.requireAdminFed);
router.get('/tournaments', async (req, res, next) => {
    try {
        const tournaments = await prisma_1.prisma.tournaments.findMany({
            include: {
                _count: {
                    select: { participants: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tournaments);
    }
    catch (error) {
        next(error);
    }
});
router.post('/invite', async (req, res, next) => {
    try {
        // Generate an invite link for a new admin_fed or tournament organizer
        const { email, role } = req.body;
        const token = jsonwebtoken_1.default.sign({ email, role: role || 'ADMIN_FED', type: 'invite' }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
        const inviteLink = `${config_1.config.cors.origins[0]}/register?invite=${token}`;
        res.json({ inviteLink, token });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map