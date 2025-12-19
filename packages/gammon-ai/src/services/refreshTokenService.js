"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenService = void 0;
// src/services/refreshTokenService.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
/** Minimal refresh‑token service without DB persistence. */
class RefreshTokenService {
    /** Create a JWT refresh token for a user. */
    static async createRefreshToken(userId) {
        const secret = process.env.REFRESH_TOKEN_SECRET || 'default_refresh_secret';
        return jsonwebtoken_1.default.sign({ sub: userId }, secret, { expiresIn: '30d' });
    }
    /** Verify a refresh token and return the userId. */
    static async verifyRefreshToken(token) {
        const secret = process.env.REFRESH_TOKEN_SECRET || 'default_refresh_secret';
        try {
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            return decoded.sub;
        }
        catch {
            throw new errors_1.AppError('Invalid refresh token', 401);
        }
    }
    /** Revoke a token – placeholder (no persistence). */
    static async revokeToken(_token) {
        // No‑op for now.
        return;
    }
}
exports.RefreshTokenService = RefreshTokenService;
//# sourceMappingURL=refreshTokenService.js.map