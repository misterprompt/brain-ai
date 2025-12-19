/** Minimal refresh‑token service without DB persistence. */
export declare class RefreshTokenService {
    /** Create a JWT refresh token for a user. */
    static createRefreshToken(userId: string): Promise<string>;
    /** Verify a refresh token and return the userId. */
    static verifyRefreshToken(token: string): Promise<string>;
    /** Revoke a token – placeholder (no persistence). */
    static revokeToken(_token: string): Promise<void>;
}
//# sourceMappingURL=refreshTokenService.d.ts.map