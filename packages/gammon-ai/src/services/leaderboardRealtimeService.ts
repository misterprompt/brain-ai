import { logger } from '../utils/logger';
import {
  getGlobalLeaderboard,
  getCountryLeaderboard,
  getSeasonLeaderboard,
  type LeaderboardSort,
  deriveLeaderboardChannel,
  type LeaderboardEntry
} from './leaderboardService';
import { broadcastLeaderboardUpdate } from '../websocket/server';
import type { LeaderboardScopePayload, LeaderboardUpdatePayload } from './socketService';
import type { EloMatchResult } from './eloService';

const DEFAULT_SORTS: LeaderboardSort[] = ['elo', 'winrate', 'games'];

const mapEntries = (entries: LeaderboardEntry[]): LeaderboardUpdatePayload['entries'] =>
  entries.map((entry) => {
    const mapped: LeaderboardUpdatePayload['entries'][number] = {
      id: entry.id,
      username: entry.username,
      country: entry.country,
      elo: entry.elo,
      winrate: entry.winrate,
      gamesPlayed: entry.gamesPlayed,
      rankGlobal: entry.rankGlobal ?? null,
      rankCountry: entry.rankCountry ?? null
    };

    if (typeof entry.gamesWon === 'number') {
      mapped.gamesWon = entry.gamesWon;
    }

    return mapped;
  });

async function emitForScope(scope: LeaderboardScopePayload): Promise<void> {
  try {
    const channel = deriveLeaderboardChannel(scope);
    const timestamp = new Date().toISOString();

    let result:
      | Awaited<ReturnType<typeof getGlobalLeaderboard>>
      | Awaited<ReturnType<typeof getCountryLeaderboard>>
      | Awaited<ReturnType<typeof getSeasonLeaderboard>>;

    if (scope.type === 'global') {
      result = await getGlobalLeaderboard({ sort: scope.sort });
    } else if (scope.type === 'country') {
      result = await getCountryLeaderboard(scope.country, { sort: scope.sort });
    } else {
      result = await getSeasonLeaderboard(scope.seasonId, { sort: scope.sort });
    }

    const payload: LeaderboardUpdatePayload = {
      scope,
      timestamp,
      entries: mapEntries(result.data),
      total: result.meta.total
    };

    broadcastLeaderboardUpdate(channel, payload);
  } catch (error) {
    logger.error('Failed to broadcast leaderboard update', { scope, error });
  }
}

export async function publishEloLeaderboardUpdates(result: EloMatchResult): Promise<void> {
  const scopes: LeaderboardScopePayload[] = [];

  for (const sort of DEFAULT_SORTS) {
    scopes.push({ type: 'global', sort });
  }

  if (result.scope.type === 'global+season' && result.scope.seasonId) {
    for (const sort of DEFAULT_SORTS) {
      scopes.push({ type: 'season', seasonId: result.scope.seasonId, sort });
    }
  }

  for (const scope of scopes) {
    await emitForScope(scope);
  }
}
