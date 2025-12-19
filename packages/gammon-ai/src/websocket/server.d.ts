import { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { type LeaderboardUpdatePayload } from '../services/socketService';
import type { NotificationEnvelope } from '../types/notifications';
declare function resetSessionState(): void;
declare function attachHeartbeat(socket: WebSocket): void;
export declare function sendNotification(userId: string, notification: NotificationEnvelope): void;
export declare function broadcastLeaderboardUpdate(channel: string, payload: LeaderboardUpdatePayload): void;
export declare function initWebSocketServer(server: import('http').Server): import("ws").Server<typeof import("ws"), typeof IncomingMessage>;
export default initWebSocketServer;
export declare const __testing: {
    attachHeartbeat: typeof attachHeartbeat;
    HEARTBEAT_INTERVAL_MS: number;
    resetSessionState: typeof resetSessionState;
};
//# sourceMappingURL=server.d.ts.map