// src/websocket/tournamentServer.ts
import type { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';

export type TournamentEventType =
  | 'playerJoined'
  | 'matchCreated'
  | 'matchFinished'
  | 'matchStarted'
  | 'tournamentUpdated'
  | 'tournamentEnded'
  | 'participantLeft';

interface JwtPayload {
  userId: string;
}

interface TournamentConnectionContext {
  userId: string;
  tournamentId: string;
}

const connections = new Map<WebSocket, TournamentConnectionContext>();

export const __testUtils = {
  addConnection(socket: WebSocket, context: TournamentConnectionContext) {
    connections.set(socket, context);
  },
  clearConnections() {
    connections.clear();
  }
};

const getAuthHeader = (req: IncomingMessage): string | null => {
  let authHeader = req.headers.authorization ?? null;

  if (!authHeader) {
    const protocolHeader = req.headers['sec-websocket-protocol'];
    if (typeof protocolHeader === 'string') {
      const bearer = protocolHeader
        .split(',')
        .map((value) => value.trim())
        .find((value) => value.startsWith('Bearer '));
      if (bearer) {
        authHeader = bearer;
      }
    }
  }

  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

const verifyUser = (token: string): string | null => {
  if (!config.accessTokenSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret) as JwtPayload;
    return decoded?.userId ?? null;
  } catch (error) {
    return null;
  }
};

export const handleTournamentConnection = async (socket: WebSocket, req: IncomingMessage, url: URL) => {
  const tournamentId = url.searchParams.get('tournamentId');

  if (!tournamentId) {
    socket.close(1008, 'Missing tournament identifier');
    return;
  }

  const token = getAuthHeader(req);
  if (!token) {
    socket.close(1008, 'Unauthorized');
    return;
  }

  const userId = verifyUser(token);
  if (!userId) {
    socket.close(1008, 'Unauthorized');
    return;
  }

  const participant = await prisma.tournament_participants.findUnique({
    where: {
      tournament_id_user_id: {
        tournament_id: tournamentId,
        user_id: userId
      }
    }
  });

  if (!participant) {
    socket.close(1008, 'Unauthorized');
    return;
  }

  const context: TournamentConnectionContext = { userId, tournamentId };
  connections.set(socket, context);

  socket.on('message', (raw) => {
    try {
      // Currently, no client-originated messages are processed. Validate JSON to avoid malformed payloads.
      const payload = JSON.parse(raw.toString());
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload');
      }
    } catch (error) {
      socket.send(
        JSON.stringify({
          success: false,
          error: 'Invalid message format'
        })
      );
    }
  });

  socket.on('close', () => {
    connections.delete(socket);
  });
};

export const broadcastTournamentEvent = (
  tournamentId: string,
  type: TournamentEventType,
  payload: Record<string, unknown>
) => {
  for (const [socket, context] of connections.entries()) {
    if (context.tournamentId !== tournamentId) {
      continue;
    }

    try {
      socket.send(
        JSON.stringify({
          type,
          payload,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      socket.close(1011, 'Broadcast failure');
      connections.delete(socket);
    }
  }
};
