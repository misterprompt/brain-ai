import type { Prisma } from '@prisma/client';
import type { PlayerColor, TimeControlConfig, TimeControlPreset } from '../types/game';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const PRESET_DEFINITIONS: Record<Exclude<TimeControlPreset, 'CUSTOM'>, TimeControlConfig> = {
  BLITZ: { preset: 'BLITZ', totalTimeMs: 3 * 60 * 1000, incrementMs: 0, delayMs: 0 },
  NORMAL: { preset: 'NORMAL', totalTimeMs: 10 * 60 * 1000, incrementMs: 1_000, delayMs: 0 },
  LONG: { preset: 'LONG', totalTimeMs: 20 * 60 * 1000, incrementMs: 2_000, delayMs: 0 }
};

export const DEFAULT_TIME_CONTROL_PRESET: TimeControlPreset = 'NORMAL';

type TimerEntry = {
  config: TimeControlConfig;
  whiteRemainingMs: number;
  blackRemainingMs: number;
  active: PlayerColor;
  lastTick: number;
  paused: boolean;
};

export type TurnTimerSnapshot = {
  config: TimeControlConfig;
  active: PlayerColor;
  whiteRemainingMs: number;
  blackRemainingMs: number;
  paused: boolean;
};

export type TimerUpdateResult = {
  flagFall: PlayerColor | false;
  whiteRemainingMs: number;
  blackRemainingMs: number;
};

const timerStore = new Map<string, TimerEntry>();

const keyFor = (gameId: string | number) => String(gameId);

const buildConfig = (preset: TimeControlPreset, overrides?: Partial<TimeControlConfig>): TimeControlConfig => {
  if (preset === 'CUSTOM') {
    const base: TimeControlConfig = {
      preset: 'CUSTOM',
      totalTimeMs: overrides?.totalTimeMs ?? PRESET_DEFINITIONS.NORMAL.totalTimeMs,
      incrementMs: overrides?.incrementMs ?? 0,
      delayMs: overrides?.delayMs ?? 0
    };
    return { ...base, ...(overrides ?? {}) };
  }

  const base = PRESET_DEFINITIONS[preset] ?? PRESET_DEFINITIONS.NORMAL;
  return { ...base, ...(overrides ?? {}), preset };
};

export class TurnTimerService {
  static configure(gameId: string | number, preset: TimeControlPreset | null, overrides?: Partial<TimeControlConfig>): TimeControlConfig | null {
    const key = keyFor(gameId);

    if (!preset) {
      timerStore.delete(key);
      void persistReset(String(gameId));
      return null;
    }

    const config = buildConfig(preset, overrides);
    const entry: TimerEntry = {
      config,
      whiteRemainingMs: config.totalTimeMs,
      blackRemainingMs: config.totalTimeMs,
      active: 'white',
      lastTick: Date.now(),
      paused: false
    };

    timerStore.set(key, entry);
    void persistEntry(String(gameId), entry);
    return config;
  }

  static clear(gameId: string | number): void {
    const key = keyFor(gameId);
    timerStore.delete(key);
    void persistReset(String(gameId));
  }

  static getSnapshot(gameId: string | number): TurnTimerSnapshot | null {
    const entry = timerStore.get(keyFor(gameId));
    if (!entry) {
      return null;
    }

    return {
      config: entry.config,
      active: entry.active,
      whiteRemainingMs: entry.whiteRemainingMs,
      blackRemainingMs: entry.blackRemainingMs,
      paused: entry.paused
    };
  }

  static ensure(gameId: string | number, preset: TimeControlPreset | null): void {
    if (!preset) {
      return;
    }
    const key = keyFor(gameId);
    if (!timerStore.has(key)) {
      this.configure(gameId, preset);
    }
  }

  static consume(gameId: string | number, player: PlayerColor): TimerUpdateResult | null {
    const entry = timerStore.get(keyFor(gameId));

    if (!entry) {
      return null;
    }

    if (entry.paused) {
      return {
        flagFall: false,
        whiteRemainingMs: entry.whiteRemainingMs,
        blackRemainingMs: entry.blackRemainingMs
      };
    }

    const now = Date.now();

    if (entry.active !== player) {
      return {
        flagFall: false,
        whiteRemainingMs: entry.whiteRemainingMs,
        blackRemainingMs: entry.blackRemainingMs
      };
    }

    const elapsed = Math.max(0, now - entry.lastTick - entry.config.delayMs);
    entry.lastTick = now;

    const field = player === 'white' ? 'whiteRemainingMs' : 'blackRemainingMs';
    if (elapsed > 0) {
      entry[field] = Math.max(0, entry[field] - elapsed);
    }

    if (entry[field] <= 0) {
      entry[field] = 0;
      entry.paused = true;
      entry.lastTick = now;
      void persistEntry(String(gameId), entry);
      return {
        flagFall: player,
        whiteRemainingMs: entry.whiteRemainingMs,
        blackRemainingMs: entry.blackRemainingMs
      };
    }

    entry.lastTick = now;
    void persistEntry(String(gameId), entry);
    return {
      flagFall: false,
      whiteRemainingMs: entry.whiteRemainingMs,
      blackRemainingMs: entry.blackRemainingMs
    };
  }

  static completeMove(gameId: string | number, movingPlayer: PlayerColor, nextPlayer: PlayerColor): TimerUpdateResult | null {
    const entry = timerStore.get(keyFor(gameId));

    if (!entry) {
      return null;
    }

    if (entry.paused) {
      entry.paused = false;
    }

    const field = movingPlayer === 'white' ? 'whiteRemainingMs' : 'blackRemainingMs';
    if (entry.config.incrementMs > 0) {
      entry[field] += entry.config.incrementMs;
    }

    entry.active = nextPlayer;
    entry.lastTick = Date.now();
    entry.paused = false;
    void persistEntry(String(gameId), entry);

    return {
      flagFall: false,
      whiteRemainingMs: entry.whiteRemainingMs,
      blackRemainingMs: entry.blackRemainingMs
    };
  }

  static pause(gameId: string | number): void {
    const entry = timerStore.get(keyFor(gameId));
    if (!entry) {
      return;
    }
    if (entry.paused) {
      return;
    }
    // Capture elapsed time before pausing
    void this.consume(gameId, entry.active);
    const refreshed = timerStore.get(keyFor(gameId));
    if (!refreshed) {
      return;
    }
    refreshed.paused = true;
    refreshed.lastTick = Date.now();
    void persistEntry(String(gameId), refreshed);
  }

  static resume(gameId: string | number, nextActive: PlayerColor): void {
    const entry = timerStore.get(keyFor(gameId));
    if (!entry) {
      return;
    }
    entry.paused = false;
    entry.active = nextActive;
    entry.lastTick = Date.now();
    void persistEntry(String(gameId), entry);
  }

  static restore(gameId: string | number, params: {
    preset: TimeControlPreset | null;
    whiteRemainingMs?: number | null;
    blackRemainingMs?: number | null;
    activePlayer?: PlayerColor | null;
    lastUpdatedAt?: Date | null;
    overrides?: Partial<TimeControlConfig>;
  }): void {
    const { preset } = params;
    if (!preset) {
      return;
    }

    const key = keyFor(gameId);
    const config = buildConfig(preset, params.overrides);
    const existing = timerStore.get(key);
    const providedTick = params.lastUpdatedAt?.getTime() ?? 0;

    if (existing && existing.lastTick >= providedTick) {
      return;
    }

    const entry: TimerEntry = {
      config,
      whiteRemainingMs: params.whiteRemainingMs ?? config.totalTimeMs,
      blackRemainingMs: params.blackRemainingMs ?? config.totalTimeMs,
      active: params.activePlayer ?? 'white',
      lastTick: providedTick > 0 ? providedTick : Date.now(),
      paused: (params.activePlayer ?? null) === null
    };

    timerStore.set(key, entry);
  }
}

export const TimeControlPresets = PRESET_DEFINITIONS;

function persistEntry(gameId: string, entry: TimerEntry): void {
  const data: Prisma.gamesUpdateInput = {
    whiteTimeRemainingMs: entry.whiteRemainingMs,
    blackTimeRemainingMs: entry.blackRemainingMs,
    activeTimer: entry.paused ? null : entry.active === 'white' ? 'WHITE' : 'BLACK',
    timerUpdatedAt: new Date()
  };

  void prisma.games.update({
    where: { id: gameId },
    data
  }).catch((error) => {
    logger.error('Failed to persist timer entry', { gameId, error });
  });
}

function persistReset(gameId: string): void {
  const data: Prisma.gamesUpdateInput = {
    activeTimer: null,
    timerUpdatedAt: new Date()
  };

  void prisma.games.update({
    where: { id: gameId },
    data
  }).catch((error) => {
    logger.error('Failed to reset timer state', { gameId, error });
  });
}
