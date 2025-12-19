"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
// src/services/gameService.ts
const prisma_1 = require("../lib/prisma");
const gameEngine_1 = require("./gameEngine");
const turnTimerService_1 = require("./turnTimerService");
const aiService_1 = require("./aiService");
const config_1 = require("../config");
const cubeLogic_1 = require("./rules/cubeLogic");
const matchEngine_1 = require("./rules/matchEngine");
const gameEventEmitter_1 = require("./gameEventEmitter");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('GameService');
const AI_PLAYER = {
    id: 'ai-gnubg',
    name: 'GuruBot (AI)',
    email: 'ai@gurugammon.com',
    points: 2000,
    isPremium: true,
    createdAt: new Date(),
    updatedAt: new Date()
};
const DEFAULT_MATCH_RULES = {
    crawford: true,
    jacoby: false,
    beaver: true,
    raccoon: true
};
// Helper functions
const switchPlayer = (player) => (player === 'white' ? 'black' : 'white');
const playerEnumToColor = (owner) => {
    if (owner === 'WHITE')
        return 'white';
    if (owner === 'BLACK')
        return 'black';
    return null;
};
const colorToPlayerEnum = (color) => {
    if (color === 'white')
        return 'WHITE';
    if (color === 'black')
        return 'BLACK';
    return null;
};
const toGamePlayer = (user) => ({
    id: user.id,
    name: user.username || user.firstName || 'Unknown',
    email: user.email,
    points: user.eloRating,
    isPremium: user.subscriptionType !== 'FREE',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});
const defaultCubeSnapshot = () => ({
    level: 1,
    owner: null,
    isCentered: true,
    doublePending: false,
    doubleOfferedBy: null,
    history: []
});
const parseCubeHistory = (raw) => {
    if (!raw)
        return [];
    try {
        if (Array.isArray(raw))
            return raw;
        if (typeof raw === 'string')
            return JSON.parse(raw);
        return JSON.parse(JSON.stringify(raw));
    }
    catch {
        return [];
    }
};
const serializeCubeHistory = (history) => history;
const parseMatchRules = (rules) => {
    if (!rules)
        return DEFAULT_MATCH_RULES;
    try {
        const normalized = typeof rules === 'string' ? JSON.parse(rules) : JSON.parse(JSON.stringify(rules));
        return {
            crawford: normalized.crawford ?? DEFAULT_MATCH_RULES.crawford,
            jacoby: normalized.jacoby ?? DEFAULT_MATCH_RULES.jacoby,
            beaver: normalized.beaver ?? DEFAULT_MATCH_RULES.beaver,
            raccoon: normalized.raccoon ?? DEFAULT_MATCH_RULES.raccoon
        };
    }
    catch {
        return DEFAULT_MATCH_RULES;
    }
};
const buildMatchRecord = (match) => {
    if (!match)
        return null;
    const rules = parseMatchRules(match.rules);
    return {
        id: match.id,
        gameId: match.gameId,
        length: match.length,
        rules,
        state: match.state,
        crawfordUsed: match.crawfordUsed,
        cubeHistory: parseCubeHistory(match.cubeHistory)
    };
};
const buildCubeSnapshot = (game) => {
    const owner = playerEnumToColor(game.cubeOwner ?? null);
    return {
        level: game.cubeLevel ?? 1,
        owner,
        isCentered: owner === null,
        doublePending: Boolean(game.doublePending),
        doubleOfferedBy: game.doubleOfferedBy === 'white' || game.doubleOfferedBy === 'black' ? game.doubleOfferedBy : null,
        history: parseCubeHistory(game.cubeHistory)
    };
};
const buildCrawfordState = (game, match, rules, meta) => {
    const matchLengthOverride = meta ? meta.matchLength : undefined;
    const resolvedMatchLength = typeof matchLengthOverride !== 'undefined'
        ? matchLengthOverride
        : game.matchLength ?? match?.length ?? null;
    if (!rules.crawford) {
        const base = (0, matchEngine_1.defaultCrawfordState)();
        return {
            ...base,
            enabled: false,
            used: match?.crawfordUsed ?? false,
            matchLength: resolvedMatchLength,
            oneAwayScore: resolvedMatchLength !== null ? resolvedMatchLength - 1 : null
        };
    }
    return (0, matchEngine_1.evaluateCrawfordState)({
        rules,
        matchLength: resolvedMatchLength,
        whiteScore: game.whiteScore ?? 0,
        blackScore: game.blackScore ?? 0,
        match
    });
};
const serializeSnapshot = (snapshot) => {
    const payload = {
        board: {
            positions: snapshot.board.positions,
            whiteBar: snapshot.board.whiteBar,
            blackBar: snapshot.board.blackBar,
            whiteOff: snapshot.board.whiteOff,
            blackOff: snapshot.board.blackOff
        },
        dice: {
            dice: [...snapshot.dice.dice],
            used: [...snapshot.dice.used],
            remaining: [...snapshot.dice.remaining],
            doubles: snapshot.dice.doubles
        }
    };
    if (snapshot.meta) {
        const timers = snapshot.meta.timers
            ? {
                active: snapshot.meta.timers.active,
                whiteTimeMs: snapshot.meta.timers.whiteTimeMs,
                blackTimeMs: snapshot.meta.timers.blackTimeMs,
                ...(typeof snapshot.meta.timers.paused === 'boolean' ? { paused: snapshot.meta.timers.paused } : {}),
                ...(snapshot.meta.timers.updatedAt ? { updatedAt: snapshot.meta.timers.updatedAt } : {})
            }
            : undefined;
        payload.meta = {
            matchLength: snapshot.meta.matchLength ?? null,
            crawford: snapshot.meta.crawford ?? (0, matchEngine_1.defaultCrawfordState)(),
            ...(timers ? { timers } : {})
        };
    }
    return payload;
};
const deserializeSnapshot = (payload) => {
    const baseBoard = gameEngine_1.BackgammonEngine.createInitialBoard();
    const baseDice = gameEngine_1.BackgammonEngine.rollDice();
    if (!payload || typeof payload !== 'object') {
        return { board: baseBoard, dice: baseDice };
    }
    const { board: rawBoard, dice: rawDice, meta: rawMeta } = payload;
    const rawBoardObj = rawBoard && typeof rawBoard === 'object' ? rawBoard : {};
    const rawDiceObj = rawDice && typeof rawDice === 'object' ? rawDice : {};
    const positions = Array.isArray(rawBoardObj.positions) && rawBoardObj.positions.length === 24
        ? rawBoardObj.positions.map((value) => (typeof value === 'number' ? value : 0))
        : baseBoard.positions;
    const board = {
        positions,
        whiteBar: typeof rawBoardObj.whiteBar === 'number' ? rawBoardObj.whiteBar : baseBoard.whiteBar,
        blackBar: typeof rawBoardObj.blackBar === 'number' ? rawBoardObj.blackBar : baseBoard.blackBar,
        whiteOff: typeof rawBoardObj.whiteOff === 'number' ? rawBoardObj.whiteOff : baseBoard.whiteOff,
        blackOff: typeof rawBoardObj.blackOff === 'number' ? rawBoardObj.blackOff : baseBoard.blackOff
    };
    const diceArray = Array.isArray(rawDiceObj.dice) && rawDiceObj.dice.length === 2
        ? rawDiceObj.dice.map((value) => (typeof value === 'number' ? value : 0))
        : baseDice.dice;
    const usedArray = Array.isArray(rawDiceObj.used)
        ? rawDiceObj.used.map(flag => Boolean(flag)).slice(0, 2)
        : baseDice.used;
    const remainingArray = Array.isArray(rawDiceObj.remaining)
        ? rawDiceObj.remaining.filter((value) => typeof value === 'number')
        : baseDice.remaining;
    const doublesValue = typeof rawDiceObj.doubles === 'boolean'
        ? rawDiceObj.doubles
        : baseDice.doubles;
    const dice = {
        dice: diceArray,
        used: usedArray,
        remaining: remainingArray,
        doubles: doublesValue
    };
    let meta;
    if (rawMeta && typeof rawMeta === 'object') {
        const candidate = rawMeta;
        const matchLength = typeof candidate.matchLength === 'number'
            ? candidate.matchLength
            : candidate.matchLength === null
                ? null
                : null;
        let crawford = (0, matchEngine_1.defaultCrawfordState)();
        if (candidate.crawford && typeof candidate.crawford === 'object') {
            const input = candidate.crawford;
            crawford = {
                ...(0, matchEngine_1.defaultCrawfordState)(),
                enabled: typeof input.enabled === 'boolean' ? input.enabled : (0, matchEngine_1.defaultCrawfordState)().enabled,
                active: typeof input.active === 'boolean' ? input.active : (0, matchEngine_1.defaultCrawfordState)().active,
                used: typeof input.used === 'boolean' ? input.used : (0, matchEngine_1.defaultCrawfordState)().used,
                matchLength: typeof input.matchLength === 'number'
                    ? input.matchLength
                    : input.matchLength === null
                        ? null
                        : (0, matchEngine_1.defaultCrawfordState)().matchLength,
                oneAwayScore: typeof input.oneAwayScore === 'number'
                    ? input.oneAwayScore
                    : input.oneAwayScore === null
                        ? null
                        : (0, matchEngine_1.defaultCrawfordState)().oneAwayScore,
                triggeredBy: input.triggeredBy === 'white' || input.triggeredBy === 'black' ? input.triggeredBy : null
            };
        }
        let timers;
        if (candidate.timers && typeof candidate.timers === 'object') {
            const timersInput = candidate.timers;
            const active = timersInput.active === 'white' || timersInput.active === 'black' ? timersInput.active : null;
            const white = typeof timersInput.whiteTimeMs === 'number' ? timersInput.whiteTimeMs : timersInput.whiteTimeMs === null ? null : null;
            const black = typeof timersInput.blackTimeMs === 'number' ? timersInput.blackTimeMs : timersInput.blackTimeMs === null ? null : null;
            const paused = typeof timersInput.paused === 'boolean' ? timersInput.paused : undefined;
            const updatedAt = typeof timersInput.updatedAt === 'string' ? timersInput.updatedAt : undefined;
            timers = {
                active,
                whiteTimeMs: white,
                blackTimeMs: black,
                ...(typeof paused === 'boolean' ? { paused } : {}),
                ...(updatedAt ? { updatedAt } : {})
            };
        }
        meta = timers ? { matchLength, crawford, timers } : { matchLength, crawford };
    }
    return meta ? { board, dice, meta } : { board, dice };
};
const applyTimerSnapshot = (gameId, state, fallback) => {
    const snapshot = turnTimerService_1.TurnTimerService.getSnapshot(Number(gameId));
    if (snapshot) {
        return {
            ...state,
            timeControl: snapshot.config.preset,
            whiteTimeMs: snapshot.whiteRemainingMs,
            blackTimeMs: snapshot.blackRemainingMs
        };
    }
    if (fallback) {
        return {
            ...state,
            timeControl: fallback.preset ?? state.timeControl ?? null,
            whiteTimeMs: fallback.whiteRemainingMs,
            blackTimeMs: fallback.blackRemainingMs
        };
    }
    return {
        ...state,
        timeControl: state.timeControl ?? null,
        whiteTimeMs: state.whiteTimeMs ?? null,
        blackTimeMs: state.blackTimeMs ?? null
    };
};
const persistGameSnapshot = async (gameId, snapshot) => {
    const cubeData = snapshot.cube;
    const cubeOwnerEnum = cubeData ? colorToPlayerEnum(cubeData.owner) : null;
    const cubeOfferedBy = cubeData?.doubleOfferedBy ?? null;
    const timerSnapshot = turnTimerService_1.TurnTimerService.getSnapshot(Number(gameId));
    const timers = timerSnapshot
        ? {
            active: timerSnapshot.paused ? null : timerSnapshot.active,
            whiteTimeMs: timerSnapshot.whiteRemainingMs,
            blackTimeMs: timerSnapshot.blackRemainingMs,
            paused: timerSnapshot.paused,
            updatedAt: new Date().toISOString()
        }
        : snapshot.crawford || typeof snapshot.matchLength !== 'undefined'
            ? snapshot.crawford && snapshot.crawford.matchLength !== undefined
                ? undefined
                : undefined
            : undefined;
    const meta = snapshot.crawford || typeof snapshot.matchLength !== 'undefined' || timers
        ? {
            matchLength: typeof snapshot.matchLength !== 'undefined' ? snapshot.matchLength : null,
            crawford: snapshot.crawford ?? (0, matchEngine_1.defaultCrawfordState)(),
            ...(timers ? { timers } : {})
        }
        : undefined;
    await prisma_1.prisma.games.update({
        where: { id: gameId },
        data: {
            boardState: serializeSnapshot({
                board: snapshot.board,
                dice: snapshot.dice,
                ...(meta ? { meta } : {})
            }),
            dice: [...snapshot.dice.dice],
            currentPlayer: snapshot.currentPlayer === 'white' ? 'WHITE' : 'BLACK',
            ...(snapshot.status
                ? { status: snapshot.status.toUpperCase() }
                : {}),
            ...(cubeData
                ? {
                    cubeLevel: cubeData.level,
                    cubeOwner: cubeOwnerEnum,
                    doublePending: cubeData.doublePending,
                    doubleOfferedBy: cubeOfferedBy,
                    cubeHistory: serializeCubeHistory(cubeData.history)
                }
                : {})
        }
    });
};
class GameService {
    static async createGame(input) {
        const { userId, mode, stake, opponentId } = input;
        const creator = await prisma_1.prisma.users.findUnique({
            where: { id: userId }
        });
        if (!creator) {
            throw new errors_1.AppError('User not found', 404);
        }
        const initialBoard = gameEngine_1.BackgammonEngine.createInitialBoard();
        const initialDice = gameEngine_1.BackgammonEngine.rollDice();
        const defaultTimeControl = config_1.config.timeControl;
        // Create the game in DB
        const newGame = await prisma_1.prisma.games.create({
            data: {
                id: crypto.randomUUID(),
                whitePlayerId: userId,
                blackPlayerId: mode === 'PLAYER_VS_PLAYER' ? (opponentId || null) : null,
                gameMode: mode,
                stake,
                status: 'WAITING',
                currentPlayer: 'WHITE',
                boardState: serializeSnapshot({ board: initialBoard, dice: initialDice }),
                dice: [...initialDice.dice],
                timeControlPreset: defaultTimeControl.preset,
                timeControlTotalMs: defaultTimeControl.totalTimeMs,
                timeControlIncrementMs: defaultTimeControl.incrementMs,
                timeControlDelayMs: defaultTimeControl.delayMs,
                whiteTimeRemainingMs: defaultTimeControl.totalTimeMs,
                blackTimeRemainingMs: defaultTimeControl.totalTimeMs,
                cubeLevel: 1,
                cubeOwner: null,
                doublePending: false,
                doubleOfferedBy: null,
                cubeHistory: []
            }
        });
        if (mode === 'AI_VS_PLAYER') {
            await prisma_1.prisma.games.update({
                where: { id: newGame.id },
                data: { status: 'PLAYING' }
            });
            newGame.status = 'PLAYING';
        }
        try {
            turnTimerService_1.TurnTimerService.configure(Number(newGame.id) || 0, defaultTimeControl.preset, {
                totalTimeMs: defaultTimeControl.totalTimeMs,
                incrementMs: defaultTimeControl.incrementMs,
                delayMs: defaultTimeControl.delayMs
            });
        }
        catch (e) {
            // Ignore timer errors
        }
        const fullPlayer1 = toGamePlayer(creator);
        const fullPlayer2 = mode === 'AI_VS_PLAYER' ? AI_PLAYER : null;
        (0, gameEventEmitter_1.emitGameEvent)(newGame.id, 'join', { gameId: newGame.id, userId }, userId);
        return {
            id: newGame.id,
            player1: fullPlayer1,
            player2: fullPlayer2,
            status: newGame.status.toLowerCase(),
            gameType: 'match',
            stake,
            winner: null,
            timeControl: defaultTimeControl.preset,
            whiteTimeMs: defaultTimeControl.totalTimeMs,
            blackTimeMs: defaultTimeControl.totalTimeMs,
            matchLength: newGame.matchLength ?? null,
            crawford: (0, matchEngine_1.defaultCrawfordState)(),
            cube: defaultCubeSnapshot(),
            board: initialBoard,
            currentPlayer: 'white',
            dice: initialDice,
            availableMoves: gameEngine_1.BackgammonEngine.calculateAvailableMoves('white', initialBoard, initialDice),
            createdAt: newGame.createdAt,
            startedAt: newGame.createdAt, // Fallback to createdAt
            finishedAt: newGame.finishedAt,
            drawOfferBy: null,
            whiteScore: 0,
            blackScore: 0
        };
    }
    static async getGame(id) {
        const gameId = String(id);
        const game = await prisma_1.prisma.games.findUnique({
            where: { id: gameId },
            include: {
                whitePlayer: true,
                blackPlayer: true,
                match: true
            }
        });
        if (!game)
            return null;
        const snapshot = deserializeSnapshot(game.boardState);
        const matchRecord = buildMatchRecord(game.match ?? null);
        const rules = matchRecord?.rules ?? DEFAULT_MATCH_RULES;
        const resolvedMatchLength = snapshot.meta?.matchLength ?? game.matchLength ?? matchRecord?.length ?? null;
        const crawfordState = buildCrawfordState(game, matchRecord, rules, snapshot.meta);
        const diceFromColumn = Array.isArray(game.dice) && game.dice.length === 2
            ? game.dice.map(value => (typeof value === 'number' ? value : 0))
            : snapshot.dice.dice;
        const mergedDice = {
            ...snapshot.dice,
            dice: diceFromColumn
        };
        const currentPlayer = (game.currentPlayer ?? 'WHITE').toLowerCase();
        const availableMoves = gameEngine_1.BackgammonEngine.calculateAvailableMoves(currentPlayer, snapshot.board, mergedDice);
        const player1 = toGamePlayer(game.whitePlayer);
        let player2 = game.blackPlayer ? toGamePlayer(game.blackPlayer) : null;
        if (!player2 && game.gameMode === 'AI_VS_PLAYER') {
            player2 = AI_PLAYER;
        }
        const state = {
            id: game.id,
            player1,
            player2,
            status: game.status.toLowerCase(),
            gameType: 'match',
            stake: game.stake,
            winner: game.winner === 'WHITE' ? player1 : (game.winner === 'BLACK' ? player2 : null),
            timeControl: game.timeControlPreset ?? null,
            whiteTimeMs: game.whiteTimeRemainingMs,
            blackTimeMs: game.blackTimeRemainingMs,
            matchLength: resolvedMatchLength,
            crawford: crawfordState,
            cube: buildCubeSnapshot(game),
            board: snapshot.board,
            currentPlayer,
            dice: mergedDice,
            availableMoves,
            createdAt: game.createdAt,
            startedAt: game.createdAt, // Fallback
            finishedAt: game.finishedAt,
            drawOfferBy: null,
            whiteScore: game.whiteScore,
            blackScore: game.blackScore
        };
        return applyTimerSnapshot(game.id, state);
    }
    static async getGameSummary(id) {
        const game = await this.getGame(id);
        if (!game)
            return null;
        return {
            id: game.id,
            status: game.status,
            currentPlayer: game.currentPlayer,
            cube: game.cube,
            crawford: game.crawford,
            matchLength: game.matchLength,
            whiteScore: game.whiteScore,
            blackScore: game.blackScore,
            gameType: game.gameType,
            stake: game.stake,
            createdAt: game.createdAt,
            whitePlayerId: game.player1.id,
            blackPlayerId: game.player2?.id ?? null
        };
    }
    static async rollDice(gameId, userId) {
        const game = await this.getGame(gameId);
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        const isWhite = game.player1.id === userId;
        if (!isWhite && game.player2?.id !== userId)
            throw new errors_1.AppError('Not a player in this game', 403);
        const playerColor = isWhite ? 'white' : 'black';
        if (game.currentPlayer !== playerColor)
            throw new errors_1.AppError('Not your turn', 403);
        if (game.dice.remaining.length > 0 && !game.dice.used.every(u => u)) {
            return game;
        }
        const newDice = gameEngine_1.BackgammonEngine.rollDice();
        await persistGameSnapshot(gameId, {
            board: game.board,
            dice: newDice,
            currentPlayer: game.currentPlayer,
            status: game.status,
            cube: game.cube,
            crawford: game.crawford,
            matchLength: game.matchLength
        });
        // Notify connected clients that dice have been rolled
        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'roll', {
            board: game.board,
            dice: newDice,
            currentPlayer: game.currentPlayer
        }, userId);
        return this.getGame(gameId);
    }
    static async makeMove(gameId, userId, moveRequest) {
        let game = await this.getGame(gameId);
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        if (game.status !== 'playing')
            throw new errors_1.AppError('Game is not playing', 400);
        const isWhite = game.player1.id === userId;
        const playerColor = isWhite ? 'white' : 'black';
        if (game.currentPlayer !== playerColor) {
            throw new errors_1.AppError('Not your turn', 403);
        }
        const move = {
            from: moveRequest.from,
            to: moveRequest.to,
            player: playerColor,
            diceUsed: moveRequest.diceUsed
        };
        // Strict validation against calculated available moves
        const legalMoves = gameEngine_1.BackgammonEngine.calculateAvailableMoves(playerColor, game.board, game.dice);
        const isAvailable = legalMoves.some(m => m.from === move.from &&
            m.to === move.to &&
            m.diceUsed === move.diceUsed);
        if (!isAvailable) {
            throw new errors_1.AppError('Requested move is not among the available moves', 400);
        }
        const validation = gameEngine_1.BackgammonEngine.validateMove(move, game.board, game.dice);
        if (!validation.valid) {
            throw new errors_1.AppError(validation.error || 'Invalid move', 400);
        }
        const newBoard = gameEngine_1.BackgammonEngine.applyMove(move, game.board);
        const newDice = gameEngine_1.BackgammonEngine.useDie(move.diceUsed, game.dice);
        const winnerColor = gameEngine_1.BackgammonEngine.checkWinCondition(newBoard);
        let winner = null;
        let status = game.status;
        let finishedAt = null;
        if (winnerColor) {
            winner = winnerColor === 'white' ? 'WHITE' : 'BLACK';
            status = 'completed';
            finishedAt = new Date();
        }
        const availableMoves = gameEngine_1.BackgammonEngine.calculateAvailableMoves(playerColor, newBoard, newDice);
        let nextPlayer = playerColor;
        let nextDice = newDice;
        if (!winner && availableMoves.length === 0) {
            nextPlayer = switchPlayer(playerColor);
            nextDice = gameEngine_1.BackgammonEngine.rollDice();
        }
        await persistGameSnapshot(gameId, {
            board: newBoard,
            dice: nextDice,
            currentPlayer: nextPlayer,
            status: status,
            cube: game.cube,
            crawford: game.crawford,
            matchLength: game.matchLength
        });
        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'move', {
            from: move.from,
            to: move.to,
            diceUsed: move.diceUsed,
            player: move.player,
            board: newBoard,
            dice: nextDice,
            currentPlayer: nextPlayer,
            winner: winner
        }, userId);
        if (winner) {
            await prisma_1.prisma.games.update({
                where: { id: gameId },
                data: {
                    winner,
                    status: 'COMPLETED',
                    finishedAt
                }
            });
        }
        const updatedGame = await this.getGame(gameId);
        if (!updatedGame)
            throw new errors_1.AppError('Game lost after update', 500);
        game = updatedGame;
        if (winner)
            return game;
        // AI Turn Handling
        if (game.player2?.id === 'ai-gnubg' && game.currentPlayer === 'black' && game.status === 'playing') {
            try {
                let aiTurnOver = false;
                let safety = 0;
                while (!aiTurnOver && safety < 10) {
                    safety++;
                    const aiMoveSuggestion = await aiService_1.AIService.getBestMove({
                        boardState: game.board,
                        dice: game.dice,
                        userId: userId,
                        gameId: gameId
                    });
                    if (aiMoveSuggestion && aiMoveSuggestion.move) {
                        const aiMove = aiMoveSuggestion.move;
                        const aiBoard = gameEngine_1.BackgammonEngine.applyMove(aiMove, game.board);
                        const aiDice = gameEngine_1.BackgammonEngine.useDie(aiMove.diceUsed, game.dice);
                        const aiWinnerColor = gameEngine_1.BackgammonEngine.checkWinCondition(aiBoard);
                        let aiWinner = null;
                        let aiStatus = game.status;
                        let aiFinishedAt = null;
                        if (aiWinnerColor) {
                            aiWinner = aiWinnerColor === 'white' ? 'WHITE' : 'BLACK';
                            aiStatus = 'completed';
                            aiFinishedAt = new Date();
                        }
                        const aiAvailableMoves = gameEngine_1.BackgammonEngine.calculateAvailableMoves('black', aiBoard, aiDice);
                        let aiNextPlayer = 'black';
                        let aiNextDice = aiDice;
                        if (!aiWinner && aiAvailableMoves.length === 0) {
                            aiNextPlayer = 'white';
                            aiNextDice = gameEngine_1.BackgammonEngine.rollDice();
                            aiTurnOver = true;
                        }
                        await persistGameSnapshot(gameId, {
                            board: aiBoard,
                            dice: aiNextDice,
                            currentPlayer: aiNextPlayer,
                            status: aiStatus,
                            cube: game.cube,
                            crawford: game.crawford,
                            matchLength: game.matchLength
                        });
                        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'move', {
                            from: aiMove.from,
                            to: aiMove.to,
                            diceUsed: aiMove.diceUsed,
                            player: 'black',
                            board: aiBoard,
                            dice: aiNextDice,
                            currentPlayer: aiNextPlayer,
                            winner: aiWinner
                        }, 'ai-gnubg');
                        if (aiWinner) {
                            await prisma_1.prisma.games.update({
                                where: { id: gameId },
                                data: {
                                    winner: aiWinner,
                                    status: 'COMPLETED',
                                    finishedAt: aiFinishedAt
                                }
                            });
                            aiTurnOver = true;
                        }
                        const aiUpdatedGame = await this.getGame(gameId);
                        if (!aiUpdatedGame)
                            break;
                        game = aiUpdatedGame;
                        if (aiWinner)
                            break;
                    }
                    else {
                        aiTurnOver = true;
                    }
                }
            }
            catch (error) {
                logger.error('AI Move failed', error);
            }
        }
        return game;
    }
    static async listAvailableGames() {
        const games = await prisma_1.prisma.games.findMany({
            where: {
                status: 'WAITING',
                blackPlayerId: null
            },
            orderBy: { createdAt: 'desc' }
        });
        return games.map(game => ({
            id: game.id,
            status: game.status.toLowerCase(),
            currentPlayer: (game.currentPlayer ?? 'WHITE').toLowerCase(),
            cube: buildCubeSnapshot(game),
            crawford: buildCrawfordState(game, null, DEFAULT_MATCH_RULES), // Simplified for list
            matchLength: game.matchLength,
            whiteScore: game.whiteScore,
            blackScore: game.blackScore,
            gameType: 'match',
            stake: game.stake,
            createdAt: game.createdAt,
            whitePlayerId: game.whitePlayerId,
            blackPlayerId: game.blackPlayerId
        }));
    }
    static async joinGame(gameId, userId) {
        const game = await prisma_1.prisma.games.findUnique({ where: { id: gameId } });
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        if (game.status !== 'WAITING')
            throw new errors_1.AppError('Game is not available', 400);
        if (game.whitePlayerId === userId)
            throw new errors_1.AppError('Cannot join your own game', 400);
        const updatedGame = await prisma_1.prisma.games.update({
            where: { id: gameId },
            data: {
                blackPlayerId: userId,
                status: 'PLAYING',
            },
            include: {
                whitePlayer: true,
                blackPlayer: true,
                match: true
            }
        });
        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'join', { gameId, userId }, userId);
        return this.getGame(gameId);
    }
    static async listUserGames(userId) {
        const games = await prisma_1.prisma.games.findMany({
            where: {
                OR: [
                    { whitePlayerId: userId },
                    { blackPlayerId: userId }
                ]
            },
            orderBy: { updatedAt: 'desc' }
        });
        return games.map(game => ({
            id: game.id,
            status: game.status.toLowerCase(),
            currentPlayer: (game.currentPlayer ?? 'WHITE').toLowerCase(),
            cube: buildCubeSnapshot(game),
            crawford: buildCrawfordState(game, null, DEFAULT_MATCH_RULES),
            matchLength: game.matchLength,
            whiteScore: game.whiteScore,
            blackScore: game.blackScore,
            gameType: 'match',
            stake: game.stake,
            createdAt: game.createdAt,
            whitePlayerId: game.whitePlayerId,
            blackPlayerId: game.blackPlayerId
        }));
    }
    static async getAvailableMoves(gameId, userId) {
        const game = await this.getGame(gameId);
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        const isWhite = game.player1.id === userId;
        const playerColor = isWhite ? 'white' : 'black';
        if (game.currentPlayer !== playerColor)
            return [];
        return gameEngine_1.BackgammonEngine.calculateAvailableMoves(playerColor, game.board, game.dice);
    }
    static async getPipCount(gameId) {
        const game = await this.getGame(gameId);
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        return gameEngine_1.BackgammonEngine.calculatePipCount(game.board);
    }
    static async resignGame(gameId, userId) {
        const game = await this.getGame(gameId);
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        const isWhite = game.player1.id === userId;
        const winnerColor = isWhite ? 'black' : 'white';
        const winner = winnerColor === 'white' ? game.player1 : game.player2;
        if (!winner)
            throw new errors_1.AppError('Opponent not found', 400);
        await prisma_1.prisma.games.update({
            where: { id: gameId },
            data: {
                status: 'COMPLETED',
                winner: winnerColor === 'white' ? 'WHITE' : 'BLACK',
                finishedAt: new Date()
            }
        });
        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'resign', { userId, winner: winnerColor }, userId);
        return this.getGame(gameId);
    }
    static async offerDouble(gameId, userId) {
        const game = await prisma_1.prisma.games.findUnique({
            where: { id: gameId },
            include: { match: true }
        });
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        const isWhite = game.whitePlayerId === userId;
        const playerColor = isWhite ? 'white' : 'black';
        if ((game.currentPlayer === 'WHITE' ? 'white' : 'black') !== playerColor) {
            throw new errors_1.AppError('Not your turn', 403);
        }
        const matchRecord = buildMatchRecord(game.match);
        const rules = matchRecord?.rules ?? DEFAULT_MATCH_RULES;
        const cubeSnapshot = buildCubeSnapshot(game);
        const context = {
            currentPlayer: playerColor,
            cube: cubeSnapshot,
            matchLength: game.matchLength,
            whiteScore: game.whiteScore,
            blackScore: game.blackScore,
            rules,
            doublePending: Boolean(game.doublePending),
            doubleOfferedBy: game.doubleOfferedBy === 'white' || game.doubleOfferedBy === 'black' ? game.doubleOfferedBy : null,
            match: matchRecord,
            game: game
        };
        if (!(0, cubeLogic_1.canDouble)(context)) {
            throw new errors_1.AppError('Cannot double at this time', 400);
        }
        const result = (0, cubeLogic_1.applyCubeAction)(context, 'double');
        await persistGameSnapshot(gameId, {
            board: deserializeSnapshot(game.boardState).board,
            dice: deserializeSnapshot(game.boardState).dice, // Should use game.dice column?
            currentPlayer: game.currentPlayer === 'WHITE' ? 'white' : 'black',
            status: game.status,
            cube: {
                level: result.cube.level,
                owner: result.cube.owner,
                doublePending: result.doublePending,
                doubleOfferedBy: result.doubleOfferedBy,
                history: [...cubeSnapshot.history, result.historyEntry]
            },
            crawford: buildCrawfordState(game, matchRecord, rules),
            matchLength: game.matchLength
        });
        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'cube', {
            action: 'double',
            cube: {
                level: result.cube.level,
                owner: result.cube.owner,
                isCentered: result.cube.isCentered,
                doublePending: result.doublePending,
                doubleOfferedBy: result.doubleOfferedBy,
                history: [...cubeSnapshot.history, result.historyEntry]
            }
        }, userId);
        return this.getGame(gameId);
    }
    static async respondToDouble(gameId, userId, accept, beaver = false, raccoon = false) {
        const game = await prisma_1.prisma.games.findUnique({
            where: { id: gameId },
            include: { match: true }
        });
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        if (!game.doublePending) {
            throw new errors_1.AppError('No double pending', 400);
        }
        const isWhite = game.whitePlayerId === userId;
        const playerColor = isWhite ? 'white' : 'black';
        // The player responding must be the one who didn't offer the double
        // The player responding must be the one who didn't offer the double
        const doubleOfferedBy = playerEnumToColor(game.doubleOfferedBy);
        if (doubleOfferedBy === playerColor) {
            throw new errors_1.AppError('Cannot respond to your own double', 403);
        }
        const matchRecord = buildMatchRecord(game.match);
        const rules = matchRecord?.rules ?? DEFAULT_MATCH_RULES;
        const cubeSnapshot = buildCubeSnapshot(game);
        const context = {
            currentPlayer: playerColor,
            cube: cubeSnapshot,
            matchLength: game.matchLength,
            whiteScore: game.whiteScore,
            blackScore: game.blackScore,
            rules,
            doublePending: Boolean(game.doublePending),
            doubleOfferedBy: doubleOfferedBy,
            match: matchRecord,
            game: game
        };
        let action = accept ? 'take' : 'pass';
        if (accept) {
            if (beaver) {
                if (!rules.beaver)
                    throw new errors_1.AppError('Beaver rule is not enabled', 400);
                action = 'beaver';
            }
            else if (raccoon) {
                if (!rules.raccoon)
                    throw new errors_1.AppError('Raccoon rule is not enabled', 400);
                // Raccoon is only valid if we are responding to a Beaver.
                // The cube logic 'handleImmediateRedouble' checks if the previous action was a beaver 
                // by checking ownership or history, but here we just pass the intent.
                // However, 'handleImmediateRedouble' for raccoon checks:
                // "Raccoon only available immediately after a beaver" -> context.cube.owner !== doubleOfferedBy
                // We rely on cubeLogic to validate the state.
                action = 'raccoon';
            }
        }
        const result = (0, cubeLogic_1.applyCubeAction)(context, action);
        let status = game.status.toLowerCase();
        let winner = null;
        let finishedAt = null;
        if (action === 'pass') {
            // Game over
            const winningColor = playerColor === 'white' ? 'black' : 'white';
            winner = winningColor === 'white' ? 'WHITE' : 'BLACK';
            status = 'completed';
            finishedAt = new Date();
        }
        await persistGameSnapshot(gameId, {
            board: deserializeSnapshot(game.boardState).board,
            dice: deserializeSnapshot(game.boardState).dice,
            currentPlayer: game.currentPlayer === 'WHITE' ? 'white' : 'black',
            status: status,
            cube: {
                level: result.cube.level,
                owner: result.cube.owner,
                doublePending: result.doublePending,
                doubleOfferedBy: result.doubleOfferedBy,
                history: [...cubeSnapshot.history, result.historyEntry]
            },
            crawford: buildCrawfordState(game, matchRecord, rules),
            matchLength: game.matchLength
        });
        if (winner) {
            await prisma_1.prisma.games.update({
                where: { id: gameId },
                data: {
                    winner,
                    status: 'COMPLETED',
                    finishedAt
                }
            });
        }
        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'cube', {
            action,
            cube: {
                level: result.cube.level,
                owner: result.cube.owner,
                isCentered: result.cube.isCentered,
                doublePending: result.doublePending,
                doubleOfferedBy: result.doubleOfferedBy,
                history: [...cubeSnapshot.history, result.historyEntry]
            },
            winner: winner ? (winner === 'WHITE' ? 'white' : 'black') : undefined
        }, userId);
        return this.getGame(gameId);
    }
    static async offerDraw(gameId, userId) {
        // Simplified draw offer logic
        const game = await this.getGame(gameId);
        if (!game)
            throw new errors_1.AppError('Game not found', 404);
        // In a real implementation, we would store the draw offer in DB
        // For now, we'll just emit an event
        (0, gameEventEmitter_1.emitGameEvent)(gameId, 'draw', { userId }, userId);
        return true;
    }
}
exports.GameService = GameService;
//# sourceMappingURL=gameService.js.map