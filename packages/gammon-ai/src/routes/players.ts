// src/routes/players.ts
import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

type LeaderboardUserRow = {
  id: string;
  username: string | null;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  country: string | null;
};

type SeasonLeaderboardRow = {
  seasonId: string;
  rankGlobal: number | null;
  rankCountry: number | null;
  user: LeaderboardUserRow | null;
};

type PrismaPlayersClient = {
  users: {
    findMany: (args: Record<string, unknown>) => Promise<LeaderboardUserRow[]>;
  };
  season_leaderboard: {
    findMany: (args: Record<string, unknown>) => Promise<SeasonLeaderboardRow[]>;
  };
};

const db = prisma as unknown as PrismaPlayersClient;

const mapUser = (user: LeaderboardUserRow) => ({
  id: user.id,
  username: user.username,
  eloRating: user.eloRating,
  gamesPlayed: user.gamesPlayed,
  gamesWon: user.gamesWon,
  winRate: user.winRate,
  country: user.country
});

router.get('/', async (_req, res) => {
  try {
    const users = await db.users.findMany({
      orderBy: { eloRating: 'desc' },
      take: 100,
      select: {
        id: true,
        username: true,
        eloRating: true,
        gamesPlayed: true,
        gamesWon: true,
        winRate: true,
        country: true
      }
    });

    res.json({ success: true, data: users.map(mapUser) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

router.get('/country/:countryCode', async (req, res) => {
  try {
    const countryCode = req.params.countryCode.toUpperCase();
    const users = await db.users.findMany({
      where: { country: countryCode },
      orderBy: { eloRating: 'desc' },
      take: 100,
      select: {
        id: true,
        username: true,
        eloRating: true,
        gamesPlayed: true,
        gamesWon: true,
        winRate: true,
        country: true
      }
    });

    res.json({ success: true, data: users.map(mapUser) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

router.get('/season/:seasonId', async (req, res) => {
  try {
    const seasonId = req.params.seasonId;
    const standings = await db.season_leaderboard.findMany({
      where: { seasonId },
      orderBy: { rankGlobal: 'asc' },
      select: {
        seasonId: true,
        rankGlobal: true,
        rankCountry: true,
        user: {
          select: {
            id: true,
            username: true,
            eloRating: true,
            gamesPlayed: true,
            gamesWon: true,
            winRate: true,
            country: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: standings.map((entry: SeasonLeaderboardRow) => ({
        seasonId: entry.seasonId,
        rankGlobal: entry.rankGlobal,
        rankCountry: entry.rankCountry,
        player: entry.user ? mapUser(entry.user) : null
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/players - DISABLED: Use /api/auth/register instead
/*
router.post('/', async (req, res) => {
  const { username, email } = req.body;
  
  try {
    const newPlayer = await prisma.users.create({
      data: { username, email }
    });
    
    res.status(201).json({
      success: true,
      data: newPlayer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to create player'
    });
  }
});
*/

// DELETE /api/players/:id - DISABLED: Security risk
/*
router.delete('/:id', async (req, res) => {
  const playerId = req.params.id;
  
  try {
    const deletedPlayer = await prisma.users.delete({
      where: { id: playerId }
    });
    
    res.json({
      success: true,
      data: deletedPlayer
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Player not found'
    });
  }
});
*/

export default router;
