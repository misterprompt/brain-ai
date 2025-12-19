import type { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
export type TournamentEventType = 'playerJoined' | 'matchCreated' | 'matchFinished' | 'matchStarted' | 'tournamentUpdated' | 'tournamentEnded';
interface TournamentConnectionContext {
    userId: string;
    tournamentId: string;
}
export declare const __testUtils: {
    addConnection(socket: WebSocket, context: TournamentConnectionContext): void;
    clearConnections(): void;
};
export declare const handleTournamentConnection: (socket: WebSocket, req: IncomingMessage, url: URL) => Promise<void>;
export declare const broadcastTournamentEvent: (tournamentId: string, type: TournamentEventType, payload: Record<string, unknown>) => void;
export {};
//# sourceMappingURL=tournamentServer.d.ts.map