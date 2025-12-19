"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.logout = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('AuthController');
const ACCESS_EXPIRES_IN = config_1.config.accessTokenTtlSeconds;
const REFRESH_EXPIRES_IN = config_1.config.refreshTokenTtlSeconds;
const ACCESS_SECRET = config_1.config.accessTokenSecret;
const REFRESH_SECRET = config_1.config.refreshTokenSecret;
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Name is required'),
    email: zod_1.z.string().trim().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long')
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'refreshToken is required')
});
const hashToken = (token) => (0, crypto_1.createHash)('sha256').update(token).digest('hex');
const issueAccessToken = (payload) => jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
const issueRefreshToken = (payload) => jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
const userSessionDelegate = () => prisma_1.prisma.userSession;
const persistSession = async (userId, refreshToken, jti, expiresAt) => {
    const tokenHash = hashToken(refreshToken);
    await userSessionDelegate().create({
        data: {
            userId,
            jti,
            tokenHash,
            expiresAt
        }
    });
    await userSessionDelegate().deleteMany({
        where: {
            userId,
            NOT: { jti }
        }
    });
};
const revokeSessions = async (filter) => {
    try {
        await userSessionDelegate().deleteMany({ where: filter });
    }
    catch (error) {
        logger.warn('Failed to revoke session', { filter, error });
    }
};
const buildAuthResponse = async (user) => {
    const payload = { userId: user.id, email: user.email };
    const accessToken = issueAccessToken(payload);
    const jti = (0, crypto_1.randomUUID)();
    const refreshToken = issueRefreshToken({ ...payload, jti });
    const refreshPayload = jsonwebtoken_1.default.decode(refreshToken);
    const expiresAt = refreshPayload?.exp ? new Date(refreshPayload.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await persistSession(user.id, refreshToken, jti, expiresAt);
    return {
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            name: user.username,
            email: user.email
        }
    };
};
// Inscription
const register = async (req, res) => {
    try {
        const { name, email, password } = registerSchema.parse(req.body);
        // Vérifier si l'utilisateur existe
        const existingPlayer = await prisma_1.prisma.users.findUnique({
            where: { email }
        });
        if (existingPlayer) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        // Hasher le mot de passe
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Créer l'utilisateur
        const player = await prisma_1.prisma.users.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                username: name,
                email,
                password: hashedPassword
            }
        });
        res.status(201).json({
            success: true,
            data: await buildAuthResponse(player)
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: error.issues.map(issue => issue.message).join(', ')
            });
        }
        logger.error('Registration failed', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
};
exports.register = register;
// Connexion
const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        // Trouver l'utilisateur
        const player = await prisma_1.prisma.users.findUnique({
            where: { email }
        });
        if (!player || !player.password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Vérifier le mot de passe
        const isValidPassword = await bcryptjs_1.default.compare(password, player.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        res.json({
            success: true,
            data: await buildAuthResponse(player)
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: error.issues.map(issue => issue.message).join(', ')
            });
        }
        logger.error('Login failed', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
};
exports.login = login;
// Logout (côté client - suppression du token)
const logout = async (req, res) => {
    try {
        const { refreshToken } = refreshSchema.parse(req.body ?? {});
        const decoded = jsonwebtoken_1.default.verify(refreshToken, REFRESH_SECRET);
        if (decoded?.userId && decoded.jti && typeof decoded.userId === 'string' && typeof decoded.jti === 'string') {
            await revokeSessions({ userId: decoded.userId, jti: decoded.jti });
        }
    }
    catch (error) {
        logger.warn('Logout payload invalid or session not found', error);
    }
    res.status(204).send();
};
exports.logout = logout;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = refreshSchema.parse(req.body);
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, REFRESH_SECRET);
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }
        if (!decoded?.userId || !decoded.jti || typeof decoded.userId !== 'string' || typeof decoded.jti !== 'string') {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token payload'
            });
        }
        const session = await userSessionDelegate().findFirst({
            where: {
                userId: decoded.userId,
                jti: decoded.jti
            }
        });
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token revoked'
            });
        }
        const providedHash = hashToken(refreshToken);
        const isValid = session.tokenHash === providedHash;
        if (!isValid || session.expiresAt < new Date()) {
            await revokeSessions({ userId: decoded.userId, jti: decoded.jti });
            return res.status(401).json({
                success: false,
                error: 'Refresh token expired or invalid'
            });
        }
        const user = await prisma_1.prisma.users.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true
            }
        });
        if (!user) {
            await revokeSessions({ userId: decoded.userId, jti: decoded.jti });
            return res.status(401).json({
                success: false,
                error: 'User no longer exists'
            });
        }
        await revokeSessions({ userId: decoded.userId, jti: decoded.jti });
        const payload = { userId: user.id, email: user.email };
        const accessToken = issueAccessToken(payload);
        const newJti = (0, crypto_1.randomUUID)();
        const newRefreshToken = issueRefreshToken({ ...payload, jti: newJti });
        const refreshPayload = jsonwebtoken_1.default.decode(newRefreshToken);
        const expiresAt = refreshPayload?.exp ? new Date(refreshPayload.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await persistSession(user.id, newRefreshToken, newJti, expiresAt);
        res.json({
            success: true,
            data: {
                token: accessToken,
                accessToken,
                refreshToken: newRefreshToken
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: error.issues.map(issue => issue.message).join(', ')
            });
        }
        logger.error('Refresh token flow failed', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
};
exports.refreshToken = refreshToken;
//# sourceMappingURL=authController.js.map