"use strict";
// src/types/game.ts
// Types pour les parties de backgammon
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_BOARD = void 0;
exports.createGame = createGame;
exports.createInitialGameState = createInitialGameState;
exports.startGame = startGame;
exports.finishGame = finishGame;
exports.isGameAvailable = isGameAvailable;
exports.getGameDuration = getGameDuration;
const matchEngine_1 = require("../services/rules/matchEngine");
// Initial board setup pour backgammon
exports.INITIAL_BOARD = {
    positions: [
        2, 0, 0, 0, 0, -5, // Positions 1-6
        0, -3, 0, 0, 0, 5, // Positions 7-12
        -5, 0, 0, 0, 3, 0, // Positions 13-18
        5, 0, 0, 0, 0, -2 // Positions 19-24
    ],
    whiteBar: 0,
    blackBar: 0,
    whiteOff: 0,
    blackOff: 0
};
// Fonction pour créer une nouvelle partie
function createGame(player1, gameType, stake) {
    return {
        id: crypto.randomUUID(),
        player1,
        player2: null, // En attente d'un adversaire
        status: 'waiting',
        gameType,
        stake,
        timeControl: null,
        whiteTimeMs: null,
        blackTimeMs: null,
        matchLength: null,
        crawford: (0, matchEngine_1.defaultCrawfordState)(),
        cube: {
            level: 1,
            owner: null,
            isCentered: true,
            doublePending: false,
            doubleOfferedBy: null,
            history: []
        },
        whiteScore: 0,
        blackScore: 0,
        winner: null,
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null
    };
}
// Fonction pour créer un état de jeu initial
function createInitialGameState(player1) {
    return {
        ...createGame(player1, 'match', 100),
        whiteScore: 0,
        blackScore: 0,
        timeControl: null,
        whiteTimeMs: null,
        blackTimeMs: null,
        matchLength: null,
        crawford: (0, matchEngine_1.defaultCrawfordState)(),
        cube: {
            level: 1,
            owner: null,
            isCentered: true,
            doublePending: false,
            doubleOfferedBy: null,
            history: []
        },
        drawOfferBy: null,
        board: exports.INITIAL_BOARD,
        currentPlayer: 'white',
        dice: {
            dice: [1, 1],
            used: [false, false],
            doubles: false,
            remaining: [1, 1]
        },
        availableMoves: []
    };
}
// Fonction pour démarrer une partie
function startGame(game, player2) {
    return {
        ...game,
        player2,
        status: 'playing',
        timeControl: game.timeControl ?? null,
        startedAt: new Date()
    };
}
// Fonction pour terminer une partie
function finishGame(game, winner) {
    return {
        ...game,
        status: 'completed',
        winner,
        finishedAt: new Date()
    };
}
// Fonction pour vérifier si une partie est disponible
function isGameAvailable(game) {
    return game.status === 'waiting' && game.player2 === null;
}
// Fonction pour calculer la durée d'une partie
function getGameDuration(game) {
    if (!game.startedAt || !game.finishedAt) {
        return null;
    }
    return game.finishedAt.getTime() - game.startedAt.getTime();
}
//# sourceMappingURL=game.js.map