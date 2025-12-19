"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInstallation = exports.analyzeGame = exports.evaluatePosition = exports.purchaseAnalyses = exports.getQuotaStatus = exports.getHint = void 0;
const aiService_1 = require("../services/aiService");
const gnubgService_1 = require("../services/gnubgService");
const gnubgRunner_1 = require("../services/gnubgRunner");
// Obtenir une suggestion de mouvement
const getHint = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { board, dice, move, gameId } = req.body;
        // Validation
        if (!board || !dice) {
            return res.status(400).json({
                success: false,
                error: 'Board and dice are required'
            });
        }
        if (!Array.isArray(dice) || dice.length !== 2) {
            return res.status(400).json({
                success: false,
                error: 'Dice must be an array of 2 values'
            });
        }
        // Obtenir la suggestion de GNUBG
        const hint = await gnubgService_1.gnubgService.getHint({
            board,
            dice,
            move: move ?? null,
            userId: req.user.id,
            gameId: gameId ?? null
        });
        res.json({
            success: true,
            data: hint
        });
    }
    catch (error) {
        if (error instanceof aiService_1.QuotaExceededError) {
            return res.status(429).json({
                success: false,
                error: 'QuotaExceeded'
            });
        }
        console.error('GNUBG hint error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get hint from GNUBG'
        });
    }
};
exports.getHint = getHint;
// Obtenir le statut de quota IA
const getQuotaStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        if (!aiService_1.AIService.getQuotaStatus) {
            return res.status(503).json({
                success: false,
                error: 'Quota service unavailable'
            });
        }
        const quota = await aiService_1.AIService.getQuotaStatus(req.user.id);
        return res.status(200).json({
            success: true,
            data: quota
        });
    }
    catch (error) {
        console.error('Get quota status error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve quota status'
        });
    }
};
exports.getQuotaStatus = getQuotaStatus;
// Acheter des analyses supplémentaires
const purchaseAnalyses = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const rawAmount = req.body?.amount;
        const amount = Number(rawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount provided'
            });
        }
        if (!aiService_1.AIService.addExtraQuota) {
            return res.status(503).json({
                success: false,
                error: 'Quota purchase service unavailable'
            });
        }
        const extraQuota = await aiService_1.AIService.addExtraQuota(req.user.id, amount);
        return res.status(200).json({
            success: true,
            data: { extraQuota }
        });
    }
    catch (error) {
        console.error('Purchase analyses error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to purchase analyses'
        });
    }
};
exports.purchaseAnalyses = purchaseAnalyses;
// Évaluer une position
const evaluatePosition = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { board, dice, gameId } = req.body;
        // Validation
        if (!board) {
            return res.status(400).json({
                success: false,
                error: 'Board is required'
            });
        }
        // Évaluer la position avec GNUBG
        const evaluation = await gnubgService_1.gnubgService.evaluatePosition({
            board,
            dice: dice ?? null,
            userId: req.user.id,
            gameId: gameId ?? null
        });
        res.json({
            success: true,
            data: evaluation
        });
    }
    catch (error) {
        if (error instanceof aiService_1.QuotaExceededError) {
            return res.status(429).json({
                success: false,
                error: 'QuotaExceeded'
            });
        }
        console.error('GNUBG evaluation error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to evaluate position'
        });
    }
};
exports.evaluatePosition = evaluatePosition;
// Analyser une partie complète
const analyzeGame = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { moves } = req.body;
        // Validation
        if (!moves || !Array.isArray(moves)) {
            return res.status(400).json({
                success: false,
                error: 'Moves array is required'
            });
        }
        // Analyser la partie avec GNUBG
        const analysis = await gnubgService_1.gnubgService.analyzeGame({ moves });
        res.json({
            success: true,
            data: analysis
        });
    }
    catch (error) {
        if (error instanceof aiService_1.QuotaExceededError) {
            return res.status(429).json({
                success: false,
                error: 'QuotaExceeded'
            });
        }
        console.error('GNUBG analysis error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze game'
        });
    }
};
exports.analyzeGame = analyzeGame;
// Vérifier l'installation de GNUBG
const checkInstallation = async (req, res) => {
    try {
        const isInstalled = await gnubgRunner_1.GNUBGRunner.checkInstallation();
        res.json({
            success: true,
            data: {
                installed: isInstalled,
                message: isInstalled ? 'GNUBG is properly installed' : 'GNUBG is not installed or not in PATH'
            }
        });
    }
    catch (error) {
        console.error('GNUBG check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check GNUBG installation'
        });
    }
};
exports.checkInstallation = checkInstallation;
//# sourceMappingURL=gnubgController.js.map