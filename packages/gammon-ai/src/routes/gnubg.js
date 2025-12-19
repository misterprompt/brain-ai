"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/gnubg.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const gnubgController_1 = require("../controllers/gnubgController");
const router = express_1.default.Router();
// Toutes les routes GNUBG nécessitent une authentification et sont limitées côté serveur
router.use(authMiddleware_1.authMiddleware);
router.use((0, rateLimiter_1.createRateLimiter)('gnubg'));
// POST /api/gnubg/hint - Obtenir une suggestion de mouvement
router.post('/hint', gnubgController_1.getHint);
// POST /api/gnubg/evaluate - Évaluer une position
router.post('/evaluate', gnubgController_1.evaluatePosition);
// POST /api/gnubg/analyze - Analyser une partie complète
router.post('/analyze', gnubgController_1.analyzeGame);
// POST /api/gnubg/purchase - Acheter des analyses supplémentaires
router.post('/purchase', gnubgController_1.purchaseAnalyses);
// GET /api/gnubg/quota - Obtenir le statut de quota IA
router.get('/quota', gnubgController_1.getQuotaStatus);
// GET /api/gnubg/check - Vérifier l'installation de GNUBG
router.get('/check', gnubgController_1.checkInstallation);
exports.default = router;
//# sourceMappingURL=gnubg.js.map