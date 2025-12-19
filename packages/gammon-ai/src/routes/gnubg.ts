// src/routes/gnubg.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  getHint,
  evaluatePosition,
  analyzeGame,
  checkInstallation,
  purchaseAnalyses,
  getQuotaStatus
} from '../controllers/gnubgController';

const router = express.Router();

// Toutes les routes GNUBG nécessitent une authentification et sont limitées côté serveur
router.use(authMiddleware as unknown as express.RequestHandler);
router.use(createRateLimiter('gnubg') as unknown as express.RequestHandler);

// POST /api/gnubg/hint - Obtenir une suggestion de mouvement
router.post('/hint', getHint as unknown as express.RequestHandler);

// POST /api/gnubg/evaluate - Évaluer une position
router.post('/evaluate', evaluatePosition as unknown as express.RequestHandler);

// POST /api/gnubg/analyze - Analyser une partie complète
router.post('/analyze', analyzeGame as unknown as express.RequestHandler);

// POST /api/gnubg/purchase - Acheter des analyses supplémentaires
router.post('/purchase', purchaseAnalyses as unknown as express.RequestHandler);

// GET /api/gnubg/quota - Obtenir le statut de quota IA
router.get('/quota', getQuotaStatus as unknown as express.RequestHandler);

// GET /api/gnubg/check - Vérifier l'installation de GNUBG
router.get('/check', checkInstallation as unknown as express.RequestHandler);

export default router;