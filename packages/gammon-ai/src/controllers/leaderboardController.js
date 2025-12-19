"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboardSeason = exports.getLeaderboardCountry = exports.getLeaderboardGlobal = void 0;
const zod_1 = require("zod");
const leaderboardService_1 = require("../services/leaderboardService");
const paginationSchema = zod_1.z.object({
    page: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((value) => Number(value))
        .optional()
        .refine((value) => value === undefined || (!Number.isNaN(value) && value >= 1), 'page must be >= 1'),
    perPage: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((value) => Number(value))
        .optional()
        .refine((value) => value === undefined || (!Number.isNaN(value) && value >= 1), 'perPage must be >= 1'),
    sort: zod_1.z.enum(['elo', 'winrate', 'games']).optional()
});
const getLeaderboardGlobal = async (req, res) => {
    try {
        const query = paginationSchema.parse(req.query);
        const result = await (0, leaderboardService_1.getGlobalLeaderboard)(query);
        return res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
        }
        return res.status(500).json({ success: false, error: 'Failed to fetch global leaderboard' });
    }
};
exports.getLeaderboardGlobal = getLeaderboardGlobal;
const countryParamSchema = zod_1.z.object({
    countryCode: zod_1.z
        .string()
        .trim()
        .min(2, 'countryCode must be ISO 3166-1 alpha-2')
        .max(2, 'countryCode must be ISO 3166-1 alpha-2')
});
const getLeaderboardCountry = async (req, res) => {
    try {
        const { countryCode } = countryParamSchema.parse(req.params);
        const query = paginationSchema.parse(req.query);
        const result = await (0, leaderboardService_1.getCountryLeaderboard)(countryCode, query);
        return res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
        }
        return res.status(500).json({ success: false, error: 'Failed to fetch country leaderboard' });
    }
};
exports.getLeaderboardCountry = getLeaderboardCountry;
const seasonParamSchema = zod_1.z.object({
    seasonId: zod_1.z.string().uuid('seasonId must be a valid UUID')
});
const getLeaderboardSeason = async (req, res) => {
    try {
        const { seasonId } = seasonParamSchema.parse(req.params);
        const query = paginationSchema.parse(req.query);
        const result = await (0, leaderboardService_1.getSeasonLeaderboard)(seasonId, query);
        return res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
        }
        if (error instanceof Error && error.message === 'Season not found') {
            return res.status(404).json({ success: false, error: 'Season not found' });
        }
        return res.status(500).json({ success: false, error: 'Failed to fetch season leaderboard' });
    }
};
exports.getLeaderboardSeason = getLeaderboardSeason;
//# sourceMappingURL=leaderboardController.js.map