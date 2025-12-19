export interface ResumeTokenPayload {
    sid: string;
    gid: string;
    uid: string;
    iat: number;
    exp: number;
}
type SessionRecord = {
    id: string;
    gameId: string;
    userId: string;
    resumeTokenHash: string;
    lastAckSequence: number;
    lastHeartbeatAt: Date | null;
    issuedAt: Date;
    expiresAt: Date | null;
    metadata: Record<string, unknown> | null;
};
type RecordedEvent = {
    id: string;
    gameId: string;
    sequence: number;
    type: string;
    payload: Record<string, unknown>;
    createdAt: Date;
};
export interface ValidatedSession {
    session: SessionRecord;
    payload: ResumeTokenPayload;
    token: string;
}
export interface IssueSessionOptions {
    metadata?: Record<string, unknown>;
    lastAckSequence?: number;
}
export interface RecordEventParams {
    gameId: string;
    type: string;
    payload: Record<string, unknown>;
}
export declare const GameSessionRegistry: {
    issueSession(gameId: string, userId: string, options?: IssueSessionOptions): Promise<{
        token: string;
        session: SessionRecord;
    }>;
    validateToken(token: string): Promise<ValidatedSession | null>;
    acknowledge(sessionId: string, sequence: number): Promise<void>;
    getMinimumAckSequence(gameId: string): Promise<number | null>;
    updateHeartbeat(sessionId: string): Promise<void>;
    revoke(sessionId: string): Promise<void>;
    recordEvent({ gameId, type, payload }: RecordEventParams): Promise<number>;
    fetchEventsSince(gameId: string, afterSequence: number, limit?: number): Promise<RecordedEvent[]>;
    purgeEventsThrough(gameId: string, sequence: number): Promise<number>;
    cleanupExpiredSessions(): Promise<number>;
};
export declare const GameSessionRegistryScheduler: {
    start(intervalMs?: number): NodeJS.Timeout | null;
    stop(): void;
};
export {};
//# sourceMappingURL=gameSessionRegistry.d.ts.map