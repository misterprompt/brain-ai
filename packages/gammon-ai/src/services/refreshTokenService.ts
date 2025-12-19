// src/services/refreshTokenService.ts
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

/** Minimal refresh‑token service without DB persistence. */
export class RefreshTokenService {
    /** Create a JWT refresh token for a user. */
    static async createRefreshToken(userId: string): Promise<string> {
        const secret = process.env.REFRESH_TOKEN_SECRET || 'default_refresh_secret';
        return jwt.sign({ sub: userId }, secret, { expiresIn: '30d' });
    }

    /** Verify a refresh token and return the userId. */
    static async verifyRefreshToken(token: string): Promise<string> {
        const secret = process.env.REFRESH_TOKEN_SECRET || 'default_refresh_secret';
        try {
            const decoded = jwt.verify(token, secret) as { sub: string };
            return decoded.sub;
        } catch {
            throw new AppError('Invalid refresh token', 401);
        }
    }

    /** Revoke a token – placeholder (no persistence). */
    static async revokeToken(_token: string): Promise<void> {
        // No‑op for now.
        return;
    }
}
