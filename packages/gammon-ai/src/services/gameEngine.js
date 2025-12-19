"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgammonEngine = void 0;
// src/services/gameEngine.ts
// @ts-nocheck - Désactiver les vérifications strictes pour le moteur de jeu
const game_1 = require("../types/game");
class BackgammonEngine {
    // Créer un board initial
    static createInitialBoard() {
        return {
            positions: [...game_1.INITIAL_BOARD.positions],
            whiteBar: game_1.INITIAL_BOARD.whiteBar,
            blackBar: game_1.INITIAL_BOARD.blackBar,
            whiteOff: game_1.INITIAL_BOARD.whiteOff,
            blackOff: game_1.INITIAL_BOARD.blackOff
        };
    }
    // Lancer les dés
    static rollDice() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const doubles = die1 === die2;
        return {
            dice: [die1, die2],
            used: [false, false],
            doubles,
            remaining: doubles ? [die1, die1, die2, die2] : [die1, die2]
        };
    }
    // Valider un mouvement
    static validateMove(move, board, dice) {
        if (!dice.remaining.includes(move.diceUsed)) {
            return {
                valid: false,
                error: `Die value ${move.diceUsed} is not available`
            };
        }
        const mustEnterFromBar = this.playerHasPiecesOnBar(board, move.player);
        if (mustEnterFromBar && move.from !== 24) {
            return {
                valid: false,
                error: 'You must enter all checkers from the bar before moving others'
            };
        }
        const playableDice = this.getPlayableDice(board, dice, move.player, mustEnterFromBar);
        if (playableDice.length === 0) {
            return { valid: false, error: 'No legal moves available for current dice' };
        }
        const highestPlayable = Math.max(...playableDice);
        if (highestPlayable > move.diceUsed) {
            return {
                valid: false,
                error: `Must use the highest available die (${highestPlayable})`
            };
        }
        if (!playableDice.includes(move.diceUsed)) {
            return {
                valid: false,
                error: `Die value ${move.diceUsed} cannot be used for any legal move`
            };
        }
        if (move.from === 24) {
            return this.validateFromBar(move, board, dice);
        }
        if (move.to === 25) {
            return this.validateBearingOff(move, board, dice);
        }
        return this.validateNormalMove(move, board, dice);
    }
    // Valider mouvement depuis le bar
    static validateFromBar(move, board, _dice) {
        const playerBar = move.player === 'white' ? board.whiteBar : board.blackBar;
        if (playerBar === 0) {
            return {
                valid: false,
                error: 'No pieces on bar to move'
            };
        }
        const targetIndex = this.entryPointFromBar(move.player, move.diceUsed);
        if (targetIndex === null) {
            return {
                valid: false,
                error: 'Die does not correspond to a valid entry point from the bar'
            };
        }
        if (move.to !== targetIndex) {
            return {
                valid: false,
                error: 'Must enter on the point indicated by the die value'
            };
        }
        const targetPosition = board.positions[targetIndex];
        const canLand = this.canLandOn(targetPosition, move.player);
        if (!canLand) {
            return {
                valid: false,
                error: 'Cannot land on this position'
            };
        }
        return { valid: true };
    }
    // Valider bearing off (sortie de pièces)
    static validateBearingOff(move, board, _dice) {
        if (!this.allPiecesInHome(move.player, board)) {
            return {
                valid: false,
                error: 'Cannot bear off until all pieces are in home board'
            };
        }
        if (move.from < 0 || move.from > 23) {
            return {
                valid: false,
                error: 'Invalid starting position for bearing off'
            };
        }
        const piecesAtPosition = move.player === 'white'
            ? board.positions[move.from]
            : -board.positions[move.from];
        if (piecesAtPosition === 0) {
            return {
                valid: false,
                error: 'No piece at this position'
            };
        }
        const direction = move.player === 'white' ? 1 : -1;
        const target = move.from + move.diceUsed * direction;
        if (move.player === 'white') {
            if (target < 24 && target !== 24) {
                return { valid: false, error: 'Die value does not bear off this checker' };
            }
            if (target > 24 && this.hasPiecesBehindInHome(move.player, board, move.from)) {
                return {
                    valid: false,
                    error: 'Cannot bear off with a higher die while pieces remain behind'
                };
            }
        }
        else {
            if (target > -1 && target !== -1) {
                return { valid: false, error: 'Die value does not bear off this checker' };
            }
            if (target < -1 && this.hasPiecesBehindInHome(move.player, board, move.from)) {
                return {
                    valid: false,
                    error: 'Cannot bear off with a higher die while pieces remain behind'
                };
            }
        }
        return { valid: true };
    }
    // Valider mouvement normal
    static validateNormalMove(move, board, _dice) {
        if (move.from < 0 || move.from > 23 || move.to < 0 || move.to > 23) {
            return {
                valid: false,
                error: 'Invalid board positions'
            };
        }
        // Vérifier que la pièce existe à la position de départ
        const piecesAtFrom = move.player === 'white'
            ? board.positions[move.from]
            : -board.positions[move.from];
        if (piecesAtFrom === 0) {
            return {
                valid: false,
                error: 'No piece at starting position'
            };
        }
        // Vérifier la direction du mouvement
        const direction = move.player === 'white' ? 1 : -1;
        const actualMove = (move.to - move.from) * direction;
        if (actualMove !== move.diceUsed) {
            return {
                valid: false,
                error: `Move distance ${actualMove} does not match die value ${move.diceUsed}`
            };
        }
        // Vérifier qu'on peut atterrir sur la destination
        const targetPosition = board.positions[move.to];
        const canLand = this.canLandOn(targetPosition, move.player);
        if (!canLand) {
            return {
                valid: false,
                error: 'Cannot land on this position'
            };
        }
        return { valid: true };
    }
    // Vérifier si on peut atterrir sur une position
    static canLandOn(position, player) {
        if (player === 'white') {
            return position >= -1; // Peut atterrir sur vide, blanc, ou 1 noir (capture)
        }
        else {
            return position <= 1; // Peut atterrir sur vide, noir, ou 1 blanc (capture)
        }
    }
    // Vérifier si toutes les pièces sont dans la maison
    static allPiecesInHome(player, board) {
        const homeStart = player === 'white' ? 18 : 0;
        const homeEnd = player === 'white' ? 24 : 6;
        const playerBar = player === 'white' ? board.whiteBar : board.blackBar;
        if (playerBar > 0)
            return false;
        for (let i = 0; i < 24; i++) {
            if (i >= homeStart && i < homeEnd)
                continue; // Maison, c'est OK
            const pieces = board.positions[i];
            if (player === 'white' && pieces > 0)
                return false;
            if (player === 'black' && pieces < 0)
                return false;
        }
        return true;
    }
    // Appliquer un mouvement au board
    static applyMove(move, board) {
        const newBoard = {
            positions: [...board.positions],
            whiteBar: board.whiteBar,
            blackBar: board.blackBar,
            whiteOff: board.whiteOff,
            blackOff: board.blackOff
        };
        if (move.from === 24) {
            // Depuis le bar
            if (move.player === 'white') {
                newBoard.whiteBar--;
            }
            else {
                newBoard.blackBar--;
            }
        }
        else {
            // Mouvement normal
            if (move.player === 'white') {
                newBoard.positions[move.from]--;
            }
            else {
                newBoard.positions[move.from]++;
            }
        }
        if (move.to === 25) {
            // Bearing off
            if (move.player === 'white') {
                newBoard.whiteOff++;
            }
            else {
                newBoard.blackOff++;
            }
        }
        else {
            // Atterrir sur une position
            const targetPosition = newBoard.positions[move.to];
            // Capture si nécessaire
            if (move.player === 'white' && targetPosition === -1) {
                newBoard.positions[move.to] = 1;
                newBoard.blackBar++;
            }
            else if (move.player === 'black' && targetPosition === 1) {
                newBoard.positions[move.to] = -1;
                newBoard.whiteBar++;
            }
            else {
                // Mouvement normal
                newBoard.positions[move.to] += move.player === 'white' ? 1 : -1;
            }
        }
        return newBoard;
    }
    // Utiliser un dé
    static useDie(diceValue, dice) {
        const index = dice.remaining.indexOf(diceValue);
        if (index === -1)
            return dice;
        const newRemaining = [...dice.remaining];
        newRemaining.splice(index, 1);
        return {
            ...dice,
            remaining: newRemaining
        };
    }
    // Calculer tous les mouvements possibles
    static calculateAvailableMoves(player, board, dice) {
        const moves = [];
        const mustEnterFromBar = this.playerHasPiecesOnBar(board, player);
        const playableDice = this.getPlayableDice(board, dice, player, mustEnterFromBar);
        if (playableDice.length === 0) {
            return moves;
        }
        const direction = player === 'white' ? 1 : -1;
        const diceValues = dice.remaining.length ? dice.remaining : [...dice.dice];
        for (const dieValue of diceValues) {
            if (!playableDice.includes(dieValue)) {
                continue;
            }
            if (mustEnterFromBar) {
                const to = this.entryPointFromBar(player, dieValue);
                if (to !== null && this.canLandOn(board.positions[to], player)) {
                    moves.push({ from: 24, to, player, diceUsed: dieValue });
                }
                continue;
            }
            for (let from = 0; from < 24; from++) {
                if (!this.belongsToPlayer(board.positions[from], player)) {
                    continue;
                }
                const target = from + dieValue * direction;
                if (target >= 0 && target < 24) {
                    if (this.canLandOn(board.positions[target], player)) {
                        moves.push({ from, to: target, player, diceUsed: dieValue });
                    }
                    continue;
                }
                if (!this.allPiecesInHome(player, board)) {
                    continue;
                }
                const canBearOff = this.canBearOffFrom(player, board, from, dieValue);
                if (canBearOff) {
                    moves.push({ from, to: 25, player, diceUsed: dieValue });
                }
            }
        }
        return moves;
    }
    // Vérifier si le jeu est terminé
    static checkWinCondition(board) {
        if (board.whiteOff === 15)
            return 'white';
        if (board.blackOff === 15)
            return 'black';
        return null;
    }
    // Compter les points (pip count)
    static calculatePipCount(board) {
        let whitePip = 0;
        let blackPip = 0;
        // Points sur le board
        for (let i = 0; i < 24; i++) {
            if (board.positions[i] > 0) {
                whitePip += board.positions[i] * (24 - i);
            }
            else if (board.positions[i] < 0) {
                blackPip += Math.abs(board.positions[i]) * (i + 1);
            }
        }
        // Points sur le bar
        whitePip += board.whiteBar * 25;
        blackPip += board.blackBar * 25;
        return { white: whitePip, black: blackPip };
    }
    static getHomeRange(player) {
        return player === 'white'
            ? { start: 18, end: 24 }
            : { start: 0, end: 6 };
    }
    static entryPointFromBar(player, dieValue) {
        if (dieValue < 1 || dieValue > 6) {
            return null;
        }
        if (player === 'white') {
            return 24 - dieValue;
        }
        return dieValue - 1;
    }
    static belongsToPlayer(position, player) {
        if (player === 'white') {
            return position > 0;
        }
        return position < 0;
    }
    static hasPiecesBehindInHome(player, board, point) {
        const { start, end } = this.getHomeRange(player);
        if (player === 'white') {
            for (let i = start; i < point; i++) {
                if (board.positions[i] > 0) {
                    return true;
                }
            }
            return false;
        }
        for (let i = end - 1; i > point; i--) {
            if (board.positions[i] < 0) {
                return true;
            }
        }
        return false;
    }
    static playerHasPiecesOnBar(board, player) {
        return player === 'white' ? board.whiteBar > 0 : board.blackBar > 0;
    }
    static getPlayableDice(board, dice, player, mustEnterFromBar) {
        const uniqueDice = Array.from(new Set(dice.remaining.length ? dice.remaining : dice.dice));
        uniqueDice.sort((a, b) => b - a);
        const playable = [];
        for (const dieValue of uniqueDice) {
            if (this.hasLegalMoveForDie(board, player, dieValue, mustEnterFromBar)) {
                playable.push(dieValue);
            }
        }
        return playable;
    }
    static hasLegalMoveForDie(board, player, dieValue, mustEnterFromBar) {
        if (mustEnterFromBar) {
            const target = this.entryPointFromBar(player, dieValue);
            if (target === null) {
                return false;
            }
            return this.canLandOn(board.positions[target], player);
        }
        const direction = player === 'white' ? 1 : -1;
        for (let from = 0; from < 24; from++) {
            if (!this.belongsToPlayer(board.positions[from], player)) {
                continue;
            }
            const target = from + dieValue * direction;
            if (target >= 0 && target < 24) {
                if (this.canLandOn(board.positions[target], player)) {
                    return true;
                }
                continue;
            }
            if (!this.allPiecesInHome(player, board)) {
                continue;
            }
            if (this.canBearOffFrom(player, board, from, dieValue)) {
                return true;
            }
        }
        return false;
    }
    static canBearOffFrom(player, board, from, dieValue) {
        if (!this.allPiecesInHome(player, board)) {
            return false;
        }
        const direction = player === 'white' ? 1 : -1;
        const target = from + dieValue * direction;
        if (player === 'white') {
            if (target === 24) {
                return true;
            }
            if (target > 24) {
                return !this.hasPiecesBehindInHome(player, board, from);
            }
            return false;
        }
        if (target === -1) {
            return true;
        }
        if (target < -1) {
            return !this.hasPiecesBehindInHome(player, board, from);
        }
        return false;
    }
}
exports.BackgammonEngine = BackgammonEngine;
//# sourceMappingURL=gameEngine.js.map