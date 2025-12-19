"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeControlPresets = exports.TurnTimerService = exports.DEFAULT_TIME_CONTROL_PRESET = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../utils/logger");
const PRESET_DEFINITIONS = {
    BLITZ: { preset: 'BLITZ', totalTimeMs: 3 * 60 * 1000, incrementMs: 0, delayMs: 0 },
    NORMAL: { preset: 'NORMAL', totalTimeMs: 10 * 60 * 1000, incrementMs: 1_000, delayMs: 0 },
    LONG: { preset: 'LONG', totalTimeMs: 20 * 60 * 1000, incrementMs: 2_000, delayMs: 0 }
};
exports.DEFAULT_TIME_CONTROL_PRESET = 'NORMAL';
const timerStore = new Map();
const keyFor = (gameId) => String(gameId);
const buildConfig = (preset, overrides) => {
    if (preset === 'CUSTOM') {
        const base = {
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
class TurnTimerService {
    static configure(gameId, preset, overrides) {
        const key = keyFor(gameId);
        if (!preset) {
            timerStore.delete(key);
            void persistReset(String(gameId));
            return null;
        }
        const config = buildConfig(preset, overrides);
        const entry = {
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
    static clear(gameId) {
        const key = keyFor(gameId);
        timerStore.delete(key);
        void persistReset(String(gameId));
    }
    static getSnapshot(gameId) {
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
    static ensure(gameId, preset) {
        if (!preset) {
            return;
        }
        const key = keyFor(gameId);
        if (!timerStore.has(key)) {
            this.configure(gameId, preset);
        }
    }
    static consume(gameId, player) {
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
    static completeMove(gameId, movingPlayer, nextPlayer) {
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
    static pause(gameId) {
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
    static resume(gameId, nextActive) {
        const entry = timerStore.get(keyFor(gameId));
        if (!entry) {
            return;
        }
        entry.paused = false;
        entry.active = nextActive;
        entry.lastTick = Date.now();
        void persistEntry(String(gameId), entry);
    }
    static restore(gameId, params) {
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
        const entry = {
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
exports.TurnTimerService = TurnTimerService;
exports.TimeControlPresets = PRESET_DEFINITIONS;
function persistEntry(gameId, entry) {
    const data = {
        whiteTimeRemainingMs: entry.whiteRemainingMs,
        blackTimeRemainingMs: entry.blackRemainingMs,
        activeTimer: entry.paused ? null : entry.active === 'white' ? 'WHITE' : 'BLACK',
        timerUpdatedAt: new Date()
    };
    void prisma_1.prisma.games.update({
        where: { id: gameId },
        data
    }).catch((error) => {
        logger_1.logger.error('Failed to persist timer entry', { gameId, error });
    });
}
function persistReset(gameId) {
    const data = {
        activeTimer: null,
        timerUpdatedAt: new Date()
    };
    void prisma_1.prisma.games.update({
        where: { id: gameId },
        data
    }).catch((error) => {
        logger_1.logger.error('Failed to reset timer state', { gameId, error });
    });
}
//# sourceMappingURL=turnTimerService.js.map