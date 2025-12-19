"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToDouble = exports.offerDouble = exports.evaluatePosition = exports.getSuggestions = exports.offerDraw = exports.resignGame = exports.getPipCount = exports.getAvailableMoves = exports.listUserGames = exports.joinGame = exports.listAvailableGames = exports.getGameStatus = exports.makeMove = exports.rollDice = exports.getGameDetails = exports.createGameController = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const gameService_1 = require("../services/gameService");
const aiService_1 = require("../services/aiService");
const auth_1 = require("../utils/auth");
const ALLOWED_GAME_MODES = [
    client_1.GameMode.AI_VS_PLAYER,
    client_1.GameMode.PLAYER_VS_PLAYER,
    client_1.GameMode.TOURNAMENT
];
const createGameSchema = zod_1.z.object({
    game_mode: zod_1.z.string().optional(),
    stake: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    opponentId: zod_1.z.string().optional()
});
const makeMoveSchema = zod_1.z.object({
    from: zod_1.z.number(),
    to: zod_1.z.number(),
    diceUsed: zod_1.z.number()
});
const aiAnalysisBodySchema = zod_1.z.object({
    boardState: zod_1.z.unknown().optional(),
    dice: zod_1.z.unknown().optional()
});
const parseCreateGameInput = (userId, body) => {
    const result = createGameSchema.safeParse(body ?? {});
    if (!result.success) {
        return null;
    }
    const { game_mode, stake, opponentId } = result.data;
    const rawMode = typeof game_mode === 'string' ? game_mode.toUpperCase() : 'AI_VS_PLAYER';
    const mode = ALLOWED_GAME_MODES.includes(rawMode) ? rawMode : null;
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
const createGameController = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const createInput = parseCreateGameInput(userId, req.body);
    if (!createInput) {
        return res.status(400).json({ success: false, error: 'Invalid game creation payload' });
    }
    try {
        const createdGame = await gameService_1.GameService.createGame(createInput);
        return res.status(201).json({
            success: true,
            message: 'Game created successfully',
            data: createdGame
        });
    }
    catch (error) {
        console.error('Create game error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create game',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createGameController = createGameController;
const getGameDetails = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const game = await gameService_1.GameService.getGame(gameId);
        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }
        if (!(0, auth_1.ensurePlayerInGame)(req, game)) {
            return res.status(403).json({ success: false, error: 'Unauthorized', message: 'You are not a player in this game.' });
        }
        return res.json({ success: true, data: game });
    }
    catch (error) {
        console.error('Get game error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get game details' });
    }
};
exports.getGameDetails = getGameDetails;
const rollDice = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const updatedGame = await gameService_1.GameService.rollDice(gameId, userId);
        return res.json({ success: true, data: updatedGame });
    }
    catch (error) {
        console.error('Roll dice error:', error);
        return res.status(400).json({
            success: false,
            error: 'Failed to roll dice',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.rollDice = rollDice;
const makeMove = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const parseResult = makeMoveSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ success: false, error: 'Invalid move request' });
    }
    const moveRequest = parseResult.data;
    try {
        const updatedGame = await gameService_1.GameService.makeMove(gameId, userId, moveRequest);
        return res.json({ success: true, data: updatedGame });
    }
    catch (error) {
        console.error('Make move error:', error);
        return res.status(400).json({
            success: false,
            error: 'Failed to make move',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.makeMove = makeMove;
const getGameStatus = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const summary = await gameService_1.GameService.getGameSummary(gameId);
        if (!summary) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }
        // We might want to check auth here too, but summary might be public?
        // The previous code checked ensurePlayerInGame.
        const game = await gameService_1.GameService.getGame(gameId);
        if (game && !(0, auth_1.ensurePlayerInGame)(req, game)) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        return res.json({ success: true, data: summary });
    }
    catch (error) {
        console.error('Get status error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get game status' });
    }
};
exports.getGameStatus = getGameStatus;
const listAvailableGames = async (req, res) => {
    try {
        const games = await gameService_1.GameService.listAvailableGames();
        return res.json({ success: true, data: games });
    }
    catch (error) {
        console.error('List available games error:', error);
        return res.status(500).json({ success: false, error: 'Failed to list available games' });
    }
};
exports.listAvailableGames = listAvailableGames;
const joinGame = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const game = await gameService_1.GameService.joinGame(gameId, userId);
        return res.json({ success: true, data: game });
    }
    catch (error) {
        console.error('Join game error:', error);
        return res.status(400).json({
            success: false,
            error: 'Failed to join game',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.joinGame = joinGame;
const listUserGames = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const games = await gameService_1.GameService.listUserGames(userId);
        return res.json({ success: true, data: games });
    }
    catch (error) {
        console.error('List user games error:', error);
        return res.status(500).json({ success: false, error: 'Failed to list user games' });
    }
};
exports.listUserGames = listUserGames;
const getAvailableMoves = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const moves = await gameService_1.GameService.getAvailableMoves(gameId, userId);
        return res.json({ success: true, data: moves });
    }
    catch (error) {
        console.error('Get available moves error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get available moves' });
    }
};
exports.getAvailableMoves = getAvailableMoves;
const getPipCount = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const pipCount = await gameService_1.GameService.getPipCount(gameId);
        return res.json({ success: true, data: pipCount });
    }
    catch (error) {
        console.error('Get pip count error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get pip count' });
    }
};
exports.getPipCount = getPipCount;
const resignGame = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const result = await gameService_1.GameService.resignGame(gameId, userId);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Resign game error:', error);
        return res.status(500).json({ success: false, error: 'Failed to resign game' });
    }
};
exports.resignGame = resignGame;
const offerDraw = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const result = await gameService_1.GameService.offerDraw(gameId, userId);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Offer draw error:', error);
        return res.status(500).json({ success: false, error: 'Failed to offer draw' });
    }
};
exports.offerDraw = offerDraw;
const getSuggestions = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required.' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    const id = gameId;
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const game = await gameService_1.GameService.getGame(gameId);
        if (!game || !(0, auth_1.ensurePlayerInGame)(req, game)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
                message: 'You are not a player in this game.'
            });
        }
        const { boardState, dice } = aiAnalysisBodySchema.parse(req.body ?? {});
        const suggestion = await aiService_1.AIService.getBestMove({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Invalid analysis payload',
                message: error.issues.map((issue) => issue.message).join(', ')
            });
        }
        if (error instanceof aiService_1.QuotaExceededError) {
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
exports.getSuggestions = getSuggestions;
const evaluatePosition = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required.' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    const id = gameId;
    try {
        const game = await gameService_1.GameService.getGame(id);
        if (!game || !(0, auth_1.ensurePlayerInGame)(req, game)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
                message: 'You are not a player in this game.'
            });
        }
        const { boardState, dice } = aiAnalysisBodySchema.parse(req.body ?? {});
        const evaluation = await aiService_1.AIService.evaluatePosition({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Invalid analysis payload',
                message: error.issues.map((issue) => issue.message).join(', ')
            });
        }
        if (error instanceof aiService_1.QuotaExceededError) {
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
exports.evaluatePosition = evaluatePosition;
const offerDouble = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!gameId) {
        return res.status(400).json({ success: false, error: 'Game ID is required' });
    }
    try {
        const updatedGame = await gameService_1.GameService.offerDouble(gameId, userId);
        return res.json({ success: true, data: updatedGame });
    }
    catch (error) {
        console.error('Offer double error:', error);
        return res.status(400).json({
            success: false,
            error: 'Failed to offer double',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.offerDouble = offerDouble;
const respondToDouble = async (req, res) => {
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
        const updatedGame = await gameService_1.GameService.respondToDouble(gameId, userId, accept, Boolean(beaver), Boolean(raccoon));
        return res.json({ success: true, data: updatedGame });
    }
    catch (error) {
        console.error('Respond to double error:', error);
        return res.status(400).json({
            success: false,
            error: 'Failed to respond to double',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.respondToDouble = respondToDouble;
//# sourceMappingURL=gameController.js.map