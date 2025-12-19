// src/controllers/gameController.ts
import { Response } from 'express';
import { GameMode } from '@prisma/client';
import { z } from 'zod';
import { GameService } from '../services/gameService';
import { AIService, QuotaExceededError } from '../services/aiService';
import type { ApiResponse } from '../types/api';
import type { CreateGameInput, Game, GameState, MakeMoveRequest } from '../types/game';
import { AuthRequest } from '../middleware/authMiddleware';
import { ensurePlayerInGame } from '../utils/auth';

const ALLOWED_GAME_MODES: readonly GameMode[] = [
  GameMode.AI_VS_PLAYER,
  GameMode.PLAYER_VS_PLAYER,
  GameMode.TOURNAMENT
];

const createGameSchema = z.object({
  game_mode: z.string().optional(),
  stake: z.union([z.number(), z.string()]).optional(),
  opponentId: z.string().optional()
});

const makeMoveSchema = z.object({
  from: z.number(),
  to: z.number(),
  diceUsed: z.number()
});

const aiAnalysisBodySchema = z.object({
  boardState: z.unknown().optional(),
  dice: z.unknown().optional()
});

const parseCreateGameInput = (userId: string, body: unknown): CreateGameInput | null => {
  const result = createGameSchema.safeParse(body ?? {});
  if (!result.success) {
    return null;
  }

  const { game_mode, stake, opponentId } = result.data;

  const rawMode = typeof game_mode === 'string' ? game_mode.toUpperCase() : 'AI_VS_PLAYER';
  const mode = ALLOWED_GAME_MODES.includes(rawMode as GameMode) ? (rawMode as GameMode) : null;
  if (!mode) {
    return null;
  }

  const numericStake = Number(stake ?? 0);
  if (!Number.isFinite(numericStake) || numericStake < 0) {
    return null;
  }

  return {
    userId,
    mode,
    stake: Math.trunc(numericStake),
    opponentId: typeof opponentId === 'string' ? opponentId : null
  };
};

export const createGameController = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const createInput = parseCreateGameInput(userId, req.body);
  if (!createInput) {
    return res.status(400).json({ success: false, error: 'Invalid game creation payload' } satisfies ApiResponse<Game>);
  }

  try {
    const createdGame = await GameService.createGame(createInput);
    return res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: createdGame
    } satisfies ApiResponse<GameState>);
  } catch (error) {
    console.error('Create game error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create game',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getGameDetails = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const game = await GameService.getGame(gameId);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    if (!ensurePlayerInGame(req, game)) {
      return res.status(403).json({ success: false, error: 'Unauthorized', message: 'You are not a player in this game.' });
    }

    return res.json({ success: true, data: game });
  } catch (error) {
    console.error('Get game error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get game details' });
  }
};

export const rollDice = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const updatedGame = await GameService.rollDice(gameId, userId);
    return res.json({ success: true, data: updatedGame });
  } catch (error) {
    console.error('Roll dice error:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to roll dice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const makeMove = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const parseResult = makeMoveSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, error: 'Invalid move request' });
  }

  const moveRequest: MakeMoveRequest = parseResult.data;

  try {
    const updatedGame = await GameService.makeMove(gameId as string, userId, moveRequest);
    return res.json({ success: true, data: updatedGame });
  } catch (error) {
    console.error('Make move error:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to make move',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getGameStatus = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const summary = await GameService.getGameSummary(gameId);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    // We might want to check auth here too, but summary might be public?
    // The previous code checked ensurePlayerInGame.
    const game = await GameService.getGame(gameId);
    if (game && !ensurePlayerInGame(req, game)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Get status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get game status' });
  }
};

export const listAvailableGames = async (req: AuthRequest, res: Response) => {
  try {
    const games = await GameService.listAvailableGames();
    return res.json({ success: true, data: games });
  } catch (error) {
    console.error('List available games error:', error);
    return res.status(500).json({ success: false, error: 'Failed to list available games' });
  }
};

export const joinGame = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const game = await GameService.joinGame(gameId, userId);
    return res.json({ success: true, data: game });
  } catch (error) {
    console.error('Join game error:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to join game',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const listUserGames = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const games = await GameService.listUserGames(userId);
    return res.json({ success: true, data: games });
  } catch (error) {
    console.error('List user games error:', error);
    return res.status(500).json({ success: false, error: 'Failed to list user games' });
  }
};

export const getAvailableMoves = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const moves = await GameService.getAvailableMoves(gameId, userId);
    return res.json({ success: true, data: moves });
  } catch (error) {
    console.error('Get available moves error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get available moves' });
  }
};

export const getPipCount = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const pipCount = await GameService.getPipCount(gameId);
    return res.json({ success: true, data: pipCount });
  } catch (error) {
    console.error('Get pip count error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get pip count' });
  }
};

export const resignGame = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const result = await GameService.resignGame(gameId, userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Resign game error:', error);
    return res.status(500).json({ success: false, error: 'Failed to resign game' });
  }
};

export const offerDraw = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const result = await GameService.offerDraw(gameId, userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Offer draw error:', error);
    return res.status(500).json({ success: false, error: 'Failed to offer draw' });
  }
};

export const getSuggestions = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required.' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  const id = gameId as string;

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const game = await GameService.getGame(gameId);
    if (!game || !ensurePlayerInGame(req, game)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You are not a player in this game.'
      });
    }

    const { boardState, dice } = aiAnalysisBodySchema.parse(req.body ?? {});

    const suggestion = await AIService.getBestMove({
      boardState: boardState ?? game.board,
      dice: dice ?? game.dice,
      userId,
      gameId: id
    });

    return res.json({
      success: true,
      data: { suggestion },
      message: suggestion ? 'Suggestion generated successfully' : 'Suggestion service unavailable'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analysis payload',
        message: error.issues.map((issue) => issue.message).join(', ')
      });
    }

    if (error instanceof QuotaExceededError) {
      return res.status(error.statusCode).json({
        success: false,
        error: 'QuotaExceeded',
        message: error.message
      });
    }

    console.error('AI suggestion error:', error);
    return res.status(500).json({
      success: false,
      error: 'AI_SERVICE_ERROR',
      message: 'Failed to generate AI suggestion.'
    });
  }
};

export const evaluatePosition = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required.' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  const id = gameId as string;

  try {
    const game = await GameService.getGame(id);
    if (!game || !ensurePlayerInGame(req, game)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You are not a player in this game.'
      });
    }

    const { boardState, dice } = aiAnalysisBodySchema.parse(req.body ?? {});

    const evaluation = await AIService.evaluatePosition({
      boardState: boardState ?? game.board,
      dice: dice ?? game.dice,
      userId,
      gameId: id
    });

    return res.json({
      success: true,
      data: { evaluation },
      message: evaluation ? 'Evaluation generated successfully' : 'Evaluation service unavailable'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analysis payload',
        message: error.issues.map((issue) => issue.message).join(', ')
      });
    }

    if (error instanceof QuotaExceededError) {
      return res.status(error.statusCode).json({
        success: false,
        error: 'QuotaExceeded',
        message: error.message
      });
    }

    console.error('AI evaluation error:', error);
    return res.status(500).json({
      success: false,
      error: 'AI_SERVICE_ERROR',
      message: 'Failed to evaluate position.'
    });
  }
};
export const offerDouble = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  try {
    const updatedGame = await GameService.offerDouble(gameId, userId);
    return res.json({ success: true, data: updatedGame });
  } catch (error) {
    console.error('Offer double error:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to offer double',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const respondToDouble = async (req: AuthRequest, res: Response) => {
  const { gameId } = req.params;
  const userId = req.user?.id;
  const { accept, beaver, raccoon } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!gameId) {
    return res.status(400).json({ success: false, error: 'Game ID is required' });
  }

  if (typeof accept !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Accept (boolean) is required' });
  }

  try {
    const updatedGame = await GameService.respondToDouble(gameId, userId, accept, Boolean(beaver), Boolean(raccoon));
    return res.json({ success: true, data: updatedGame });
  } catch (error) {
    console.error('Respond to double error:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to respond to double',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
