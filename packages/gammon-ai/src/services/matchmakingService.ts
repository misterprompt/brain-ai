import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { GameMode, GameStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notificationService } from './notificationService';

export type MatchmakingStatus = {
  searching: boolean;
  preferences: Record<string, unknown> | null;
  joinedAt: number | null;
  gameId: string | null;
};

export type MatchmakingStatusEvent = {
  userId: string;
  status: 'searching' | 'matched' | 'cancelled';
  joinedAt: number | null;
  gameId: string | null;
};

export type MatchmakingMatchFoundEvent = {
  userId: string;
  opponentId: string;
  gameId: string;
};

type QueueEntry = {
  preferences: Record<string, unknown>;
  joinedAt: number;
};

const queue = new Map<string, QueueEntry>();
const lastGameForUser = new Map<string, string>();

const emitter = new EventEmitter();

function emitStatus(event: MatchmakingStatusEvent): void {
  emitter.emit('status', event);
}

function emitMatchFound(event: MatchmakingMatchFoundEvent): void {
  emitter.emit('match-found', event);
}

async function createPendingGame(whitePlayerId: string, blackPlayerId: string): Promise<string> {
  const gameId = randomUUID();

  await prisma.games.create({
    data: {
      id: gameId,
      whitePlayerId,
      blackPlayerId,
      gameMode: 'PLAYER_VS_PLAYER' as GameMode,
      status: 'WAITING' as GameStatus
    }
  });

  return gameId;
}

async function tryMatch(userId: string): Promise<void> {
  const candidate = queue.get(userId);
  if (!candidate) {
    return;
  }

  for (const [otherUserId] of queue.entries()) {
    if (otherUserId === userId) {
      continue;
    }

    queue.delete(userId);
    queue.delete(otherUserId);

    const gameId = await createPendingGame(userId, otherUserId);

    lastGameForUser.set(userId, gameId);
    lastGameForUser.set(otherUserId, gameId);

    emitStatus({ userId, status: 'matched', joinedAt: null, gameId });
    emitStatus({ userId: otherUserId, status: 'matched', joinedAt: null, gameId });

    emitMatchFound({ userId, opponentId: otherUserId, gameId });
    emitMatchFound({ userId: otherUserId, opponentId: userId, gameId });

    notificationService.notifyInvitation(userId, {
      source: 'match',
      contextId: gameId,
      inviterId: otherUserId,
      inviterUsername: null
    });

    notificationService.notifyInvitation(otherUserId, {
      source: 'match',
      contextId: gameId,
      inviterId: userId,
      inviterUsername: null
    });
    break;
  }
}

export const MatchmakingService = {
  async joinQueue(userId: string, preferences: Record<string, unknown>) {
    queue.set(userId, { preferences, joinedAt: Date.now() });
    lastGameForUser.delete(userId);
    const entry = queue.get(userId)!;
    emitStatus({ userId, status: 'searching', joinedAt: entry.joinedAt, gameId: null });
    await tryMatch(userId);
  },

  async leaveQueue(userId: string) {
    queue.delete(userId);
    lastGameForUser.delete(userId);
    emitStatus({ userId, status: 'cancelled', joinedAt: null, gameId: null });
  },

  getStatus(userId: string): MatchmakingStatus {
    const entry = queue.get(userId);
    const lastGameId = lastGameForUser.get(userId) ?? null;
    if (!entry) {
      return {
        searching: false,
        preferences: null,
        joinedAt: null,
        gameId: lastGameId
      };
    }

    return {
      searching: true,
      preferences: entry.preferences,
      joinedAt: entry.joinedAt,
      gameId: lastGameId
    };
  },

  onStatus(listener: (event: MatchmakingStatusEvent) => void) {
    emitter.on('status', listener);
    return () => emitter.removeListener('status', listener);
  },

  onMatchFound(listener: (event: MatchmakingMatchFoundEvent) => void) {
    emitter.on('match-found', listener);
    return () => emitter.removeListener('match-found', listener);
  },

  clear() {
    queue.clear();
    lastGameForUser.clear();
  }
};
