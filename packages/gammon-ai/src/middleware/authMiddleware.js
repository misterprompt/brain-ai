"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
// Middleware d'authentification
const authMiddleware = async (req, res, next) => {
    try {
        if (!config_1.config.accessTokenSecret) {
            res.status(500).json({
                success: false,
                error: 'Authentication service misconfigured.'
            });
            return;
        }
        // Récupérer le token du header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
            return;
        }
        // Extraire le token
        const token = authHeader.substring(7); // Supprimer "Bearer "
        // Vérifier le token
        let decodedToken;
        try {
            decodedToken = jsonwebtoken_1.default.verify(token, config_1.config.accessTokenSecret);
        }
        catch (error) {
            res.status(401).json({
                success: false,
                error: 'Invalid token.'
            });
            return;
        }
        if (typeof decodedToken !== 'object' || !('userId' in decodedToken) || !decodedToken.userId) {
            res.status(401).json({
                success: false,
                error: 'Invalid token payload.'
            });
            return;
        }
        // Récupérer l'utilisateur depuis la base
        const user = await prisma_1.prisma.users.findUnique({
            where: { id: decodedToken.userId },
            select: {
                id: true,
                email: true,
                username: true
            }
        });
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Invalid token. User not found.'
            });
            return;
        }
        // Ajouter l'utilisateur à la requête
        req.user = {
            id: user.id,
            email: user.email,
            username: user.username ?? 'anonymous'
        };
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid token.'
        });
        return;
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=authMiddleware.js.map