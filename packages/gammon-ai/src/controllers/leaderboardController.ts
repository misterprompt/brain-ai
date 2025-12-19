import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  getGlobalLeaderboard,
  getCountryLeaderboard,
  getSeasonLeaderboard,
  type LeaderboardQuery
} from '../services/leaderboardService';

const paginationSchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .optional()
    .refine((value) => value === undefined || (!Number.isNaN(value) && value >= 1), 'page must be >= 1'),
  perPage: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .optional()
    .refine((value) => value === undefined || (!Number.isNaN(value) && value >= 1), 'perPage must be >= 1'),
  sort: z.enum(['elo', 'winrate', 'games']).optional()
});

export const getLeaderboardGlobal = async (req: Request, res: Response) => {
  try {
    const query = paginationSchema.parse(req.query) as LeaderboardQuery;
    const result = await getGlobalLeaderboard(query);
    return res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch global leaderboard' });
  }
};

const countryParamSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .min(2, 'countryCode must be ISO 3166-1 alpha-2')
    .max(2, 'countryCode must be ISO 3166-1 alpha-2')
});

export const getLeaderboardCountry = async (req: Request, res: Response) => {
  try {
    const { countryCode } = countryParamSchema.parse(req.params);
    const query = paginationSchema.parse(req.query) as LeaderboardQuery;
    const result = await getCountryLeaderboard(countryCode, query);
    return res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch country leaderboard' });
  }
};

const seasonParamSchema = z.object({
  seasonId: z.string().uuid('seasonId must be a valid UUID')
});

export const getLeaderboardSeason = async (req: Request, res: Response) => {
  try {
    const { seasonId } = seasonParamSchema.parse(req.params);
    const query = paginationSchema.parse(req.query) as LeaderboardQuery;
    const result = await getSeasonLeaderboard(seasonId, query);
    return res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
    }
    if (error instanceof Error && error.message === 'Season not found') {
      return res.status(404).json({ success: false, error: 'Season not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch season leaderboard' });
  }
};
