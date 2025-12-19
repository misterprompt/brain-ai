"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/user.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const userController_1 = require("../controllers/userController");
const userDashboardController_1 = require("../controllers/userDashboardController");
const router = express_1.default.Router();
// Toutes les routes utilisateur nécessitent une authentification
router.use(authMiddleware_1.authMiddleware);
// GET /api/user/profile - Obtenir son profil
router.get('/profile', userController_1.getProfile);
// PUT /api/user/profile - Mettre à jour son profil
router.put('/profile', userController_1.updateProfile);
// GET /api/user/dashboard - Tableau de bord complet
router.get('/dashboard', userDashboardController_1.getDashboard);
exports.default = router;
//# sourceMappingURL=user.js.map