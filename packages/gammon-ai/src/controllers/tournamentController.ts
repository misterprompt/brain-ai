// src/controllers/tournamentController.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { broadcastTournamentEvent } from '../websocket/tournamentServer.js';
import { notificationService } from '../services/notificationService';
import { TournamentService } from '../services/tournamentService';

const createTournamentSchema = z.object({
  name: z.string().trim().min(1)
});

const adminIds = () => (process.env.TOURNAMENT_ADMIN_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);

const isTournamentAdmin = (userId: string | undefined): boolean => {
  if (!userId) {
    return false;
  }
  const admins = adminIds();
  return admins.length === 0 ? false : admins.includes(userId);
};

export const createTournament = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !isTournamentAdmin(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Only tournament administrators can create tournaments.'
      });
    }

    const { name } = createTournamentSchema.parse(req.body ?? {});

    const tournament = await TournamentService.createTournament({
      name,
      createdBy: req.user.id
    });

    return res.status(201).json({ success: true, data: tournament });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues.map((i) => i.message).join(', ') });
    }
    return res.status(500).json({ success: false, error: 'Failed to create tournament' });
  }
};

export const leaveTournament = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tournamentId = req.params.id ?? '';
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
    }

    await TournamentService.leaveTournament(tournamentId, req.user.id);

    broadcastTournamentEvent(tournamentId, 'tournamentUpdated', {
      tournamentId,
      type: 'participantLeft',
      userId: req.user.id
    });

    await TournamentService.notifyParticipants({
      tournamentId,
      message: `${req.user.username ?? 'Un joueur'} a quitté le tournoi`,
      payload: {
        userId: req.user.id,
        action: 'leave'
      },
      excludeUserIds: [req.user.id]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }

    if (error instanceof Error && error.message === 'User not registered in this tournament') {
      return res.status(404).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Failed to leave tournament' });
  }
};

export const joinTournament = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tournamentId = req.params.id ?? '';
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
    }

    const participant = await TournamentService.joinTournament(tournamentId, req.user.id);

    broadcastTournamentEvent(tournamentId, 'playerJoined', {
      tournamentId,
      userId: req.user.id
    });

    const tournament = await TournamentService.getTournament(tournamentId);

    if (tournament?.createdBy && tournament.createdBy !== req.user.id) {
      notificationService.notifyInvitation(tournament.createdBy, {
        source: 'tournament',
        contextId: tournamentId,
        inviterId: req.user.id,
        inviterUsername: req.user.username ?? null
      });
    }

    await TournamentService.notifyParticipants({
      tournamentId,
      message: `${req.user.username ?? 'Un joueur'} a rejoint le tournoi`,
      payload: {
        userId: req.user.id,
        action: 'join'
      },
      excludeUserIds: [req.user.id]
    });

    return res.status(201).json({ success: true, data: participant });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Tournament not found') {
        return res.status(404).json({ success: false, error: error.message });
      }

      if (error.message.includes('no longer accepting')) {
        return res.status(400).json({ success: false, error: error.message });
      }

      if (error.message === 'Tournament is full') {
        return res.status(409).json({ success: false, error: error.message });
      }

      if (error.message === 'User already registered in this tournament') {
        return res.status(409).json({ success: false, error: error.message });
      }
    }

    return res.status(500).json({ success: false, error: 'Failed to join tournament' });
  }
};

export const getTournament = async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params.id;
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
    }
    const tournament = await TournamentService.getTournament(tournamentId);

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    return res.json({ success: true, data: tournament });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch tournament' });
  }
};

export const getTournamentParticipants = async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params.id ?? '';
    const participants = await TournamentService.listParticipants(tournamentId);

    return res.json({ success: true, data: participants });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch participants' });
  }
};

export const getTournamentLeaderboard = async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params.id ?? '';
    const participants = await TournamentService.listLeaderboard(tournamentId);

    return res.json({ success: true, data: participants });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
};

export const startTournament = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tournamentId = req.params.id ?? '';
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
    }

    const tournament = await TournamentService.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    const role = await TournamentService.getUserRole(tournamentId, req.user.id);
    if (role !== 'ORGANIZER' && !isTournamentAdmin(req.user.id)) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    await TournamentService.startTournament(tournamentId);

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('At least two participants')) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }
    return res.status(500).json({ success: false, error: 'Failed to start tournament' });
  }
};

export const reportTournamentMatch = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tournamentId = req.params.id ?? '';
    const matchId = req.params.matchId ?? '';

    if (!tournamentId || !matchId) {
      return res.status(400).json({ success: false, error: 'Invalid identifiers' });
    }

    const bodySchema = z.object({
      winnerParticipantId: z.string().min(1),
      gameId: z.string().optional()
    });

    const payload = bodySchema.parse(req.body ?? {});

    const tournament = await TournamentService.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    const isOwner = tournament.createdBy === req.user.id;
    if (!isOwner && !isTournamentAdmin(req.user.id)) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    await TournamentService.reportMatchResult({
      matchId,
      winnerParticipantId: payload.winnerParticipantId,
      gameId: payload.gameId ?? null
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues.map((issue) => issue.message).join(', ') });
    }

    if (error instanceof Error) {
      if (error.message === 'Tournament not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('not registered')) {
        return res.status(404).json({ success: false, error: error.message });
      }
    }

    return res.status(500).json({ success: false, error: 'Failed to report match result' });
  }
};

export const getTournamentStandings = async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params.id ?? '';
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
    }

    const standings = await TournamentService.getStandings(tournamentId);
    return res.json({ success: true, data: standings });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch standings' });
  }
};

export const getTournamentBracket = async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params.id ?? '';
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
    }

    const bracket = await TournamentService.getBracket(tournamentId);
    return res.json({ success: true, data: bracket });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch bracket' });
  }
};

export const getTournamentOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tournamentId = req.params.id ?? '';
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
    }

    const overview = await TournamentService.getOverview(tournamentId, req.user.id);
    return res.json({ success: true, data: overview });
  } catch (error) {
    if (error instanceof Error && error.message === 'Tournament not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to build overview' });
  }
};
