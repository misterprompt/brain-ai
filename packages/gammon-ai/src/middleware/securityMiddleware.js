"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.generalLimiter = exports.corsOptions = exports.cors = exports.helmet = exports.validateInput = void 0;
// src/middleware/securityMiddleware.ts
const helmet_1 = __importDefault(require("helmet"));
exports.helmet = helmet_1.default;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cors_1 = __importDefault(require("cors"));
exports.cors = cors_1.default;
// Configuration CORS
const ALLOWED_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const resolveCorsOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN;
        return frontendUrl ? [frontendUrl] : [];
    }
    const base = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    return [base, ...ALLOWED_DEV_ORIGINS];
};
const corsOptions = {
    origin: resolveCorsOrigins(),
    credentials: true, // Permettre les cookies/headers d'auth
    optionsSuccessStatus: 200
};
exports.corsOptions = corsOptions;
// Rate limiting général
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite chaque IP à 100 requêtes par windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
});
exports.generalLimiter = generalLimiter;
// Rate limiting strict pour l'authentification
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limite à 5 tentatives de connexion par IP
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.'
    },
    skipSuccessfulRequests: true, // Ne pas compter les connexions réussies
});
exports.authLimiter = authLimiter;
// Middleware de validation d'input générique
const validateInput = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        // Validation basique des types
        for (const field of requiredFields) {
            const value = req.body[field];
            if (typeof value !== 'string' || value.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: `Field ${field} must be a non-empty string`
                });
            }
        }
        next();
    };
};
exports.validateInput = validateInput;
//# sourceMappingURL=securityMiddleware.js.map